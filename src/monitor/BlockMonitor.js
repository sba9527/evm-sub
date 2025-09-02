const { Web3 } = require('web3');
const logger = require('../utils/logger');

class BlockMonitor {
  constructor(config) {
    this.config = config;
    this.web3 = null;
    this.isRunning = false;
    this.subscription = null;
    this.currentBlockHeight = 0;
    this.intervalId = null;
    this.rpcUrl = null;
  }

  async init() {
    try {
      // 优先使用WebSocket，否则使用HTTP
      this.rpcUrl = this.config.internal_rpc_ws || this.config.rpc_ws || 
                    this.config.internal_rpc_http || this.config.rpc_http;
      
      if (!this.rpcUrl) {
        throw new Error(`配置 ${this.config.chain} 缺少RPC连接地址`);
      }

      this.web3 = new Web3(this.rpcUrl);
      
      // 测试连接
      await this.web3.eth.getBlockNumber();
      logger.info(`${this.config.chain} 区块链连接成功: ${this.rpcUrl}`);
      
    } catch (error) {
      logger.error(`${this.config.chain} 初始化失败:`, error);
      throw error;
    }
  }

  // 开始监听
  async start() {
    if (this.isRunning) {
      logger.warn(`${this.config.chain} 监听器已在运行中`);
      return;
    }

    try {
      this.isRunning = true;
      
      // 获取当前区块高度
      const blockNumber = await this.web3.eth.getBlockNumber();
      this.currentBlockHeight = Number(blockNumber);
      logger.info(`${this.config.chain} 开始监听，当前区块高度: ${this.currentBlockHeight}`);

      // 判断是否支持WebSocket订阅
      const rpcUrl = this.config.internal_rpc_ws || this.config.rpc_ws;

      if (rpcUrl && rpcUrl.startsWith('ws')) {
        await this.startWebSocketMonitoring();
      } else {
        await this.startPollingMonitoring();
      }
      
    } catch (error) {
      logger.error(`${this.config.chain} 启动监听失败:`, error);
      this.isRunning = false;
      throw error;
    }
  }

  // WebSocket监听模式
  async startWebSocketMonitoring() {
    try {
      // 监听新区块
      this.subscription = await this.web3.eth.subscribe('newBlockHeaders');
      
      this.subscription.on('data', async (blockHeader) => {
        await this.processBlock(blockHeader);
      });

      this.subscription.on('error', (error) => {
        logger.error(`${this.config.chain} WebSocket订阅错误:`, error);
        this.restart();
      });

      logger.info(`${this.config.chain} WebSocket监听模式启动成功`);
      
    } catch (error) {
      logger.error(`${this.config.chain} WebSocket监听启动失败:`, error);
      logger.info(`${this.config.chain} 降级到轮询模式`);
      // 降级到轮询模式
      await this.startPollingMonitoring();
    }
  }

  // 轮询监听模式
  async startPollingMonitoring() {
    const interval = this.config.interval || 3000; // 默认3秒
    
    this.intervalId = setInterval(async () => {
      try {
        const latestBlockNumber = await this.web3.eth.getBlockNumber();
        const latestBlockNum = Number(latestBlockNumber);
        
        if (latestBlockNum > this.currentBlockHeight) {
          // 处理新区块
          for (let i = this.currentBlockHeight + 1; i <= latestBlockNum; i++) {
            const block = await this.web3.eth.getBlock(i, this.config.full_tx === 1);
            await this.processBlock(block);
          }
        }
        
      } catch (error) {
        logger.error(`${this.config.chain} 轮询监听错误:`, error);
      }
    }, interval);

    logger.info(`${this.config.chain} 轮询监听模式启动成功，间隔: ${interval}ms`);
  }

  // 处理区块数据
  async processBlock(blockData) {
    try {
      let block = blockData;
      
      // 如果是区块头，需要获取完整区块信息
      if (!block.transactions) {
        block = await this.web3.eth.getBlock(blockData.number, this.config.full_tx === 1);
      }

      this.currentBlockHeight = Number(block.number);
      
      logger.info(`${this.config.chain} 处理区块 #${block.number}, 交易数: ${block.transactions.length}`);
      
      // 这里可以添加区块数据处理逻辑
      // 比如保存到数据库、发送到消息队列等
      await this.handleBlockData(block);
      
    } catch (error) {
      logger.error(`${this.config.chain} 处理区块失败:`, error);
    }
  }

