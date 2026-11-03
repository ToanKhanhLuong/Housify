// Job kết thúc hợp đồng khi hết hạn tự nhiên (UC-45) - chạy lúc 23:59 cuối ngày theo giờ Việt Nam
import cron from 'node-cron';
import { runContractExpiryJob } from '../modules/contract/contract.service.js';

export const run = async () => {
    return runContractExpiryJob(new Date());
};

export const registerContractExpiryJob = () => {
    cron.schedule(
        '59 23 * * *',
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
