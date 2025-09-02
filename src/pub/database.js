const { Pool } = require('pg');
const logger = require('../utils/logger');
const config = require('config/');

// 数据库配置
const dbConfig = {
    ...config.database,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
};

// 测试模式配置
const testConfig = {
    host: 'localhost',
    port: 5432,
    user: 'test_user',
    password: 'test_password',
    database: 'test_db',
    ssl: false,
    pool: {
        min: 1,
        max: 5,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 1000,
        acquireTimeoutMillis: 5000
    },
    retry: {
        max: 1,
        delay: 500
    }
};

class Database {
    constructor() {
        this.pool = null;
        this.isTestMode = process.env.TEST_MODE === 'true';
        this.config = this.isTestMode ? testConfig : dbConfig;
    }

    // 初始化数据库连接
    async init() {
        try {
            if (this.isTestMode) {
                logger.info('🔧 使用测试模式数据库配置');
                return true;
            }

            this.pool = new Pool(this.config);
            
            // 测试连接
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
            logger.info('✅ 数据库连接成功');
            return true;
        } catch (error) {
            logger.error('❌ 数据库连接失败:', error.message);
            return false;
        }
    }

    // 获取数据库连接池
    getPool() {
        if (this.isTestMode) {
            logger.warn('⚠️ 测试模式下无法获取真实数据库连接');
            return null;
        }
        return this.pool;
    }

    // 执行查询
    async query(text, params) {
        if (this.isTestMode) {
            logger.warn('⚠️ 测试模式下跳过数据库查询');
            return { rows: [], rowCount: 0 };
        }

        if (!this.pool) {
            throw new Error('数据库连接池未初始化');
        }

        try {
            const result = await this.pool.query(text, params);
            return result;
        } catch (error) {
            logger.error('❌ 数据库查询失败:', error.message);
            throw error;
        }
    }

    // 获取监听配置
    async getMonitorConfigs() {
        if (this.isTestMode) {
            logger.info('🔧 测试模式：返回测试配置');
            return require('./test-config').getTestConfigs();
        }

        try {
            const result = await this.query(
                'SELECT * FROM monitor_chain_config WHERE "enable" = 1 ORDER BY id'
            );
            return result.rows;
        } catch (error) {
            logger.error('获取监听配置失败:', error.message);
            return [];
        }
    }

    // 更新配置状态
    async updateConfigStatus(id, enable) {
        if (this.isTestMode) {
            logger.info(`🔧 测试模式：更新配置 ${id} 状态为 ${enable}`);
            return true;
        }

        try {
            await this.query(
                'UPDATE monitor_chain_config SET "enable" = $1 WHERE id = $2',
                [enable, id]
            );
            logger.info(`✅ 配置 ${id} 状态更新为 ${enable}`);
            return true;
        } catch (error) {
            logger.error('更新配置状态失败:', error.message);
            return false;
        }
    }

    // 根据ID获取配置
    async getConfigById(id) {
        if (this.isTestMode) {
            logger.info(`🔧 测试模式：获取配置 ${id}`);
            const configs = require('./test-config').getTestConfigs();
            return configs.find(c => c.id === id);
        }

        try {
            const result = await this.query(
                'SELECT * FROM monitor_chain_config WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('根据ID获取配置失败:', error.message);
            return null;
        }
    }

    // 关闭数据库连接
    async close() {
        if (this.pool) {
            await this.pool.end();
            logger.info('✅ 数据库连接已关闭');
        }
    }

    // 获取数据库状态
    getStatus() {
        return {
            isTestMode: this.isTestMode,
            isConnected: this.pool !== null,
            config: this.isTestMode ? 'test' : 'production'
        };
    }
}

// 创建单例实例
const database = new Database();

module.exports = database; 