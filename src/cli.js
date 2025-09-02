#!/usr/bin/env node

const { Command } = require('commander');
const MonitorManager = require('./monitor/MonitorManager');
const logger = require('./utils/logger');
const fs = require('fs');

const program = new Command();
const monitorManager = new MonitorManager();

program
  .name('evm-parser')
  .description('EVM区块链监听器命令行工具')
  .version('1.0.0');

// 启动监听器
program
  .command('start')
  .description('启动所有启用的监听器')
  .action(async () => {
    try {
      logger.info('正在启动监听器...');
      await monitorManager.init();
      
      console.log('✅ 监听器启动成功');
      console.log('按 Ctrl+C 退出程序');
      
      // 保持程序运行
      process.on('SIGINT', async () => {
        console.log('\n正在关闭监听器...');
        await monitorManager.shutdown();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ 启动失败:', error.message);
      process.exit(1);
    }
  });

// 查看状态
program
  .command('status')
  .description('查看所有监听器状态')
  .option('-i, --id <configId>', '查看指定ID的监听器状态')
  .action(async (options) => {
    try {
      await monitorManager.init();
      
      if (options.id) {
        // 入参：configId - 配置ID
        // 出参：显示指定监听器状态信息
        const configId = parseInt(options.id);
        const status = monitorManager.getMonitorStatus(configId);
        
        if (!status) {
          console.log('❌ 监听器不存在');
          return;
        }
        
        console.log('📊 监听器状态:');
        console.table([status]);
      } else {
        // 入参：无
        // 出参：显示所有监听器状态信息
        const statuses = monitorManager.getAllStatus();
        
        if (statuses.length === 0) {
          console.log('📭 没有运行中的监听器');
          return;
        }
        
        console.log('📊 所有监听器状态:');
        console.table(statuses);
      }
      
      await monitorManager.shutdown();
      
    } catch (error) {
      console.error('❌ 获取状态失败:', error.message);
      process.exit(1);
    }
  });

// 刷新配置
program
  .command('refresh')
  .description('刷新数据库配置并重启相关监听器')
  .action(async () => {
    try {
      await monitorManager.init();
      
      // 入参：无
      // 出参：显示配置刷新结果
      const result = await monitorManager.refreshConfigs();
      
      console.log('✅ 配置刷新完成:');
      console.log(`   新增: ${result.added} 个`);
      console.log(`   移除: ${result.removed} 个`);
      console.log(`   更新: ${result.updated} 个`);
      
      await monitorManager.shutdown();
      
    } catch (error) {
      console.error('❌ 刷新配置失败:', error.message);
      process.exit(1);
    }
  });

// 启用监听器
program
  .command('enable <configId>')
  .description('启用指定的监听器')
  .action(async (configId) => {
    try {
      await monitorManager.init();
      
      // 入参：configId - 配置ID
      // 出参：显示启用结果
      const id = parseInt(configId);
      const success = await monitorManager.enableMonitor(id);
      
      if (success) {
        console.log(`✅ 启用监听器成功: ID ${id}`);
      } else {
        console.log(`❌ 启用监听器失败: ID ${id}`);
      }
      
      await monitorManager.shutdown();
      
    } catch (error) {
      console.error('❌ 启用监听器失败:', error.message);
      process.exit(1);
    }
  });

// 禁用监听器
program
  .command('disable <configId>')
  .description('禁用指定的监听器')
  .action(async (configId) => {
    try {
      await monitorManager.init();
      
      // 入参：configId - 配置ID
      // 出参：显示禁用结果
      const id = parseInt(configId);
      const success = await monitorManager.disableMonitor(id);
      
      if (success) {
        console.log(`✅ 禁用监听器成功: ID ${id}`);
      } else {
        console.log(`❌ 禁用监听器失败: ID ${id}`);
      }
      
      await monitorManager.shutdown();
      
    } catch (error) {
      console.error('❌ 禁用监听器失败:', error.message);
      process.exit(1);
    }
  });

// 查看区块信息
program
  .command('blocks')
  .description('查看当前订阅的区块链和区块高度')
  .action(async () => {
    try {
      await monitorManager.init();
      
      // 入参：无
      // 出参：显示所有监听器的区块信息
      const statuses = monitorManager.getAllStatus();
      
      if (statuses.length === 0) {
        console.log('📭 没有运行中的监听器');
        return;
      }
      
      const blockInfo = statuses.map(status => ({
        配置ID: status.configId,
        区块链: status.chain,
        代币: status.symbol,
        当前区块: status.currentBlockHeight,
        运行状态: status.isRunning ? '✅ 运行中' : '❌ 已停止'
      }));
      
      console.log('🔗 区块链订阅信息:');
      console.table(blockInfo);
      
      await monitorManager.shutdown();
      
    } catch (error) {
      console.error('❌ 获取区块信息失败:', error.message);
      process.exit(1);
    }
  });

// 创建日志目录
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 