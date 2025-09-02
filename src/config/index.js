const path = require('path');
const fs = require('fs');

// 获取环境变量
const env = process.env.NODE_ENV || 'development';

// 配置文件路径
const configPath = path.join(__dirname, `${env}.js`);

// 检查配置文件是否存在
if (!fs.existsSync(configPath)) {
  console.warn(`⚠️  配置文件 ${configPath} 不存在，使用默认配置`);
}

// 加载对应环境的配置
let config;
try {
  config = require(configPath);
} catch (error) {
  console.warn(`⚠️  加载配置文件失败: ${error.message}，使用默认配置`);
  config = require('./default');
}

// 配置验证函数
function validateConfig(config) {
  const required = [
    'app.port',
    'app.host',
    'database.host',
    'database.port',
    'database.user',
    'database.password',
    'database.database'
  ];

  const missing = [];
  
  required.forEach(path => {
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        missing.push(path);
        break;
      }
    }
  });

  if (missing.length > 0) {
    console.warn(`⚠️  缺少必需配置: ${missing.join(', ')}`);
  }

  return missing.length === 0;
}

// 配置合并函数
function mergeConfig(baseConfig, overrideConfig) {
  const result = { ...baseConfig };
  
  for (const key in overrideConfig) {
    if (overrideConfig.hasOwnProperty(key)) {
      if (typeof overrideConfig[key] === 'object' && !Array.isArray(overrideConfig[key])) {
        result[key] = mergeConfig(result[key] || {}, overrideConfig[key]);
      } else {
        result[key] = overrideConfig[key];
      }
    }
  }
  
  return result;
}

// 获取配置值
function get(path, defaultValue = undefined) {
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

// 设置配置值
function set(path, value) {
  const keys = path.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// 获取所有配置
function getAll() {
  return { ...config };
}

// 获取环境信息
function getEnvironment() {
  return env;
}

// 检查是否为特定环境
function isEnvironment(environment) {
  return env === environment;
}

// 验证配置
const isValid = validateConfig(config);

// 输出配置信息
console.log(`🔧 加载配置环境: ${env}`);
console.log(`📊 配置验证: ${isValid ? '✅ 通过' : '❌ 失败'}`);

module.exports = {
  // 配置对象
  ...config,
  
  // 配置管理方法
  get,
  set,
  getAll,
  getEnvironment,
  isEnvironment,
  
  // 环境检查
  isDevelopment: () => isEnvironment('development'),
  isProduction: () => isEnvironment('production'),
  isTest: () => isEnvironment('test'),
  
  // 配置验证
  isValid
}; 