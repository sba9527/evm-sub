# EVM区块链监听服务

## 项目简介
这是一个全量监听EVM区块链数据的Node.js程序，支持多链配置、WebSocket和HTTP轮询监听、交易解析和数据库存储。

## 功能特性
- 🔗 多链支持：支持ETH、BSC等EVM兼容链
- 📡 双模式监听：WebSocket订阅 + HTTP轮询降级
- 🔍 智能交易解析：自动识别转账、交换、合约调用等
- 💾 数据持久化：PostgreSQL数据库存储
- 🚀 RESTful API：完整的HTTP接口
- 🖥️ CLI工具：命令行管理工具
- ⚙️ 配置管理：环境化配置系统
- 🧪 测试模式：支持离线测试

## 技术栈
- **运行时**: Node.js
- **Web3库**: Web3.js v4.x, Ethers.js v6.x
- **数据库**: PostgreSQL
- **Web框架**: Express.js
- **CLI框架**: Commander.js
- **日志**: Winston
- **配置**: 环境化配置系统

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 12+
- 网络访问（用于RPC连接）

### 安装依赖
```bash
npm install
```

### 配置环境
1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 配置数据库连接：
```env
DB_HOST=your_db_host
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

3. 配置区块链RPC：
```env
# 启用ABI数据库更新（可选）
UPDATE_ABI_TO_DB=true
```

### 启动服务
```bash
# 生产模式
npm start

# 开发模式
npm run dev

# 测试模式
npm run start:test
```

### 使用CLI工具
```bash
# 启动监听器
npm run cli start

# 查看状态
npm run cli status

# 刷新配置
npm run cli refresh
```

## 项目结构
```
src/
├── api/                 # RESTful API
├── config/              # 配置管理
│   ├── abis/           # ABI文件
│   ├── default.js      # 默认配置
│   ├── development.js  # 开发环境配置
│   ├── production.js   # 生产环境配置
│   ├── test.js         # 测试环境配置
│   └── index.js        # 配置加载器
├── database/            # 数据库相关
├── monitor/             # 区块链监听
├── models/              # 数据模型
├── utils/               # 工具函数
├── app.js               # 主应用
└── cli.js               # CLI工具
```

## API接口

### 状态查询
- `GET /api/status` - 获取所有监听器状态
- `GET /api/status/:configId` - 获取指定监听器状态
- `GET /api/health` - 健康检查

### 配置管理
- `POST /api/refresh` - 刷新配置
- `POST /api/enable/:configId` - 启用监听器
- `POST /api/disable/:configId` - 禁用监听器

### 区块信息
- `GET /api/blocks` - 获取区块信息

## 配置说明

### 环境配置
项目使用环境化配置系统，支持以下环境：
- `development` - 开发环境
- `production` - 生产环境
- `test` - 测试环境

### 数据库配置
支持PostgreSQL数据库，配置项包括：
- 连接池设置
- SSL配置
- 重试机制
- 超时设置

### 区块链配置
- RPC端点配置
- 监听间隔
- 并发控制
- 错误重试

## 开发指南

### 添加新链支持
1. 在数据库中添加链配置
2. 确保RPC端点可用
3. 测试连接和监听

### 自定义交易解析
1. 扩展`TxPaser`类
2. 添加新的解析逻辑
3. 更新数据库模型

### 添加新的ABI
1. 将ABI文件放入`src/config/abis/`
2. 运行测试验证
3. 可选择更新到数据库

## 测试

### MethodId和Topic计算测试
```bash
npm run test:methodid
```

### 启用数据库更新测试
```bash
# Windows CMD
set UPDATE_ABI_TO_DB=true && npm run test:methodid

# Linux/Mac
UPDATE_ABI_TO_DB=true npm run test:methodid
```

## 故障排除

### 常见问题
1. **WebSocket连接失败**: 自动降级到HTTP轮询
2. **数据库连接失败**: 检查网络和认证信息
3. **RPC限流**: 调整请求间隔和并发数

### 日志查看
- 应用日志：`logs/app.log`
- 控制台输出：实时日志信息
- 日志级别：可通过环境变量调整

## 贡献指南
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 许可证
MIT License

---

## 会话总结

### 会话主要目的
重构项目目录结构，完善配置系统，添加methodId和topic计算功能，实现ABI数据库更新功能。

### 完成的主要任务
1. **目录结构重构**
   - 将配置文件从根目录移动到`src/config/`
   - 将数据库文件移动到`src/database/`
   - 重新组织项目结构，符合标准Node.js项目规范

2. **配置系统完善**
   - 更新数据库连接信息为新的Supabase配置
   - 添加`updateAbiToDb`配置项，默认false
   - 完善环境化配置系统

3. **MethodId和Topic计算功能**
   - 重构`MethodIdCalculator`类，支持两种计算方式
   - 添加事件topic hash计算功能
   - 实现批量验证和结果一致性检查

4. **ABI数据库更新功能**
   - 实现`updateAbiToDatabase`函数
   - 支持从ABI文件自动更新到`a_monitor_abi`表
   - 智能判断是否需要新增或更新

5. **测试功能完善**
   - 更新`methodIdTest.js`，支持methodId和topic双重测试
   - 添加数据库更新测试功能
   - 优化测试输出格式

### 关键决策和解决方案
1. **目录结构标准化**: 采用标准Node.js项目结构，提高可维护性
2. **配置管理**: 使用环境化配置系统，支持多环境部署
3. **双重验证**: methodId和topic都使用两种方法计算并验证一致性
4. **智能更新**: 数据库更新时只新增不存在的记录，避免重复

### 使用的技术栈
- **Node.js**: 运行时环境
- **Ethers.js v6**: 区块链交互和哈希计算
- **PostgreSQL**: 数据存储
- **配置管理**: 环境化配置系统
- **测试框架**: 自定义测试脚本

### 修改的文件
1. **新增文件**:
   - `src/config/default.js` - 默认配置文件
   - `src/config/development.js` - 开发环境配置
   - `src/config/production.js` - 生产环境配置
   - `src/config/test.js` - 测试环境配置
   - `src/config/index.js` - 配置加载器
   - `src/config/database.js` - 数据库配置
   - `src/config/test-chain-config.js` - 测试链配置
   - `src/config/methodIdCalculator.js` - 方法ID计算器
   - `src/models/TransactionModel.js` - 交易模型
   - `src/database/db.sql` - 数据库表结构

2. **修改文件**:
   - `src/test/methodIdTest.js` - 测试脚本更新
   - `src/monitor/BlockMonitor.js` - 导入路径修复
   - `src/monitor/MonitorManager.js` - 导入路径修复
   - `package.json` - 脚本配置更新

3. **删除文件**:
   - 根目录下的`config/`文件夹
   - 根目录下的`database/`文件夹

### 测试验证
- ✅ MethodId计算测试通过（100%一致性）
- ✅ Topic hash计算测试通过（100%一致性）
- ✅ 配置系统正常工作
- ✅ 数据库连接配置正确
- ✅ ABI文件解析正常

### 下一步建议
1. 创建`.env`文件配置实际数据库连接
2. 测试真实的区块链监听功能
3. 根据需要调整配置参数
4. 添加更多ABI文件进行测试 