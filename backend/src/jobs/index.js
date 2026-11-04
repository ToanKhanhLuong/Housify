// Khung đăng ký lịch chạy node-cron và chạy quét bù khi khởi động cho toàn bộ job hệ thống
import { AppError } from '../utils/AppError.js';
import { registerContractExpiryJob, run as runContractExpiry } from './contractExpiry.js';
import { registerTerminationEffectiveJob, run as runTerminationEffective } from './terminationEffective.js';
import { registerTerminationReminderJob, run as runTerminationReminder } from './terminationReminder.js';
import { registerPaymentReminderJob, run as runPaymentReminder } from './paymentReminder.js';
import { registerAccountAfterEndJob, run as runAccountAfterEnd } from './accountAfterEnd.js';

export const JOB_RUNNERS = Object.freeze({
    terminationReminder: runTerminationReminder,
    terminationEffective: runTerminationEffective,
    contractExpiry: runContractExpiry,
    accountAfterEnd: runAccountAfterEnd,
    paymentReminder: runPaymentReminder,
});

/**
 * Chạy 1 job cụ thể theo tên (phục vụ POST /api/dev/jobs/:name/run và chạy quét bù lúc khởi động)
 */
export const runJobByName = async (jobName) => {
    const runner = JOB_RUNNERS[jobName];
    if (!runner) {
        throw new AppError(
            `Không tìm thấy job "${jobName}". Các job hợp lệ: ${Object.keys(JOB_RUNNERS).join(', ')}`,
            404,
        );
    }

    const result = await runner();
    return {
        jobName,
        executedAt: new Date(),
        result,
    };
};

/**
 * Chạy một lượt quét bù toàn bộ job khi server khởi động
 */
export const runStartupCatchUpJobs = async () => {
    const jobNames = [
        'terminationReminder',
        'terminationEffective',
        'contractExpiry',
        'accountAfterEnd',
        'paymentReminder',
    ];

    for (const name of jobNames) {
        try {
            await JOB_RUNNERS[name]();
        } catch (error) {
            console.error(`[Startup Job ${name}] Error:`, error.message);
        }
    }
};

export const startJobs = () => {
    registerContractExpiryJob();
    registerTerminationEffectiveJob();
    registerTerminationReminderJob();
    registerPaymentReminderJob();
    registerAccountAfterEndJob();

    // Chạy một lượt quét bù ngay khi server khởi động
    runStartupCatchUpJobs();
};

export default startJobs;
