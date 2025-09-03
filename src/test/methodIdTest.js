#!/usr/bin/env node

const MethodIdCalculator = require('../config/methodIdCalculator');
const config = require('../config/index');
const database = require('../config/database');
const fs = require('fs');
const path = require('path');

async function testMethodIdAndTopicCalculation() {
    console.log('🧪 === ABI文件MethodId和Topic计算测试 ===\n');
    
    const calculator = new MethodIdCalculator();

    // 测试config/abis目录下的ABI文件
    console.log('📄 === 测试ABI文件methodId和topic计算 ===');
    await testABICalculation(calculator);
}

async function testABICalculation(calculator) {
    try {
        // 查找config/abis目录下的ABI文件
        const abisDir = path.join(__dirname, '../config/abis');
        
        if (!fs.existsSync(abisDir)) {
            console.log('❌ config/abis目录不存在，跳过ABI测试');
            return;
        }

        const abiFiles = fs.readdirSync(abisDir).filter(file => file.endsWith('.json'));
        
        if (abiFiles.length === 0) {
            console.log('❌ config/abis目录中没有ABI文件，跳过ABI测试');
            return;
        }

        console.log(`📁 找到 ${abiFiles.length} 个ABI文件\n`);

        for (const abiFile of abiFiles) {
            try {
                const abiPath = path.join(abisDir, abiFile);
                const abiContent = fs.readFileSync(abiPath, 'utf8');
                const abi = JSON.parse(abiContent);
                
                console.log(`📋 === ${abiFile} ===`);
                
                // 找到所有函数和事件
                const functions = abi.filter(item => item.type === 'function');
                const events = abi.filter(item => item.type === 'event');
                
                console.log(`函数数量: ${functions.length}, 事件数量: ${events.length}\n`);
                
                // 测试函数methodId
                if (functions.length > 0) {
                    console.log(`🔧 === 函数MethodId测试 <== ${abiFile} ===`);
                    const functionResults = calculator.batchValidateFunctions(functions);
                    
                    // 输出函数结果表格
                    console.table(functionResults.map(r => ({
                        函数名: r.function,
                        Keccak256: r.keccak256,
                        Interface: r.interface,
                        一致性: r.consistent ? '✅' : '❌'
                    })));
                    
                    // 统计函数结果
                    const consistentFunctionCount = functionResults.filter(r => r.consistent).length;
                    console.log(`📊 函数MethodId汇总: 总函数数: ${functions.length}, 一致结果: ${consistentFunctionCount}/${functions.length}, 成功率: ${((consistentFunctionCount/functions.length)*100).toFixed(1)}%\n`);
                }
                
                // 测试事件topic
                if (events.length > 0) {
                    console.log(`📡 === 事件Topic测试 <== ${abiFile} ===`);
                    const eventResults = calculator.batchValidateEvents(events);
                    
                    // 输出事件结果表格
                    console.table(eventResults.map(r => ({
                        事件名: r.event,
                        EthersId: r.ethersId,
                        Interface: r.interface,
                        一致性: r.consistent ? '✅' : '❌'
                    })));
                    
                    // 统计事件结果
                    const consistentEventCount = eventResults.filter(r => r.consistent).length;
                    console.log(`📊 事件Topic汇总: 总事件数: ${events.length}, 一致结果: ${consistentEventCount}/${events.length}, 成功率: ${((consistentEventCount/events.length)*100).toFixed(1)}%\n`);
                }
                
                // 如果启用了数据库更新，则更新数据库
                if (config.abi.updateAbiToDb) {
                    console.log(`🧭 触发数据库更新: file=${abiFile}`);
                    await updateAbiToDatabase(abiFile, functions, events);
                } else {
                    console.log(`⚠️ 配置未开启updateAbiToDb，跳过数据库更新: file=${abiFile}`);
                }
                
                console.log('\n' + '='.repeat(60) + '\n');
                
            } catch (error) {
                console.error(`❌ 处理ABI文件 ${abiFile} 失败:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('ABI测试失败:', error);
    }
}

async function updateAbiToDatabase(abiFile, functions, events) {
    try {
        console.log('💾 === 更新ABI到数据库 ===');
        
        const calculator = new MethodIdCalculator();
        
        // 检查数据库连接
        if (!database.getPool()) {
            console.log('⚠️ 数据库连接不可用，跳过数据库更新');
            return;
        }
        
        // 解析合约字段（从ABI文件名提取）
        const contract = parseContractFromAbiFilename(abiFile);
        console.log(`📌 合约标识: ${contract}`);
        console.log(`📦 统计: functions=${functions.length}, events=${events.length}`);
        
        // 获取现有的ABI数据（按当前合约过滤）
        const existingAbis = await getExistingAbis(contract);
        console.log(`📊 数据库中现有ABI数量: ${existingAbis.length}`);
        
        // 预构建签名集合，分别用于函数与事件
        const existingFunctionSignatures = new Set(
            existingAbis.filter(a => a.method_type === 'function').map(a => (a.signature || '').trim())
        );
        const existingEventSignatures = new Set(
            existingAbis.filter(a => a.method_type === 'event').map(a => (a.signature || '').trim())
        );
        
        let addedCount = 0;
        let updatedCount = 0;
        
        // 处理函数
        for (const func of functions) {
            const signature = `${func.name}(${(func.inputs || []).map(input => input.type || 'string').join(',')})`.trim();
            const methodId = calculator.calculateMethodIdWithInterface(func);
            
            if (!existingFunctionSignatures.has(signature)) {
                await addAbiToDatabase(signature, 'function', methodId, contract, `From ${abiFile}`);
                console.log(`➕ 新增函数: ${signature} -> ${methodId}`);
                addedCount++;
                existingFunctionSignatures.add(signature);
            } else {
                console.log(`⏭️ 跳过已存在函数: ${signature}`);
            }
        }
        
        // 处理事件
        for (const event of events) {
            const eventSignature = `${event.name}(${(event.inputs || []).map(input => input.type || 'string').join(',')})`.trim();
            const topicHash = calculator.calculateTopicHashWithInterface(event);
            
            if (!existingEventSignatures.has(eventSignature)) {
                await addAbiToDatabase(eventSignature, 'event', topicHash, contract, `From ${abiFile}`);
                console.log(`➕ 新增事件: ${eventSignature} -> ${topicHash}`);
                addedCount++;
                existingEventSignatures.add(eventSignature);
            } else {
                console.log(`⏭️ 跳过已存在事件: ${eventSignature}`);
            }
        }
        
        console.log(`✅ 数据库更新完成: 新增 ${addedCount} 条, 更新 ${updatedCount} 条`);
        
    } catch (error) {
        console.error('❌ 数据库更新失败:', error.message);
    }
}

function parseContractFromAbiFilename(abiFile) {
    try {
        // 1) 优先提取 0x 开头的以太坊地址（40或64位hex）
        const addressMatch = abiFile.match(/0x[a-fA-F0-9]{40,64}/);
        if (addressMatch) {
            return addressMatch[0];
        }
        
        // 2) 去掉扩展名，尝试用常见分隔符截取
        const base = abiFile.replace(/\.[^.]+$/, '');
        const parts = base.split(/[@_\-\.]/).filter(Boolean);
        if (parts.length > 0) {
            return parts[parts.length - 1];
        }
        
        // 3) 兜底返回去扩展名的文件名
        return base;
    } catch (_) {
        return abiFile;
    }
}

async function getExistingAbis(contract) {
    try {
        const result = await database.query('SELECT * FROM a_monitor_abi WHERE contract = $1', [contract]);
        return result.rows || [];
    } catch (error) {
        console.error('获取现有ABI失败:', error.message);
        return [];
    }
}

async function addAbiToDatabase(signature, methodType, methodId, contract, label) {
    try {
        await database.query(
            'INSERT INTO a_monitor_abi (signature, method_type, method_id, contract, label) VALUES ($1, $2, $3, $4, $5)',
            [signature, methodType, methodId, contract, label]
        );
    } catch (error) {
        console.error('添加ABI到数据库失败:', error.message);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testMethodIdAndTopicCalculation()
        .then(() => {
            console.log('✅ 测试完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 测试失败:', error);
            process.exit(1);
        });
}

module.exports = {
    testMethodIdAndTopicCalculation,
    testABICalculation,
    updateAbiToDatabase
}; 