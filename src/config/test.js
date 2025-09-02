const defaultConfig = require('./default');

module.exports = {
  ...defaultConfig,
  
  // 测试环境特定配置
  app: {
    ...defaultConfig.app,
    env: 'test',
    port: process.env.PORT || 3001
  },

  database: {
    ...defaultConfig.database,
    host: 'localhost',
    port: 5432,
    user: 'test_user',
    password: 'test_password',
    database: 'test_db',
    ssl: false,
    pool: {
      ...defaultConfig.database.pool,
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 1000
    }
  },

  logging: {
    ...defaultConfig.logging,
    level: 'error', // 测试环境只显示错误
    console: {
      ...defaultConfig.logging.console,
      enabled: false
    },
    file: {
      ...defaultConfig.logging.file,
      enabled: false
    }
  },

  blockchain: {
    ...defaultConfig.blockchain,
    defaultInterval: 5000, // 测试环境增加间隔
    maxRetries: 1,
    batchSize: 5
  },

  security: {
    ...defaultConfig.security,
    rateLimit: {
      ...defaultConfig.security.rateLimit,
      max: 10000 // 测试环境不限制
    }
  },

  monitoring: {
    ...defaultConfig.monitoring,
    healthCheck: {
      ...defaultConfig.monitoring.healthCheck,
      enabled: false
    },
    metrics: {
      ...defaultConfig.monitoring.metrics,
      enabled: false
    }
  }
}; 