# 配置系统说明

## 配置结构

```
config/
├── index.js          # 配置管理器主文件
├── default.js        # 默认配置
├── development.js    # 开发环境配置
├── production.js     # 生产环境配置
└── test.js          # 测试环境配置
```

## 环境变量配置

### 基础环境变量
```bash
# 应用环境
NODE_ENV=development          # 环境类型: development, production, test
PORT=3000                    # 应用端口
HOST=0.0.0.0                # 应用主机
CORS_ORIGIN=*                # CORS来源
```

### 数据库配置
```bash
# 数据库连接
DB_HOST=localhost            # 数据库主机
DB_PORT=5432                # 数据库端口
DB_USER=username            # 数据库用户名
DB_PASSWORD=password        # 数据库密码
DB_NAME=database            # 数据库名称
DB_SSL=true                 # 是否启用SSL

# 连接池配置
DB_POOL_MIN=2               # 最小连接数
DB_POOL_MAX=20              # 最大连接数
DB_IDLE_TIMEOUT=30000       # 空闲超时(毫秒)
DB_CONNECTION_TIMEOUT=2000  # 连接超时(毫秒)
DB_ACQUIRE_TIMEOUT=30000    # 获取连接超时(毫秒)

# 重试配置
DB_RETRY_MAX=3              # 最大重试次数
DB_RETRY_DELAY=1000         # 重试延迟(毫秒)
```

### 区块链配置
```bash
# 监听参数
DEFAULT_INTERVAL=1000        # 默认轮询间隔(毫秒)
MAX_RETRIES=3               # 最大重试次数
RETRY_DELAY=1000            # 重试延迟(毫秒)
BATCH_SIZE=10               # 批处理大小
CONNECTION_TIMEOUT=5000     # 连接超时(毫秒)
MAX_CONCURRENT=5            # 最大并发数
```

### 日志配置
```bash
# 日志设置
LOG_LEVEL=info              # 日志级别
LOG_FORMAT=combined         # 日志格式
LOG_FILE_ENABLED=true       # 是否启用文件日志
LOG_FILE_PATH=logs          # 日志文件路径
LOG_FILE_NAME=app.log       # 日志文件名
LOG_MAX_SIZE=10m            # 日志文件最大大小
LOG_MAX_FILES=5             # 最大日志文件数
LOG_COMPRESS=true           # 是否压缩日志
LOG_CONSOLE_ENABLED=true    # 是否启用控制台日志
LOG_COLORIZE=true           # 是否启用颜色
```

### 安全配置
```bash
# 安全设置
RATE_LIMIT_WINDOW=900000    # 限流窗口(毫秒)
RATE_LIMIT_MAX=100          # 限流最大值
HELMET_ENABLED=true         # 是否启用Helmet安全头
```

### 监控配置
```bash
# 监控设置
HEALTH_CHECK_ENABLED=true   # 是否启用健康检查
HEALTH_CHECK_INTERVAL=30000 # 健康检查间隔(毫秒)
METRICS_ENABLED=false       # 是否启用指标收集
METRICS_PORT=9090           # 指标端口
```

## 使用方法

### 1. 在代码中使用配置

```javascript
const config = require('./config');

// 获取配置值
const port = config.get('app.port');
const dbHost = config.get('database.host', 'localhost');

// 检查环境
if (config.isDevelopment()) {
  console.log('开发环境');
}

// 获取所有配置
const allConfig = config.getAll();
```

### 2. 设置环境变量

```bash
# Windows PowerShell
$env:NODE_ENV="production"
$env:DB_HOST="prod-db.example.com"

# Windows CMD
set NODE_ENV=production
set DB_HOST=prod-db.example.com

# Linux/Mac
export NODE_ENV=production
export DB_HOST=prod-db.example.com
```

### 3. 创建.env文件

```bash
# 复制示例文件
cp .env.example .env

# 编辑配置
nano .env
```

## 环境特定配置

### 开发环境 (development)
- 端口: 3000
- 日志级别: debug
- 控制台日志: 启用
- 文件日志: 禁用
- 数据库连接池: 较小
- 安全限制: 宽松

### 生产环境 (production)
- 端口: 3000
- 日志级别: warn
- 控制台日志: 禁用
- 文件日志: 启用并压缩
- 数据库连接池: 较大
- 安全限制: 严格
- 监控: 启用

### 测试环境 (test)
- 端口: 3001
- 日志级别: error
- 所有日志: 禁用
- 数据库: 本地测试数据库
- 安全限制: 无
- 监控: 禁用

## 配置优先级

1. 环境变量 (最高优先级)
2. 环境特定配置文件
3. 默认配置文件 (最低优先级)

## 配置验证

系统会自动验证必需配置项：
- `app.port` - 应用端口
- `app.host` - 应用主机
- `database.host` - 数据库主机
- `database.port` - 数据库端口
- `database.user` - 数据库用户
- `database.password` - 数据库密码
- `database.database` - 数据库名称

## 最佳实践

1. **敏感信息**: 使用环境变量存储密码和密钥
2. **环境分离**: 不同环境使用不同的配置文件
3. **默认值**: 为所有配置提供合理的默认值
4. **验证**: 启动时验证必需配置
5. **文档**: 保持配置文档的更新

## 故障排除

### 常见问题

1. **配置加载失败**: 检查配置文件语法和路径
2. **环境变量未生效**: 确保正确设置NODE_ENV
3. **数据库连接失败**: 检查数据库配置和网络连接
4. **权限问题**: 确保应用有足够的权限访问配置

### 调试方法

```javascript
// 启用调试日志
const config = require('./config');
console.log('当前环境:', config.getEnvironment());
console.log('所有配置:', config.getAll());
console.log('数据库配置:', config.get('database'));
``` 