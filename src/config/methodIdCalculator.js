const ethers = require('ethers');
const logger = require('../utils/logger');

class MethodIdCalculator {
    constructor() {
        this.ethers = ethers;
    }

    // 构建函数签名
    buildFunctionSignature(func) {
        if (!func || !func.name) {
            return '';
        }

        const inputs = func.inputs || [];
        const inputTypes = inputs.map(input => input.type || 'string').join(',');
        return `${func.name}(${inputTypes})`;
    }

    // 构建事件签名
    buildEventSignature(event) {
        if (!event || !event.name) {
            return '';
        }

        const inputs = event.inputs || [];
        const inputTypes = inputs.map(input => input.type || 'string').join(',');
        return `${event.name}(${inputTypes})`;
    }

    // 方式1: 使用ethers.keccak256计算methodId
    calculateMethodIdWithKeccak256(signature) {
        try {
            if (!signature) return '';
            
            // 将签名转换为UTF-8字节
            const signatureBytes = ethers.toUtf8Bytes(signature);
            
            // 计算Keccak256哈希
            const hash = ethers.keccak256(signatureBytes);
            
            // 返回前4个字节（8个十六进制字符）
            return hash.slice(0, 10);
        } catch (error) {
            logger.error('Keccak256计算methodId失败:', error.message);
            return '';
        }
    }

    // 方式2: 使用ethers.Interface计算methodId
    calculateMethodIdWithInterface(func) {
        try {
            if (!func || !func.name) return '';
            
            // 创建Interface实例
            const iface = new ethers.Interface([func]);
            
            // 获取函数选择器（methodId）
            const methodId = iface.getFunction(func.name).selector;
            
            return methodId;
        } catch (error) {
            logger.error('Interface计算methodId失败:', error.message);
            return '';
        }
    }

    // 方式1: 使用ethers.utils.id计算topic hash
    calculateTopicHashWithId(eventSignature) {
        try {
            if (!eventSignature) return '';
            
            // 使用ethers.utils.id计算topic hash
            const topicHash = ethers.id(eventSignature);
            
            return topicHash;
        } catch (error) {
            logger.error('ethers.id计算topic hash失败:', error.message);
            return '';
        }
    }

    // 方式2: 使用ethers.Interface计算topic hash
    calculateTopicHashWithInterface(event) {
        try {
            if (!event || !event.name) return '';
            
            // 创建Interface实例
            const iface = new ethers.Interface([event]);
            
            // 获取事件topic hash
            const topicHash = iface.getEvent(event.name).topicHash;
            
            return topicHash;
        } catch (error) {
            logger.error('Interface计算topic hash失败:', error.message);
            return '';
        }
    }

    // 验证两种方法的结果是否一致
    validateMethodId(signature, func) {
        const keccakResult = this.calculateMethodIdWithKeccak256(signature);
        const interfaceResult = this.calculateMethodIdWithInterface(func);
        
        return {
            signature,
            keccak256: keccakResult,
            interface: interfaceResult,
            consistent: keccakResult === interfaceResult
        };
    }

    // 验证两种方法的结果是否一致
    validateTopicHash(eventSignature, event) {
        const idResult = this.calculateTopicHashWithId(eventSignature);
        const interfaceResult = this.calculateTopicHashWithInterface(event);
        
        return {
            eventSignature,
            ethersId: idResult,
            interface: interfaceResult,
            consistent: idResult === interfaceResult
        };
    }

    // 批量验证函数
    batchValidateFunctions(functions) {
        const results = [];
        
        for (const func of functions) {
            const signature = this.buildFunctionSignature(func);
            const result = this.validateMethodId(signature, func);
            results.push({
                function: func.name,
                ...result
            });
        }
        
        return results;
    }

    // 批量验证事件
    batchValidateEvents(events) {
        const results = [];
        
        for (const event of events) {
            const eventSignature = this.buildEventSignature(event);
            const result = this.validateTopicHash(eventSignature, event);
            results.push({
                event: event.name,
                ...result
            });
        }
        
        return results;
    }
}

module.exports = MethodIdCalculator; 