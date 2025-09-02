const BlockMonitor = require('./BlockMonitor');
const database = require('../config/database');
const logger = require('../utils/logger');

class MonitorManager {
  constructor() {
    this.monitors = new Map(); // 存储所有监听器
    this.configs = new Map(); // 存储配置
  }

  // 初始化，从数据库加载配置并启动监听器
  async init() {
    try {
      // 入参：无
      // 出参：无返回值，初始化所有启用的监听器
      
      logger.info('正在初始化监听管理器...');
      const configs = await database.getMonitorConfigs();
      
      for (const config of configs) {
        await this.addMonitor(config);
      }
      
      logger.info(`监听管理器初始化完成，启动了 ${this.monitors.size} 个监听器`);
      
    } catch (error) {
      logger.error('监听管理器初始化失败:', error);
      throw error;
    }
  }

  // 添加新的监听器
  async addMonitor(config) {
    try {
      // 入参：pub - 监听配置对象
      // 出参：无返回值，添加并启动新的监听器
      
      if (this.monitors.has(config.id)) {
        logger.warn(`监听器 ${config.chain} (ID: ${config.id}) 已存在`);
        return;
      }

      const monitor = new BlockMonitor(config);
      await monitor.init();
      await monitor.start();
      
      this.monitors.set(config.id, monitor);
      this.configs.set(config.id, config);
      
      logger.info(`添加监听器成功: ${config.chain} (ID: ${config.id})`);
      
    } catch (error) {
      logger.error(`添加监听器失败: ${config.chain}`, error);
      throw error;
    }
  }

  // 移除监听器
  async removeMonitor(configId) {
    try {
      // 入参：configId - 配置ID
      // 出参：boolean - 是否成功移除
      
      const monitor = this.monitors.get(configId);
      if (!monitor) {
        logger.warn(`监听器不存在: ID ${configId}`);
        return false;
      }

      await monitor.stop();
      this.monitors.delete(configId);
      this.configs.delete(configId);
      
      logger.info(`移除监听器成功: ID ${configId}`);
      return true;
      
    } catch (error) {
      logger.error(`移除监听器失败: ID ${configId}`, error);
      return false;
    }
  }

  // 启用监听器
  async enableMonitor(configId) {
    try {
      // 入参：configId - 配置ID
      // 出参：boolean - 是否成功启用
      
      // 更新数据库状态
      const success = await database.updateConfigStatus(configId, 1);
      if (!success) {
        logger.error(`更新数据库配置状态失败: ID ${configId}`);
        return false;
      }

      // 如果监听器不存在，则创建并启动
      if (!this.monitors.has(configId)) {
        const config = await database.getConfigById(configId);
        if (config) {
          await this.addMonitor(config);
        }
      }

      logger.info(`启用监听器成功: ID ${configId}`);
      return true;
      
    } catch (error) {
      logger.error(`启用监听器失败: ID ${configId}`, error);
      return false;
    }
  }

  // 禁用监听器
  async disableMonitor(configId) {
    try {
      // 入参：configId - 配置ID
      // 出参：boolean - 是否成功禁用
      
      // 更新数据库状态
      const success = await database.updateConfigStatus(configId, 0);
      if (!success) {
        logger.error(`更新数据库配置状态失败: ID ${configId}`);
        return false;
      }

      // 停止并移除监听器
      await this.removeMonitor(configId);

      logger.info(`禁用监听器成功: ID ${configId}`);
      return true;
      
    } catch (error) {
      logger.error(`禁用监听器失败: ID ${configId}`, error);
      return false;
    }
  }

  // 刷新配置
  async refreshConfigs() {
    try {
      // 入参：无
      // 出参：对象包含新增、移除、更新的配置数量
      
      logger.info('正在刷新监听配置...');
      
      const newConfigs = await database.getMonitorConfigs();
      const newConfigMap = new Map(newConfigs.map(config => [config.id, config]));
      
      let added = 0, removed = 0, updated = 0;

      // 检查需要移除的监听器
      for (const [configId, oldConfig] of this.configs.entries()) {
        if (!newConfigMap.has(configId)) {
          await this.removeMonitor(configId);
          removed++;
        }
      }

      // 检查需要添加或更新的监听器
      for (const [configId, newConfig] of newConfigMap.entries()) {
        if (!this.configs.has(configId)) {
          // 新增配置
          await this.addMonitor(newConfig);
          added++;
        } else {
          // 检查配置是否有变化
          const oldConfig = this.configs.get(configId);
          if (this.isConfigChanged(oldConfig, newConfig)) {
            // 重启监听器
            await this.removeMonitor(configId);
            await this.addMonitor(newConfig);
            updated++;
          }
        }
      }

      const result = { added, removed, updated };
      logger.info(`配置刷新完成: 新增 ${added}, 移除 ${removed}, 更新 ${updated}`);
      
      return result;
      
    } catch (error) {
      logger.error('刷新配置失败:', error);
      throw error;
    }
  }

  // 检查配置是否有变化
  isConfigChanged(oldConfig, newConfig) {
    // 入参：oldConfig - 旧配置, newConfig - 新配置
    // 出参：boolean - 配置是否有变化
    
    const compareFields = [
      'chain', 'chain_id', 'symbol', 'rpc_http', 'rpc_ws', 
      'interval', 'internal_rpc_http', 'internal_rpc_ws', 'full_tx'
    ];
    
    return compareFields.some(field => oldConfig[field] !== newConfig[field]);
  }

  // 获取所有监听器状态
  getAllStatus() {
    // 入参：无
    // 出参：数组包含所有监听器的状态信息
    
    const statuses = [];
    
    for (const [configId, monitor] of this.monitors.entries()) {
      statuses.push({
        configId,
        ...monitor.getStatus()
      });
    }
    
    return statuses;
  }

  // 获取单个监听器状态
  getMonitorStatus(configId) {
    // 入参：configId - 配置ID
    // 出参：监听器状态对象或null
    
    const monitor = this.monitors.get(configId);
    if (!monitor) {
      return null;
    }
    
    return {
      configId,
      ...monitor.getStatus()
    };
  }

  // 关闭所有监听器
  async shutdown() {
    try {
      // 入参：无
      // 出参：无返回值，关闭所有监听器
      
      logger.info('正在关闭所有监听器...');
      
      const promises = [];
      for (const monitor of this.monitors.values()) {
        promises.push(monitor.stop());
      }
      
      await Promise.all(promises);
      
      this.monitors.clear();
      this.configs.clear();
      
      logger.info('所有监听器已关闭');
      
    } catch (error) {
      logger.error('关闭监听器失败:', error);
      throw error;
    }
  }
}

module.exports = MonitorManager; 