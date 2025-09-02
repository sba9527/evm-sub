-- 示例配置数据
-- 请根据实际情况修改RPC地址

-- 以太坊主网配置
INSERT INTO monitor_chain_config (id, chain, chain_id, symbol, rpc_http, rpc_ws, interval, internal_rpc_http, internal_rpc_ws, full_tx, enable) VALUES
(1, 'Ethereum', '1', 'ETH', 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY', 'wss://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY', 3000, NULL, NULL, 1, 1);

-- BSC主网配置
INSERT INTO monitor_chain_config (id, chain, chain_id, symbol, rpc_http, rpc_ws, interval, internal_rpc_http, internal_rpc_ws, full_tx, enable) VALUES
(2, 'BSC', '56', 'BNB', 'https://bsc-dataseed1.binance.org/', 'wss://bsc-ws-node.nariox.org:443', 3000, NULL, NULL, 1, 1);

-- Polygon主网配置
INSERT INTO monitor_chain_config (id, chain, chain_id, symbol, rpc_http, rpc_ws, interval, internal_rpc_http, internal_rpc_ws, full_tx, enable) VALUES
(3, 'Polygon', '137', 'MATIC', 'https://polygon-rpc.com/', 'wss://polygon-bor.publicnode.com', 3000, NULL, NULL, 0, 0);

-- Arbitrum One配置
INSERT INTO monitor_chain_config (id, chain, chain_id, symbol, rpc_http, rpc_ws, interval, internal_rpc_http, internal_rpc_ws, full_tx, enable) VALUES
(4, 'Arbitrum', '42161', 'ETH', 'https://arb1.arbitrum.io/rpc', 'wss://arb1.arbitrum.io/ws', 2000, NULL, NULL, 1, 0);

-- 注意事项：
-- 1. 请将 YOUR_API_KEY 替换为实际的API密钥
-- 2. 确保RPC地址可访问
-- 3. enable=1 表示启用，enable=0 表示禁用
-- 4. full_tx=1 表示获取完整交易数据，full_tx=0 表示只获取交易哈希
-- 5. interval 单位为毫秒，用于HTTP轮询间隔 