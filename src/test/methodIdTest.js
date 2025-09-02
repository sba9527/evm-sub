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
                    await updateAbiToDatabase(abiFile, functions, events);
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
        
        // 检查数据库连接
        if (!database.getPool()) {
            console.log('⚠️ 数据库连接不可用，跳过数据库更新');
            return;
        }
        
        // 获取现有的ABI数据
        const existingAbis = await getExistingAbis();
        console.log(`📊 数据库中现有ABI数量: ${existingAbis.length}`);
        
        let addedCount = 0;
        let updatedCount = 0;
        
        // 处理函数
        for (const func of functions) {
            const signature = `${func.name}(${(func.inputs || []).map(input => input.type || 'string').join(',')})`;
            const methodId = calculator.calculateMethodIdWithInterface(func);
            
            const existingAbi = existingAbis.find(abi => 
                abi.signature === signature && abi.method_type === 'function'
            );
            
            if (!existingAbi) {
                // 新增
                await addAbiToDatabase(signature, 'function', methodId, null, `From ${abiFile}`);
                addedCount++;
            }
        }
        
        // 处理事件
        for (const event of events) {
            const eventSignature = `${event.name}(${(event.inputs || []).map(input => input.type || 'string').join(',')})`;
            const topicHash = calculator.calculateTopicHashWithInterface(event);
            
            const existingAbi = existingAbis.find(abi => 
                abi.signature === eventSignature && abi.method_type === 'event'
            );
            
            if (!existingAbi) {
                // 新增
                await addAbiToDatabase(eventSignature, 'event', topicHash, null, `From ${abiFile}`);
                addedCount++;
            }
        }
        
        console.log(`✅ 数据库更新完成: 新增 ${addedCount} 条, 更新 ${updatedCount} 条`);
        
    } catch (error) {
        console.error('❌ 数据库更新失败:', error.message);
    }
}

async function getExistingAbis() {
    try {
        const result = await database.query('SELECT * FROM a_monitor_abi');
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