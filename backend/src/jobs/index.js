// Đăng ký lịch chạy node-cron cho mọi job
// Bỏ comment từng dòng khi job tương ứng đã viết xong

// import { registerContractExpiryJob } from './contractExpiry.js';             // UC-45
// import { registerTerminationEffectiveJob } from './terminationEffective.js'; // UC-28, 29
// import { registerTerminationReminderJob } from './terminationReminder.js';
// import { registerPaymentReminderJob } from './paymentReminder.js';           // UC-49
// import { registerAccountAfterEndJob } from './accountAfterEnd.js';

export const startJobs = () => {
  // registerContractExpiryJob();
  // registerTerminationEffectiveJob();
  // registerTerminationReminderJob();
  // registerPaymentReminderJob();
  // registerAccountAfterEndJob();
};

export default startJobs;
