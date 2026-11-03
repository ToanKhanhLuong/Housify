// Khai báo routes cho module dev: chỉ bật khi ENABLE_DEV_ROUTES=true, chỉ Admin được gọi
import { Router } from 'express';
import { devOnly } from '../../middlewares/devOnly.middleware.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { ROLE } from '../../constants/enums.js';
import * as devController from './dev.controller.js';

const router = Router();

// POST /api/dev/jobs/:name/run (Role: Admin) – chạy 1 job cụ thể ngay lập tức
router.post(
    '/dev/jobs/:name/run',
    devOnly,
    auth,
    requireRole(ROLE.ADMIN),
    devController.runJob,
);

export default router;

