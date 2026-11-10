// Job kết thúc hợp đồng khi hết hạn tự nhiên (UC-45) - chạy lúc 23:59 cuối ngày theo giờ Việt Nam
import cron from 'node-cron';
import { runContractExpiryJob } from '../modules/contract/contract.service.js';

let isRunning = false;

export const run = async () => {
    if (isRunning) {
        console.log('[Job contractExpiry] Đang chạy, bỏ qua lượt kích hoạt trùng.');
        return { skipped: true };
    }

    isRunning = true;
    const startedAt = Date.now();
    try {
        const result = await runContractExpiryJob(new Date());
        console.log(
            `[Job contractExpiry] Hoàn tất sau ${Date.now() - startedAt}ms (xử lý: ${result?.processedCount ?? 0})`,
        );
        return result;
    } finally {
        isRunning = false;
    }
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
        { timezone: 'Asia/Ho_Chi_Minh', noOverlap: true },
    );
};
