// 测试配置 - 当数据库不可用时使用
const testConfigs = [
    {
        id: 1,
        chain: 'ETH',
        chain_id: '1',
        symbol: 'ETH',
        rpc_http: 'https://eth.llamarpc.com',
        rpc_ws: "wss://ethereum-rpc.publicnode.com", // 使用HTTP轮询，和Web3j一样
        interval: 5000,
        internal_rpc_http: null,
        internal_rpc_ws: null,
        full_tx: 1,
        enable: 1
    },
    {
        id: 2,
        chain: 'BSC',
        chain_id: '56',
        symbol: 'BNB',
        rpc_http: 'https://bsc-dataseed1.binance.org/',
        rpc_ws: "wss://bsc-rpc.publicnode.com", // BSC使用轮询模式，因为免费的WebSocket服务较少
        interval: 1000,
        internal_rpc_http: null,
        internal_rpc_ws: null,
        full_tx: 1,
        enable: 1
    }
];

// 获取测试配置的方法
function getTestConfigs() {
    return testConfigs;
}

// 根据ID获取测试配置
function getTestConfigById(id) {
    return testConfigs.find(config => config.id === id);
}

// 更新测试配置状态
function updateTestConfigStatus(id, enable) {
    const config = testConfigs.find(c => c.id === id);
    if (config) {
        config.enable = enable;
        return true;
    }
    return false;
}

module.exports = {
    testConfigs,
    getTestConfigs,
    getTestConfigById,
    updateTestConfigStatus
}; 