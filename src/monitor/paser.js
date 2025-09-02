
const { Web3 } = require('web3');
const logger = require('../utils/logger');

// ERC20 Transfer事件的Topic
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Uniswap V2 Swap事件的Topic  
const UNISWAP_V2_SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';

// 常见的DEX路由器地址和方法ID
const DEX_ROUTERS = {
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': 'Uniswap V2',
  '0xE592427A0AEce92De3Edee1F18E0157C05861564': 'Uniswap V3',
  '0x10ED43C718714eb63d5aA57B78B54704E256024E': 'PancakeSwap V2'
};

// DEX常见方法ID
const DEX_METHOD_IDS = {
  // Uniswap V2 / PancakeSwap V2 Router
  '0x38ed1739': 'swapExactTokensForTokens',
  '0x8803dbee': 'swapTokensForExactTokens', 
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0x4a25d94a': 'swapTokensForExactETH',
  '0x18cbafe5': 'swapExactTokensForETH',
  '0xfb3bdb41': 'swapETHForExactTokens',
  '0x18cbafe5': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
  '0xb6f9de95': 'swapExactETHForTokensSupportingFeeOnTransferTokens',
  '0x791ac947': 'swapExactTokensForETHSupportingFeeOnTransferTokens',
  
  // Uniswap V3 Router
  '0x414bf389': 'exactInputSingle',
  '0xc04b8d59': 'exactInput',
  '0xdb3e2198': 'exactOutputSingle',
  '0x09b81346': 'exactOutput',
  
  // 添加流动性
  '0xe8e33700': 'addLiquidity',
  '0xf305d719': 'addLiquidityETH',
  
  // 移除流动性  
  '0xbaa2abde': 'removeLiquidity',
  '0x02751cec': 'removeLiquidityETH'
};

//todo 需要处理所有的transaction 先获取TransactionReceipt
// 1处理普通转账 transfers 是个列表 字段有from to value token txIndex
// 2代币mint burn 也是在transfers里
// 3swaps outToken inToken   outAmount inAmount router  pair
// 4 chainLink eth bsc 报价
// 5 创建abi 数据库 注意 解析log的时候不要用abi 直接使用abi的topic匹配
class TxPaser {
    constructor(tx, web3Instance, chain) {
        this.web3 = web3Instance;
        this.chain = chain; // 1. 添加chain字段
        this.hash = tx.hash;
        this.sender = tx.from;
        this.to = tx.to;
        // 2. 添加容错机制处理input数据
        this.inputData = tx.input || '0x';
        this.methodId = this.extractMethodId(this.inputData);
        this.value = tx.value;
        this.txIndex = tx.transactionIndex;
        this.nonce = tx.nonce;
        this.gas = tx.gas;
        this.gasPrice = tx.gasPrice;
        this.gasUsed = 0; // 需要从receipt获取
        this.status = 0; // 需要从receipt获取
        this.transfers = [];
        this.swaps = [];
        this.tokens = new Set();
        this.receipt = null;
        this.swapMethod = null; // 记录通过methodId识别的swap方法
    }

    // 提取方法ID，添加容错机制
    extractMethodId(inputData) {
        try {
            if (!inputData || inputData === '0x' || inputData.length < 10) {
                return '';
            }
            return inputData.slice(0, 10).toLowerCase();
        } catch (error) {
            logger.warn(`提取methodId失败: ${error.message}`);
            return '';
        }
    }

