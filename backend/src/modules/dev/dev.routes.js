// Khai báo routes cho module dev: chỉ bật khi ENABLE_DEV_ROUTES=true, chỉ Admin được gọi
import { Router } from 'express';
import { devOnly } from '../../middlewares/devOnly.middleware.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { ROLE } from '../../constants/enums.js';
import * as devController from './dev.controller.js';
import { sepaySimulateSchema } from '../payment/payment.validation.js';
import * as paymentController from '../payment/payment.controller.js';

const router = Router();

// POST /api/dev/jobs/:name/run (Role: Admin) – chạy 1 job cụ thể ngay lập tức
router.post(
    '/dev/jobs/:name/run',
    devOnly,
    auth,
    requireRole(ROLE.ADMIN),
    devController.runJob,
);

// POST /api/dev/sepay-simulate (Role: Admin) – giả lập SePay báo tiền về ở local (UC-38)
router.post(
    '/dev/sepay-simulate',
    devOnly,
    auth,
    requireRole(ROLE.ADMIN),
    validate(sepaySimulateSchema),
    paymentController.simulateSepay,
);

export default router;
