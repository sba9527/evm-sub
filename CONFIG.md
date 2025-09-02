# 配置文件说明

## 环境变量配置

### 数据库配置
```bash
# 数据库连接信息
DB_HOST=pg-18bd692a-alumnos-7aba.d.aivencloud.com
DB_PORT=14853
DB_USER=avnadmin
DB_PASSWORD=AVNS_8mf2QjWK4vK6msZbpEB
DB_NAME=defaultdb
DB_SSL=true

# 数据库连接池配置
DB_POOL_MAX=20                    # 最大连接数
DB_IDLE_TIMEOUT=30000             # 连接空闲超时(毫秒)
DB_CONNECTION_TIMEOUT=2000        # 连接超时(毫秒)
```

### 应用配置
```bash
# 应用端口和主机
PORT=3000                         # 应用端口
HOST=0.0.0.0                     # 应用主机
NODE_ENV=development              # 环境模式

# 测试模式
TEST_MODE=false                   # 是否启用测试模式
```

### 区块链监听配置
```bash
# 监听参数
DEFAULT_INTERVAL=1000             # 默认轮询间隔(毫秒)
MAX_RETRIES=3                     # 最大重试次数
RETRY_DELAY=1000                  # 重试延迟(毫秒)
BATCH_SIZE=10                     # 批处理大小
```

### 日志配置
```bash
# 日志设置
LOG_LEVEL=info                    # 日志级别
LOG_FILE=logs/app.log             # 日志文件路径
LOG_MAX_SIZE=10m                  # 日志文件最大大小
LOG_MAX_FILES=5                   # 最大日志文件数
```

## 配置文件结构

### src/config/config.js
- 集中管理所有配置项
- 支持环境变量覆盖
- 提供默认值

### src/config/database.js
- 数据库连接管理
- 连接池配置
- 测试模式支持

## 使用方法

### 1. 设置环境变量
```bash
# Windows PowerShell
$env:DB_HOST="your_host"
$env:DB_PORT="5432"

# Windows CMD
set DB_HOST=your_host
set DB_PORT=5432

# Linux/Mac
export DB_HOST=your_host
export DB_PORT=5432
```

### 2. 创建.env文件
```bash
# 复制示例文件
cp .env.example .env

# 编辑配置
nano .env
```

### 3. 在代码中使用
```javascript
const config = require('./config/pub');

// 获取数据库配置
const dbHost = config.database.host;
const dbPort = config.database.port;

// 获取应用配置
const appPort = config.app.port;
const isTestMode = config.test.enabled;
```

## 测试模式

当设置 `TEST_MODE=true` 时：
- 使用本地测试数据库配置
- 跳过真实数据库连接
- 返回测试配置数据

```bash
# 启用测试模式
TEST_MODE=true npm start

# 或者使用npm脚本
npm run start:test
```

## 配置优先级

1. 环境变量 (最高优先级)
2. 配置文件默认值
3. 硬编码默认值 (最低优先级)

## 安全注意事项

- 不要在代码中硬编码敏感信息
- 使用环境变量存储密码和密钥
- 生产环境使用强密码和SSL连接
- 定期更新数据库凭据 