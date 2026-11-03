// Job nhắc thanh toán hóa đơn theo mốc trước và sau hạn (UC-49 – khung chờ module invoice gắn hàm service)
import cron from 'node-cron';

export const run = async () => {
    return {
        processedCount: 0,
        note: 'Chờ gắn hàm service nhắc thanh toán hóa đơn (UC-49)',
    };
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
