// Job nhắc thanh toán hóa đơn theo mốc trước và sau hạn (UC-49)
import cron from 'node-cron';
import { runPaymentReminderJob } from '../modules/payment/paymentReminder.service.js';

export const run = async () => {
    return runPaymentReminderJob(new Date());
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
        { timezone: 'Asia/Ho_Chi_Minh' },
    );
};
