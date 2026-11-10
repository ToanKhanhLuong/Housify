// Khung đăng ký lịch chạy node-cron và chạy quét bù khi khởi động cho toàn bộ job hệ thống
import { AppError } from '../utils/AppError.js';
import { registerContractExpiryJob, run as runContractExpiry } from './contractExpiry.js';
import { registerTerminationEffectiveJob, run as runTerminationEffective } from './terminationEffective.js';
import { registerTerminationReminderJob, run as runTerminationReminder } from './terminationReminder.js';
import { registerPaymentReminderJob, run as runPaymentReminder } from './paymentReminder.js';
import { registerAccountAfterEndJob, run as runAccountAfterEnd } from './accountAfterEnd.js';

const STARTUP_CATCH_UP_DELAY_MS = 5000;
const BETWEEN_JOBS_PAUSE_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const JOB_RUNNERS = Object.freeze({
    terminationReminder: runTerminationReminder,
    terminationEffective: runTerminationEffective,
    contractExpiry: runContractExpiry,
    accountAfterEnd: runAccountAfterEnd,
    paymentReminder: runPaymentReminder,
});

let isCatchUpRunning = false;

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
 * Chạy một lượt quét bù toàn bộ job khi server khởi động.
 * Có khóa chống chạy đè và nhả nhịp event loop giữa các job để không chặn HTTP request trên Render Free.
 */
export const runStartupCatchUpJobs = async () => {
    if (isCatchUpRunning) {
        console.log('[Startup Catch-Up] Đang trong lượt quét bù, bỏ qua lần gọi trùng.');
        return;
    }

    isCatchUpRunning = true;
    const startedAt = Date.now();
    console.log('[Startup Catch-Up] Bắt đầu quét bù 5 job hệ thống...');

    const jobNames = [
        'terminationReminder',
        'terminationEffective',
        'contractExpiry',
        'accountAfterEnd',
        'paymentReminder',
    ];

    try {
        for (const name of jobNames) {
            try {
                await JOB_RUNNERS[name]();
            } catch (error) {
                console.error(`[Startup Job ${name}] Error:`, error.message);
            }
            // Nhả event loop giữa các job để Express xử lý mượt các HTTP request đang tới
            await sleep(BETWEEN_JOBS_PAUSE_MS);
        }
        console.log(`[Startup Catch-Up] Hoàn tất toàn bộ lượt quét bù sau ${Date.now() - startedAt}ms.`);
    } finally {
        isCatchUpRunning = false;
    }
};

export const startJobs = () => {
    registerContractExpiryJob();
    registerTerminationEffectiveJob();
    registerTerminationReminderJob();
    registerPaymentReminderJob();
    registerAccountAfterEndJob();

    console.log(
        `[Jobs] Đã đăng ký 5 lịch chạy cron. Lượt quét bù sẽ chạy ngầm sau ${STARTUP_CATCH_UP_DELAY_MS / 1000}s...`,
    );

    // Lùi thời điểm chạy quét bù để ưu tiên CPU và kết nối DB cho các HTTP request đầu tiên lúc Cold Start
    const timer = setTimeout(() => {
        runStartupCatchUpJobs().catch((error) => {
            console.error('[Startup Catch-Up] Unhandled error:', error.message);
        });
    }, STARTUP_CATCH_UP_DELAY_MS);

    if (typeof timer.unref === 'function') {
        timer.unref();
    }
};

export default startJobs;
