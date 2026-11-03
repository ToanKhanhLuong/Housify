// Job kết thúc hợp đồng khi đơn chấm dứt đã xác nhận đến ngày hiệu lực (UC-28, UC-29)
import cron from 'node-cron';
import { runTerminationEffectiveJob } from '../modules/termination/termination.service.js';

export const run = async () => {
    return runTerminationEffectiveJob(new Date());
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
        { timezone: 'Asia/Ho_Chi_Minh' },
    );
};
