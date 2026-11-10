// Job nhắc xác nhận đơn chấm dứt thỏa thuận ngày 1, 3, 6 và tự động xác nhận sau 7 ngày (UC-28)
import cron from 'node-cron';
import { runTerminationReminderJob } from '../modules/termination/termination.service.js';

let isRunning = false;

export const run = async () => {
    if (isRunning) {
        console.log('[Job terminationReminder] Đang chạy, bỏ qua lượt kích hoạt trùng.');
        return { skipped: true };
    }

    isRunning = true;
    const startedAt = Date.now();
    try {
        const result = await runTerminationReminderJob(new Date());
        console.log(
            `[Job terminationReminder] Hoàn tất sau ${Date.now() - startedAt}ms (nhắc: ${result?.remindedCount ?? 0}, tự xác nhận: ${result?.autoConfirmedCount ?? 0})`,
        );
        return result;
    } finally {
        isRunning = false;
    }
};

export const registerTerminationReminderJob = () => {
    cron.schedule(
        '0 8 * * *',
        async () => {
            try {
                await run();
            } catch (error) {
                console.error('[Job terminationReminder] Error:', error.message);
            }
        },
        { timezone: 'Asia/Ho_Chi_Minh', noOverlap: true },
    );
};