    // 带重试机制的获取交易回执
    async getTransactionReceiptWithRetry(maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 检查连接状态
                if (!this.isConnectionReady()) {
                    throw new Error('WebSocket连接未就绪');
                }

                const receipt = await this.web3.eth.getTransactionReceipt(this.hash);
                return receipt;
                
            } catch (error) {
                const isConnectionError = this.isConnectionError(error);
                
                if (attempt === maxRetries || !isConnectionError) {
                    // 最后一次尝试或非连接错误，直接抛出
                    throw error;
                }

                logger.warn(`获取交易回执失败 (尝试 ${attempt}/${maxRetries}): ${this.hash.slice(0, 10)}... - ${error.message}`);
                
                // 等待后重试
                await this.sleep(delay * attempt);
            }
        }
    }

    // 检查是否为连接错误
    isConnectionError(error) {
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

    // 检查连接是否就绪
    isConnectionReady() {
        try {
            // 检查web3实例是否存在
            if (!this.web3 || !this.web3.currentProvider) {
                return false;
            }

            // 如果是WebSocket连接，检查连接状态
            if (this.web3.currentProvider.connection) {
                const connection = this.web3.currentProvider.connection;
                return connection.readyState === 1; // WebSocket.OPEN = 1
            }

            // 如果是HTTP连接，假设总是就绪
            return true;
            
        } catch (error) {
            return false;
        }
    }

    // 休眠函数
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 获取交易回执并解析
    async parse() {
        try {
            // 入参：无
            // 出参：解析后的交易数据对象
            
            // 1. 检查连接状态并获取交易回执
            this.receipt = await this.getTransactionReceiptWithRetry();
            if (!this.receipt) {
                logger.warn(`无法获取交易回执: ${this.hash}`);
                return this;
            }

            this.gasUsed = Number(this.receipt.gasUsed);
            this.status = Number(this.receipt.status);

            // 只处理成功的交易
            if (this.status !== 1) {
                return this;
            }

            // 2. 通过methodId和to地址识别DEX交易
            this.identifyDexTransaction();

            // 3. 解析日志事件
            await this.parseLogs();

            // 4. 处理ETH转账
            if (this.value && Number(this.value) > 0) {
                this.transfers.push({
                    from: this.sender.toLowerCase(),
                    to: this.to ? this.to.toLowerCase() : null,
                    value: this.value.toString(),
                    token: 'ETH', // 原生代币
                    tokenAddress: null,
                    txIndex: this.txIndex,
                    logIndex: -1 // ETH转账没有log
                });
            }

            return this;
        } catch (error) {
            logger.error(`解析交易失败 ${this.hash}:`, error);
            return this;
        }
    }

    // 3. 通过methodId和to地址识别DEX交易
    identifyDexTransaction() {
        try {
            // 检查是否为已知的DEX路由器地址
            const routerName = DEX_ROUTERS[this.to?.toLowerCase()];
            
            // 检查是否为已知的DEX方法
            const methodName = DEX_METHOD_IDS[this.methodId];
            
            if (routerName && methodName) {
                this.swapMethod = {
                    router: routerName,
                    method: methodName,
                    routerAddress: this.to.toLowerCase(),
                    isSwapMethod: this.isSwapMethod(methodName)
                };
                
                logger.debug(`识别到DEX交易: ${routerName} - ${methodName} (${this.hash.slice(0, 10)}...)`);
            }
        } catch (error) {
            logger.error(`识别DEX交易失败:`, error);
        }
    }

    // 判断是否为Swap相关方法
    isSwapMethod(methodName) {
        const swapMethods = [
            'swapExactTokensForTokens',
            'swapTokensForExactTokens',
            'swapExactETHForTokens',
            'swapTokensForExactETH',
            'swapExactTokensForETH',
            'swapETHForExactTokens',
            'swapExactTokensForTokensSupportingFeeOnTransferTokens',
            'swapExactETHForTokensSupportingFeeOnTransferTokens',
            'swapExactTokensForETHSupportingFeeOnTransferTokens',
            'exactInputSingle',
            'exactInput',
            'exactOutputSingle',
            'exactOutput'
        ];
        return swapMethods.includes(methodName);
    }

    // 解析交易日志
    async parseLogs() {
        if (!this.receipt.logs || this.receipt.logs.length === 0) {
            return;
        }

        let hasSwapLog = false;

        for (let i = 0; i < this.receipt.logs.length; i++) {
            const log = this.receipt.logs[i];
            
            try {
                // 根据topic解析不同类型的事件
                if (log.topics && log.topics.length > 0) {
                    const topic = log.topics[0];
                    
                    switch (topic) {
                        case ERC20_TRANSFER_TOPIC:
                            this.parseERC20Transfer(log, i);
                            break;
                        case UNISWAP_V2_SWAP_TOPIC:
                            this.parseUniswapV2Swap(log, i);
                            hasSwapLog = true;
                            break;
                        default:
                            // 其他未识别的事件
                            break;
                    }
                }
            } catch (error) {
                logger.error(`解析日志失败 ${this.hash} log ${i}:`, error);
            }
        }

        // 4. 当methodId无法匹配时，通过logs检查是否有swap
        if (!this.swapMethod && hasSwapLog) {
            // 如果没有通过methodId识别到swap，但logs中有swap事件
            // 尝试通过交易的to地址推断路由器
            const routerName = DEX_ROUTERS[this.to?.toLowerCase()] || 'Unknown DEX';
            
            this.swapMethod = {
                router: routerName,
                method: 'swap', // 通用swap标识
                routerAddress: this.to?.toLowerCase() || '',
                isSwapMethod: true,
                detectedBy: 'logs' // 标记通过logs检测到
            };
            
            logger.debug(`通过logs识别到Swap交易: ${routerName} (${this.hash.slice(0, 10)}...)`);
        }
    }

    // 解析ERC20 Transfer事件
    parseERC20Transfer(log, logIndex) {
        try {
            // Transfer(address indexed from, address indexed to, uint256 value)
            if (log.topics.length !== 3) return;

            const from = '0x' + log.topics[1].slice(26); // 去掉前面的0填充
            const to = '0x' + log.topics[2].slice(26);
            const value = this.web3.utils.hexToNumberString(log.data);
            const tokenAddress = log.address.toLowerCase();

            // 记录代币地址
            this.tokens.add(tokenAddress);

            const transfer = {
                from: from.toLowerCase(),
                to: to.toLowerCase(),
                value: value,
                token: 'ERC20',
                tokenAddress: tokenAddress,
                txIndex: this.txIndex,
                logIndex: logIndex
            };

            // 判断是否为mint或burn
            if (from === '0x0000000000000000000000000000000000000000') {
                transfer.type = 'mint';
            } else if (to === '0x0000000000000000000000000000000000000000') {
                transfer.type = 'burn';
            } else {
                transfer.type = 'transfer';
            }

            this.transfers.push(transfer);
        } catch (error) {
            logger.error(`解析ERC20 Transfer失败:`, error);
        }
    }

    // 解析Uniswap V2 Swap事件
    parseUniswapV2Swap(log, logIndex) {
        try {
            // Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)
            if (log.topics.length !== 3) return;

            const sender = '0x' + log.topics[1].slice(26);
            const to = '0x' + log.topics[2].slice(26);
            
            // 解析data中的amounts
            const data = log.data.slice(2); // 去掉0x
            const amount0In = this.web3.utils.hexToNumberString('0x' + data.slice(0, 64));
            const amount1In = this.web3.utils.hexToNumberString('0x' + data.slice(64, 128));
            const amount0Out = this.web3.utils.hexToNumberString('0x' + data.slice(128, 192));
            const amount1Out = this.web3.utils.hexToNumberString('0x' + data.slice(192, 256));

            const pairAddress = log.address.toLowerCase();
            
            // 确定输入和输出
            let inAmount, outAmount, inToken, outToken;
            
            if (Number(amount0In) > 0) {
                inAmount = amount0In;
                outAmount = amount1Out;
                inToken = 'token0';
                outToken = 'token1';
            } else {
                inAmount = amount1In;
                outAmount = amount0Out;
                inToken = 'token1';
                outToken = 'token0';
            }

            // 使用已识别的路由器信息或尝试识别
            let router = 'Unknown';
            let method = 'swap';
            
            if (this.swapMethod) {
                router = this.swapMethod.router;
                method = this.swapMethod.method;
            } else if (DEX_ROUTERS[this.to?.toLowerCase()]) {
                router = DEX_ROUTERS[this.to.toLowerCase()];
            }

            const swap = {
                sender: sender.toLowerCase(),
                to: to.toLowerCase(),
                inToken: inToken,
                outToken: outToken,
                inAmount: inAmount,
                outAmount: outAmount,
                router: router,
                method: method, // 添加方法信息
                pair: pairAddress,
                txIndex: this.txIndex,
                logIndex: logIndex
            };

            this.swaps.push(swap);
        } catch (error) {
            logger.error(`解析Uniswap V2 Swap失败:`, error);
        }
    }

    // 获取解析结果摘要
    getSummary() {
        return {
            hash: this.hash,
            chain: this.chain,
            from: this.sender,
            to: this.to,
            value: this.value,
            gasUsed: this.gasUsed,
            status: this.status,
            transfersCount: this.transfers.length,
            swapsCount: this.swaps.length,
            tokensCount: this.tokens.size,
            methodId: this.methodId,
            swapMethod: this.swapMethod?.method || null,
            router: this.swapMethod?.router || null,
            detectedBy: this.swapMethod?.detectedBy || 'methodId'
        };
    }

    // 判断是否为DEX交易
    isSwapTransaction() {
        return this.swaps.length > 0;
    }

    // 判断是否为代币转账
    isTokenTransfer() {
        return this.transfers.some(t => t.token === 'ERC20');
    }

    // 判断是否为ETH转账
    isEthTransfer() {
        return this.transfers.some(t => t.token === 'ETH');
    }

    // 获取涉及的所有代币地址
    getTokenAddresses() {
        return Array.from(this.tokens);
    }
}

module.exports = TxPaser;