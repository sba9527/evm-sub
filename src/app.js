const express = require('express');
const cors = require('cors');
const fs = require('fs');
const MonitorManager = require('./monitor/MonitorManager');
const { router: apiRoutes, setMonitorManager } = require('./api/routes');
const logger = require('./utils/logger');

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.monitorManager = new MonitorManager();
    this.init();
  }

  async init() {
    try {
      // 创建日志目录
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
      }

      // 设置中间件
      this.app.use(cors());
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));

      // 请求日志中间件
      this.app.use((req, res, next) => {
        logger.info(`${req.method} ${req.url} - ${req.ip}`);
        next();
      });

      // 注入监听管理器到路由
      setMonitorManager(this.monitorManager);

      // 设置API路由
      this.app.use('/api', apiRoutes);

      // 根路径
      this.app.get('/', (req, res) => {
        res.json({
          name: 'EVM区块链监听服务',
          version: '1.0.0',
          status: 'running',
          timestamp: new Date().toISOString(),
          endpoints: {
            status: 'GET /api/status - 获取所有监听器状态',
            statusById: 'GET /api/status/:configId - 获取指定监听器状态',
            refresh: 'POST /api/refresh - 刷新配置',
            enable: 'POST /api/enable/:configId - 启用监听器',
            disable: 'POST /api/disable/:configId - 禁用监听器',
            blocks: 'GET /api/blocks - 获取区块信息',
            health: 'GET /api/health - 健康检查'
          }
        });
      });

      // 错误处理中间件
      this.app.use((error, req, res, next) => {
        logger.error('API错误:', error);
        res.status(500).json({
          success: false,
          message: '服务器内部错误',
          error: error.message
        });
      });

      // 404处理
      this.app.use((req, res) => {
        res.status(404).json({
          success: false,
          message: '接口不存在'
        });
      });

      logger.info('应用初始化完成');
      
    } catch (error) {
      logger.error('应用初始化失败:', error);
      throw error;
    }
  }

  async start() {
    try {
      // 入参：无
      // 出参：无返回值，启动HTTP服务器和监听管理器
      
      // 启动监听管理器
      logger.info('正在启动监听管理器...');
      await this.monitorManager.init();

      // 启动HTTP服务器
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 EVM区块监听服务已启动`);
        logger.info(`📡 HTTP服务器运行在端口: ${this.port}`);
        logger.info(`🔗 API文档: http://localhost:${this.port}`);
        logger.info(`📊 状态查询: http://localhost:${this.port}/api/status`);
      });

      // 优雅关闭处理
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('启动服务失败:', error);
      throw error;
    }
  }

  async shutdown() {
    logger.info('正在关闭服务...');
    
    try {
      // 关闭HTTP服务器
      if (this.server) {
        this.server.close();
      }

      // 关闭监听管理器
      await this.monitorManager.shutdown();

      logger.info('服务已安全关闭');
      process.exit(0);
      
    } catch (error) {
      logger.error('关闭服务失败:', error);
      process.exit(1);
    }
  }
}

// 启动应用
if (require.main === module) {
  const app = new App();
  app.start().catch(error => {
    logger.error('应用启动失败:', error);
    process.exit(1);
  });
}

module.exports = App; 