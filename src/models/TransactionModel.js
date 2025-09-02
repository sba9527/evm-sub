const logger = require('../utils/logger');
const database = require('../config/database');

class TransactionModel {
    // 保存区块数据
    static async saveBlockData(blockData) {
        try {
            if (database.isTestMode) {
                logger.info('🔧 测试模式：跳过保存区块数据');
                return true;
            }

            const pool = database.getPool();
            if (!pool) {
                throw new Error('数据库连接池不可用');
            }

            const query = `
                INSERT INTO blocks (hash, number, timestamp, parent_hash, nonce, difficulty, gas_limit, gas_used, miner, extra_data, chain)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (hash) DO NOTHING
            `;

            const values = [
                blockData.hash,
                blockData.number,
                blockData.timestamp,
                blockData.parentHash,
                blockData.nonce,
                blockData.difficulty,
                blockData.gasLimit,
                blockData.gasUsed,
                blockData.miner,
                blockData.extraData,
                blockData.chain
            ];

            await pool.query(query, values);
            logger.info(`✅ 区块数据保存成功: ${blockData.number}`);
            return true;
        } catch (error) {
            logger.error('保存区块数据失败:', error.message);
            return false;
        }
    }

    // 保存交易数据
    static async saveTransactionData(txData) {
        try {
            if (database.isTestMode) {
                logger.info('🔧 测试模式：跳过保存交易数据');
                return true;
            }

            const pool = database.getPool();
            if (!pool) {
                throw new Error('数据库连接池不可用');
            }

            const query = `
                INSERT INTO transactions (hash, block_hash, block_number, from_address, to_address, value, gas_price, gas_limit, gas_used, nonce, input_data, method_id, chain, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (hash) DO NOTHING
            `;

            const values = [
                txData.hash,
                txData.blockHash,
                txData.blockNumber,
                txData.from,
                txData.to,
                txData.value,
                txData.gasPrice,
                txData.gasLimit,
                txData.gasUsed,
                txData.nonce,
                txData.inputData,
                txData.methodId,
                txData.chain,
                txData.status
            ];

            await pool.query(query, values);
            logger.info(`✅ 交易数据保存成功: ${txData.hash}`);
            return true;
        } catch (error) {
            logger.error('保存交易数据失败:', error.message);
            return false;
        }
    }

    // 保存转账记录
    static async saveTransfer(transferData) {
        try {
            if (database.isTestMode) {
                logger.info('🔧 测试模式：跳过保存转账记录');
                return true;
            }

            const pool = database.getPool();
            if (!pool) {
                throw new Error('数据库连接池不可用');
            }

            const query = `
                INSERT INTO transfers (tx_hash, from_address, to_address, value, token_address, token_symbol, decimals, chain, transfer_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (tx_hash, from_address, to_address) DO NOTHING
            `;

            const values = [
                transferData.txHash,
                transferData.from,
                transferData.to,
                transferData.value,
                transferData.tokenAddress,
                transferData.tokenSymbol,
                transferData.decimals,
                transferData.chain,
                transferData.transferType
            ];

            await pool.query(query, values);
            return true;
        } catch (error) {
            logger.error('保存转账记录失败:', error.message);
            return false;
        }
    }

    // 保存交换记录
    static async saveSwap(swapData) {
        try {
            if (database.isTestMode) {
                logger.info('🔧 测试模式：跳过保存交换记录');
                return true;
            }

            const pool = database.getPool();
            if (!pool) {
                throw new Error('数据库连接池不可用');
            }

            const query = `
                INSERT INTO swaps (tx_hash, from_address, to_address, token_in, token_out, amount_in, amount_out, dex_name, router_address, method_id, chain, swap_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (tx_hash) DO NOTHING
            `;

            const values = [
                swapData.txHash,
                swapData.from,
                swapData.to,
                swapData.tokenIn,
                swapData.tokenOut,
                swapData.amountIn,
                swapData.amountOut,
                swapData.dexName,
                swapData.routerAddress,
                swapData.methodId,
                swapData.chain,
                swapData.swapType
            ];

            await pool.query(query, values);
            logger.info(`✅ 交换记录保存成功: ${swapData.txHash}`);
            return true;
        } catch (error) {
            logger.error('保存交换记录失败:', error.message);
            return false;
        }
    }

    // 批量保存转账记录
    static async batchSaveTransfers(transfers) {
        if (!transfers || transfers.length === 0) {
            return true;
        }

        try {
            if (database.isTestMode) {
                logger.info(`🔧 测试模式：跳过保存 ${transfers.length} 条转账记录`);
                return true;
            }

            const pool = database.getPool();
            if (!pool) {
                throw new Error('数据库连接池不可用');
            }

            // 使用事务批量插入
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                for (const transfer of transfers) {
                    await this.saveTransfer(transfer);
                }

                await client.query('COMMIT');
                logger.info(`✅ 批量保存转账记录成功: ${transfers.length} 条`);
                return true;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            logger.error('批量保存转账记录失败:', error.message);
            return false;
        }
    }

    // 批量保存交换记录
    static async batchSaveSwaps(swaps) {
        if (!swaps || swaps.length === 0) {
            return true;
        }

        try {
            if (database.isTestMode) {
                logger.info(`🔧 测试模式：跳过保存 ${swaps.length} 条交换记录`);
                return true;
            }

            const pool = database.getPool();
            if (!pool) {
                throw new Error('数据库连接池不可用');
            }

            // 使用事务批量插入
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                for (const swap of swaps) {
                    await this.saveSwap(swap);
                }

                await client.query('COMMIT');
                logger.info(`✅ 批量保存交换记录成功: ${swaps.length} 条`);
                return true;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            logger.error('批量保存交换记录失败:', error.message);
            return false;
        }
    }
}

module.exports = TransactionModel; 