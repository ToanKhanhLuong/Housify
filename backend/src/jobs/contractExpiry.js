// Job kết thúc hợp đồng khi hết hạn tự nhiên (UC-45)
import cron from 'node-cron';
import { runContractExpiryJob } from '../modules/contract/contract.service.js';

export const run = async () => {
    return runContractExpiryJob(new Date());
};

export const registerContractExpiryJob = () => {
    cron.schedule(
        '0 0 * * *',
        async () => {
            try {
                await run();
            } catch (error) {
                console.error('[Job contractExpiry] Error:', error.message);
            }
        },
        { timezone: 'Asia/Ho_Chi_Minh' },
    );
};
