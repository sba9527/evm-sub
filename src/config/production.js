const defaultConfig = require('./default');

module.exports = {
  ...defaultConfig,
  
  // 生产环境特定配置
  app: {
    ...defaultConfig.app,
    env: 'production',
    cors: {
      ...defaultConfig.app.cors,
      origin: process.env.CORS_ORIGIN || false // 生产环境限制CORS
    }
  },

  database: {
    ...defaultConfig.database,
    pool: {
      ...defaultConfig.database.pool,
      max: 50, // 生产环境增加连接数
      idleTimeoutMillis: 60000
    },
    retry: {
      ...defaultConfig.database.retry,
      max: 5, // 生产环境增加重试次数
      delay: 2000
    }
  },

  logging: {
    ...defaultConfig.logging,
    level: 'warn',
    file: {
      ...defaultConfig.logging.file,
      enabled: true,
      compress: true
    },
    console: {
      ...defaultConfig.logging.console,
      enabled: false // 生产环境不输出到控制台
    }
  },

  blockchain: {
    ...defaultConfig.blockchain,
    defaultInterval: 500, // 生产环境减少间隔
    maxRetries: 5,
    maxConcurrent: 10
  },

  security: {
    ...defaultConfig.security,
    rateLimit: {
      ...defaultConfig.security.rateLimit,
      max: 50 // 生产环境严格限制
    },
    helmet: {
      enabled: true
    }
  },

  monitoring: {
    ...defaultConfig.monitoring,
    healthCheck: {
      ...defaultConfig.monitoring.healthCheck,
      enabled: true,
      interval: 15000
    },
    metrics: {
      ...defaultConfig.monitoring.metrics,
      enabled: true
    }
  }
}; 