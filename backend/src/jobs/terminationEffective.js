// Job kết thúc hợp đồng khi đơn chấm dứt đã xác nhận đến ngày hiệu lực (UC-28, UC-29)
import cron from 'node-cron';
import { runTerminationEffectiveJob } from '../modules/termination/termination.service.js';

let isRunning = false;

export const run = async () => {
    if (isRunning) {
        console.log('[Job terminationEffective] Đang chạy, bỏ qua lượt kích hoạt trùng.');
        return { skipped: true };
    }

    isRunning = true;
    const startedAt = Date.now();
    try {
        const result = await runTerminationEffectiveJob(new Date());
        console.log(
            `[Job terminationEffective] Hoàn tất sau ${Date.now() - startedAt}ms (xử lý: ${result?.processedCount ?? 0})`,
        );
        return result;
    } finally {
        isRunning = false;
    }
};

export const registerTerminationEffectiveJob = () => {
    cron.schedule(
        '5 0 * * *',
        async () => {
            try {
                await run();
            } catch (error) {
                console.error('[Job terminationEffective] Error:', error.message);
            }
        },
        { timezone: 'Asia/Ho_Chi_Minh', noOverlap: true },
    );
};
