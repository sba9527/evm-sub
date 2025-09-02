const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// 监听管理器实例将在app.js中注入
let monitorManager = null;

// 设置监听管理器实例
const setMonitorManager = (manager) => {
  monitorManager = manager;
};

// 获取所有监听器状态
router.get('/status', async (req, res) => {
  try {
    // 入参：无
    // 出参：返回所有监听器的状态信息
    
    const statuses = monitorManager.getAllStatus();
    
    res.json({
      success: true,
      data: statuses,
      message: '获取状态成功'
    });
    
  } catch (error) {
    logger.error('获取状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取状态失败',
      error: error.message
    });
  }
});

// 获取单个监听器状态
router.get('/status/:configId', async (req, res) => {
  try {
    // 入参：configId - 配置ID（路径参数）
    // 出参：返回指定监听器的状态信息
    
    const configId = parseInt(req.params.configId);
    const status = monitorManager.getMonitorStatus(configId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: '监听器不存在'
      });
    }
    
    res.json({
      success: true,
      data: status,
      message: '获取状态成功'
    });
    
  } catch (error) {
    logger.error('获取监听器状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取状态失败',
      error: error.message
    });
  }
});

// 刷新配置
router.post('/refresh', async (req, res) => {
  try {
    // 入参：无
    // 出参：返回刷新结果统计信息
    
    const result = await monitorManager.refreshConfigs();
    
    res.json({
      success: true,
      data: result,
      message: '配置刷新成功'
    });
    
  } catch (error) {
    logger.error('刷新配置失败:', error);
    res.status(500).json({
      success: false,
      message: '刷新配置失败',
      error: error.message
    });
  }
});

// 启用监听器
router.post('/enable/:configId', async (req, res) => {
  try {
    // 入参：configId - 配置ID（路径参数）
    // 出参：返回操作结果
    
    const configId = parseInt(req.params.configId);
    const success = await monitorManager.enableMonitor(configId);
    
    if (success) {
      res.json({
        success: true,
        message: '启用监听器成功'
      });
    } else {
      res.status(400).json({
        success: false,
        message: '启用监听器失败'
      });
    }
    
  } catch (error) {
    logger.error('启用监听器失败:', error);
    res.status(500).json({
      success: false,
      message: '启用监听器失败',
      error: error.message
    });
  }
});

// 禁用监听器
router.post('/disable/:configId', async (req, res) => {
  try {
    // 入参：configId - 配置ID（路径参数）
    // 出参：返回操作结果
    
    const configId = parseInt(req.params.configId);
    const success = await monitorManager.disableMonitor(configId);
    
    if (success) {
      res.json({
        success: true,
        message: '禁用监听器成功'
      });
    } else {
      res.status(400).json({
        success: false,
        message: '禁用监听器失败'
      });
    }
    
  } catch (error) {
    logger.error('禁用监听器失败:', error);
    res.status(500).json({
      success: false,
      message: '禁用监听器失败',
      error: error.message
    });
  }
});

// 获取区块高度信息
router.get('/blocks', async (req, res) => {
  try {
    // 入参：无
    // 出参：返回所有监听器的区块高度信息
    
    const statuses = monitorManager.getAllStatus();
    const blockInfo = statuses.map(status => ({
      configId: status.configId,
      chain: status.chain,
      symbol: status.symbol,
      currentBlockHeight: status.currentBlockHeight,
      isRunning: status.isRunning
    }));
    
    res.json({
      success: true,
      data: blockInfo,
      message: '获取区块信息成功'
    });
    
  } catch (error) {
    logger.error('获取区块信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取区块信息失败',
      error: error.message
    });
  }
});

// 健康检查接口
router.get('/health', (req, res) => {
  // 入参：无
  // 出参：返回服务健康状态
  
  res.json({
    success: true,
    message: 'EVM区块监听服务运行正常',
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  router,
  setMonitorManager
}; 