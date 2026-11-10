// Job ngưng hoạt động hoặc khóa tài khoản người đại diện sau 24 giờ kể từ khi hợp đồng kết thúc (UC-28, UC-29, UC-45)
import cron from 'node-cron';
import { runAccountAfterEndJob } from '../modules/contract/contract.service.js';

let isRunning = false;

export const run = async () => {
    if (isRunning) {
        console.log('[Job accountAfterEnd] Đang chạy, bỏ qua lượt kích hoạt trùng.');
        return { skipped: true };
    }

    isRunning = true;
    const startedAt = Date.now();
    try {
        const result = await runAccountAfterEndJob(new Date());
        console.log(
            `[Job accountAfterEnd] Hoàn tất sau ${Date.now() - startedAt}ms (xử lý: ${result?.processedCount ?? 0})`,
        );
        return result;
    } finally {
        isRunning = false;
    }
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
        { timezone: 'Asia/Ho_Chi_Minh', noOverlap: true },
    );
};
