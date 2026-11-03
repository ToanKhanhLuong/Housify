// Job ngưng hoạt động hoặc khóa tài khoản người đại diện sau 24 giờ kể từ khi hợp đồng kết thúc (UC-28, UC-29, UC-45)
import cron from 'node-cron';
import { runAccountAfterEndJob } from '../modules/contract/contract.service.js';

export const run = async () => {
    return runAccountAfterEndJob(new Date());
};

export const registerAccountAfterEndJob = () => {
    cron.schedule(
        '30 0 * * *',
        async () => {
            try {
                await run();
            } catch (error) {
                console.error('[Job accountAfterEnd] Error:', error.message);
            }
        },
        { timezone: 'Asia/Ho_Chi_Minh' },
    );
};
