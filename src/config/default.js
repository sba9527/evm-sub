module.exports = {
  // 应用基础配置
  app: {
    name: 'EVM区块链监听服务',
    version: '1.0.0',
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0'
  },

  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres.xvfyfmgcdbyfjlcoihpo',
    password: process.env.DB_PASSWORD || 'iXuEsX2*#GuwfC2',
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL !== 'false', // 默认启用SSL
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 10000
    },
    retry: {
      max: parseInt(process.env.DB_RETRY_MAX) || 3,
      delay: parseInt(process.env.DB_RETRY_DELAY) || 1000
    }
  },

  // 区块链配置
  blockchain: {
    defaultChain: process.env.DEFAULT_CHAIN || 'ETH',
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 5,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== 'false'
    },
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      filename: process.env.LOG_FILE_NAME || 'logs/app.log',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5
    }
  },

  // 安全配置
  security: {
    cors: {
      enabled: process.env.CORS_ENABLED !== 'false',
      origin: process.env.CORS_ORIGIN || '*'
    },
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100
    }
  },

  // 监控配置
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    metricsEnabled: process.env.METRICS_ENABLED === 'true'
  },

  // ABI更新配置
  abi: {
    updateAbiToDb: process.env.UPDATE_ABI_TO_DB === 'true' || false
  }
}; 