const defaultConfig = require('./default');

module.exports = {
  ...defaultConfig,
  
  // 开发环境特定配置
  app: {
    ...defaultConfig.app,
    port: process.env.PORT || 3000,
    env: 'development'
  },

  database: {
    ...defaultConfig.database,
    pool: {
      ...defaultConfig.database.pool,
      max: 10, // 开发环境减少连接数
      idleTimeoutMillis: 10000
    }
  },

  logging: {
    ...defaultConfig.logging,
    level: 'debug',
    console: {
      ...defaultConfig.logging.console,
      enabled: true,
      colorize: true
    },
    file: {
      ...defaultConfig.logging.file,
      enabled: false // 开发环境不写文件
    }
  },

  blockchain: {
    ...defaultConfig.blockchain,
    defaultInterval: 2000, // 开发环境增加间隔
    maxRetries: 2
  },

  security: {
    ...defaultConfig.security,
    rateLimit: {
      ...defaultConfig.security.rateLimit,
      max: 1000 // 开发环境放宽限制
    }
  },

  abi: {
    ...defaultConfig.abi,
    updateAbiToDb: true
  }
}; 