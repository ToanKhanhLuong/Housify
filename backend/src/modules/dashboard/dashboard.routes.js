// Khai báo routes cho module dashboard (UC-07, UC-47, UC-48)
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { ROLE } from '../../constants/enums.js';
import { adminDashboardSchema, reportSchema } from './dashboard.validation.js';
import * as dashboardController from './dashboard.controller.js';

const router = Router();

// UC-07: Admin xem tổng quan toàn hệ thống, lọc được theo tòa
router.get(
    '/dashboard/admin',
    auth,
    requireRole(ROLE.ADMIN),
    validate(adminDashboardSchema, 'query'),
    dashboardController.getAdminDashboard,
);

// UC-47: Manager xem tổng quan tòa mình phụ trách
router.get(
    '/dashboard/manager',
    auth,
    requireRole(ROLE.MANAGER),
    dashboardController.getManagerDashboard,
);

// UC-48: báo cáo theo kỳ. Admin lọc theo tòa, Manager chỉ xem tòa mình
router.get(
    '/reports',
    auth,
    requireRole(ROLE.ADMIN, ROLE.MANAGER),
    validate(reportSchema, 'query'),
    dashboardController.getReport,
);

export default router;
