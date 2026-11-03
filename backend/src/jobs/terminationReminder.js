// Job nhắc xác nhận đơn chấm dứt thỏa thuận ngày 1, 3, 6 và tự động xác nhận sau 7 ngày (UC-28)
import cron from 'node-cron';
import { runTerminationReminderJob } from '../modules/termination/termination.service.js';

export const run = async () => {
    return runTerminationReminderJob(new Date());
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
        { timezone: 'Asia/Ho_Chi_Minh' },
    );
};