  // 处理区块数据的具体逻辑
  async handleBlockData(block) {
    // 入参：区块数据对象，包含区块号、交易列表等信息
    // 出参：无返回值，将区块数据进行业务处理
    
    try {
      // 统计信息
      const stats = {
        totalTxs: block.transactions.length,
        ethTransfers: 0,
        tokenTransfers: 0,
        swaps: 0,
        contracts: 0,
        failed: 0
      };

      if (this.config.full_tx === 1 && block.transactions.length > 0) {
        logger.info(`${this.config.chain} 区块 #${block.number} 开始解析 ${block.transactions.length} 笔交易`);
        
        // 检查连接状态
        if (!this.isConnectionHealthy()) {
          logger.warn(`${this.config.chain} 连接不稳定，跳过区块 #${block.number} 的详细解析`);
          return;
        }

        // 并发处理交易，但限制并发数量以避免资源消耗过大
        const batchSize = 5; // 减少批次大小，提高稳定性
        const TxParser = require('./paser');
        let connectionErrors = 0;
        const maxConnectionErrors = 10; // 允许的最大连接错误数
        
        for (let i = 0; i < block.transactions.length; i += batchSize) {
          // 检查连接错误是否过多
          if (connectionErrors >= maxConnectionErrors) {
            logger.warn(`${this.config.chain} 连接错误过多，停止处理区块 #${block.number} 剩余交易`);
            stats.failed += block.transactions.length - i;
            break;
          }

          const batch = block.transactions.slice(i, i + batchSize);
          
          // 并发处理当前批次
          const promises = batch.map(async (tx) => {
            if (typeof tx === 'object' && tx.hash) {
              return await this.processTransaction(tx, stats);
            }
            return null;
          });
          
          const results = await Promise.allSettled(promises);
          
          // 统计连接错误
          results.forEach(result => {
            if (result.status === 'rejected' && this.isConnectionError(result.reason)) {
              connectionErrors++;
            }
          });
          
          // 每处理一批后稍微休息，避免RPC请求过于频繁
          if (i + batchSize < block.transactions.length) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 增加休息时间
          }
        }

        // 输出统计信息
        logger.info(`${this.config.chain} 区块 #${block.number} 解析完成: ` +
          `总交易=${stats.totalTxs}, ETH转账=${stats.ethTransfers}, ` +
          `代币转账=${stats.tokenTransfers}, Swap=${stats.swaps}, ` +
          `合约调用=${stats.contracts}, 失败=${stats.failed}`);
      }
      
      // 可以在这里添加区块数据保存逻辑
      await this.saveBlockData(block, stats);
      
    } catch (error) {
      logger.error(`${this.config.chain} 处理区块数据失败 #${block.number}:`, error);
    }
  }

  // 处理单笔交易
  async processTransaction(tx, stats) {
    const TxParser = require('./paser');
    
    try {
      // 创建交易解析器
      const parser = new TxParser(tx, this.web3, this.config.chain);
      
      // 解析交易
      await parser.parse();
      
      // 更新统计信息
      if (parser.isEthTransfer()) {
        stats.ethTransfers++;
      }
      
      if (parser.isTokenTransfer()) {
        stats.tokenTransfers++;
      }
      
      if (parser.isSwapTransaction()) {
        stats.swaps++;
      }
      
      if (tx.to === null) {
        stats.contracts++; // 合约创建
      }
      
      if (parser.status === 0) {
        stats.failed++;
      }

      // 获取解析摘要
      const summary = parser.getSummary();
      
      // 记录有意义的交易
      if (parser.transfers.length > 0 || parser.swaps.length > 0) {
        logger.debug(`${this.config.chain} 交易解析: ${summary.hash.slice(0, 10)}... ` +
          `转账=${summary.transfersCount}, Swap=${summary.swapsCount}, ` +
          `Gas=${summary.gasUsed}, 状态=${summary.status}`);
      }

      // 可以在这里保存解析后的交易数据
      await this.saveTransactionData(parser);
      
      return parser;
      
    } catch (error) {
      stats.failed++;
      
      // 区分连接错误和其他错误
      if (this.isConnectionError(error)) {
        logger.warn(`${this.config.chain} 交易解析连接错误 ${tx.hash.slice(0, 10)}...: ${error.message}`);
      } else {
        logger.error(`${this.config.chain} 处理交易失败 ${tx.hash}:`, error);
      }
      
      return null;
    }
  }

  // 保存区块数据
  async saveBlockData(block, stats) {
    // 入参：block - 区块数据, stats - 统计信息
    // 出参：无返回值
    
    try {
      const TransactionModel = require('../models/TransactionModel');
      
      const blockData = {
        chain: this.config.chain,
        number: Number(block.number),
        hash: block.hash,
        timestamp: Number(block.timestamp),
        parentHash: block.parentHash,
        txCount: stats.totalTxs,
        ethTransfers: stats.ethTransfers,
        tokenTransfers: stats.tokenTransfers,
        swaps: stats.swaps,
        gasUsed: Number(block.gasUsed || 0),
        gasLimit: Number(block.gasLimit || 0),
        size: Number(block.size || 0)
      };

      await TransactionModel.saveBlock(blockData);
      
    } catch (error) {
      logger.error(`${this.config.chain} 保存区块数据失败 #${block.number}:`, error);
    }
  }

  // 保存交易数据
  async saveTransactionData(parser) {
    // 入参：parser - 解析后的交易数据
    // 出参：无返回值
    
    try {
      const TransactionModel = require('../models/TransactionModel');
      
      // 1. 保存基础交易数据
      const txData = {
        chain: this.config.chain,
        hash: parser.hash,
        blockNumber: Number(parser.receipt?.blockNumber || 0),
        txIndex: parser.txIndex,
        from: parser.sender,
        to: parser.to,
        value: parser.value.toString(),
        gas: Number(parser.gas || 0),
        gasPrice: parser.gasPrice ? parser.gasPrice.toString() : '0',
        gasUsed: parser.gasUsed,
        status: parser.status,
        methodId: parser.methodId,
        inputData: '', // 可以根据需要存储input数据
        nonce: Number(parser.nonce || 0)
      };

      await TransactionModel.saveTransaction(txData);

      // 2. 保存转账记录
      if (parser.transfers.length > 0) {
        const transfers = parser.transfers.map(transfer => ({
          chain: this.config.chain,
          txHash: parser.hash,
          blockNumber: Number(parser.receipt?.blockNumber || 0),
          logIndex: transfer.logIndex,
          from: transfer.from,
          to: transfer.to,
          value: transfer.value.toString(),
          token: transfer.token,
          tokenAddress: transfer.tokenAddress,
          type: transfer.type || 'transfer'
        }));

        await TransactionModel.batchSaveTransfers(transfers);
      }

      // 3. 保存Swap记录
      if (parser.swaps.length > 0) {
        const swaps = parser.swaps.map(swap => ({
          chain: this.config.chain,
          txHash: parser.hash,
          blockNumber: Number(parser.receipt?.blockNumber || 0),
          logIndex: swap.logIndex,
          sender: swap.sender,
          to: swap.to,
          router: swap.router,
          pair: swap.pair,
          inToken: swap.inToken,
          outToken: swap.outToken,
          inAmount: swap.inAmount.toString(),
          outAmount: swap.outAmount.toString()
        }));

        await TransactionModel.batchSaveSwaps(swaps);
      }
      
    } catch (error) {
      logger.error(`${this.config.chain} 保存交易数据失败 ${parser.hash}:`, error);
    }
  }

  // 停止监听
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
      }

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      logger.info(`${this.config.chain} 监听器已停止`);
      
    } catch (error) {
      logger.error(`${this.config.chain} 停止监听失败:`, error);
    }
  }

  // 重启监听器
  async restart() {
    logger.info(`${this.config.chain} 正在重启监听器...`);
    await this.stop();
    setTimeout(() => {
      this.start();
    }, 5000); // 5秒后重启
  }

  // 检查连接是否健康
  isConnectionHealthy() {
    try {
      if (!this.web3 || !this.web3.currentProvider) {
        return false;
      }

      // 如果是WebSocket连接，检查连接状态
      if (this.web3.currentProvider.connection) {
        const connection = this.web3.currentProvider.connection;
        return connection.readyState === 1; // WebSocket.OPEN = 1
      }

      // 如果是HTTP连接，假设总是健康
      return true;
      
    } catch (error) {
      return false;
    }
  }

  // 检查是否为连接错误
  isConnectionError(error) {
    if (!error) return false;
    
    const connectionErrors = [
      'Connection not open',
      'CONNECTION ERROR',
      'WebSocket is not open',
      'Provider started to reconnect',
      'socket hang up',
      'ECONNRESET',
      'ENOTFOUND'
    ];
    
    return connectionErrors.some(errorType => 
      error.message?.includes(errorType) || 
      error.code === 503 || 
      error.name === 'ConnectionNotOpenError'
    );
  }

  // 获取状态信息
  getStatus() {
    return {
      chain: this.config.chain,
      chainId: this.config.chain_id,
      symbol: this.config.symbol,
      isRunning: this.isRunning,
      currentBlockHeight: this.currentBlockHeight,
      rpcUrl: this.rpcUrl,
      connectionHealthy: this.isConnectionHealthy()
    };
  }
}

module.exports = BlockMonitor; 