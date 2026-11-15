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

// Danh sách 5 job định kỳ của hệ thống ánh xạ theo tên
export const JOB_RUNNERS = Object.freeze({
    terminationReminder: runTerminationReminder,
    terminationEffective: runTerminationEffective,
    contractExpiry: runContractExpiry,
    accountAfterEnd: runAccountAfterEnd,
    paymentReminder: runPaymentReminder,
});

let isCatchUpRunning = false;

// Chạy ngay một job cụ thể theo tên (dùng cho API dev test và lúc quét bù khi khởi động)
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

// Quét bù 5 job theo đúng thứ tự nghiệp vụ khi server khởi động lại:
// 1. Nhắc hoặc tự xác nhận đơn chấm dứt sau 7 ngày -> 2. Kết thúc hợp đồng có đơn đến hạn hiệu lực ->
// 3. Kết thúc hợp đồng hết hạn tự nhiên -> 4. Khóa hoặc ngưng hoạt động tài khoản sau 24h -> 5. Nhắc hóa đơn
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

// Đăng ký lịch chạy cron hằng ngày cho cả 5 job và hẹn chạy quét bù sau khi server lên 5 giây
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
