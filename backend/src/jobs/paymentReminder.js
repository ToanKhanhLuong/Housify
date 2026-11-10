// Job nhắc thanh toán hóa đơn theo mốc trước và sau hạn (UC-49)
import cron from 'node-cron';
import { runPaymentReminderJob } from '../modules/payment/paymentReminder.service.js';

let isRunning = false;

export const run = async () => {
    if (isRunning) {
        console.log('[Job paymentReminder] Đang chạy, bỏ qua lượt kích hoạt trùng.');
        return { skipped: true };
    }

    isRunning = true;
    const startedAt = Date.now();
    try {
        const result = await runPaymentReminderJob(new Date());
        console.log(
            `[Job paymentReminder] Hoàn tất sau ${Date.now() - startedAt}ms (quét: ${result?.scannedCount ?? 0}, nhắc: ${result?.remindedCount ?? 0})`,
        );
        return result;
    } finally {
        isRunning = false;
    }
};

export const registerPaymentReminderJob = () => {
    cron.schedule(
        '0 9 * * *',
        async () => {
            try {
                await run();
            } catch (error) {
                console.error('[Job paymentReminder] Error:', error.message);
            }
        },
        { timezone: 'Asia/Ho_Chi_Minh', noOverlap: true },
    );
};
