// Khai báo routes cho module termination (UC-28, UC-29)
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { ROLE } from '../../constants/enums.js';
import {
    contractIdParamSchema,
    terminationIdParamSchema,
    listTerminationsSchema,
    createTerminationSchema,
    confirmTerminationSchema,
    rejectTerminationSchema,
    cancelTerminationSchema,
} from './termination.validation.js';
import * as terminationController from './termination.controller.js';

const router = Router();

// UC-28, UC-29: Manager tạo đơn chấm dứt trên hợp đồng ACTIVE
router.post(
    '/contracts/:id/terminations',
    auth,
    requireRole(ROLE.MANAGER),
    validate(contractIdParamSchema, 'params'),
    validate(createTerminationSchema),
    terminationController.createTermination,
);

// UC-28, UC-29: Xem danh sách đơn chấm dứt (Admin, Manager, Customer)
router.get(
    '/terminations',
    auth,
    requireRole(ROLE.ADMIN, ROLE.MANAGER, ROLE.CUSTOMER),
    validate(listTerminationsSchema, 'query'),
    terminationController.getTerminations,
);

// UC-28, UC-29: Xem chi tiết đơn chấm dứt kèm xác nhận điện tử (Admin, Manager, Customer)
router.get(
    '/terminations/:id',
    auth,
    requireRole(ROLE.ADMIN, ROLE.MANAGER, ROLE.CUSTOMER),
    validate(terminationIdParamSchema, 'params'),
    terminationController.getTerminationById,
);

// UC-28: Customer (người đại diện) xác nhận đơn chấm dứt hai bên thỏa thuận
router.post(
    '/terminations/:id/confirm',
    auth,
    requireRole(ROLE.CUSTOMER),
    validate(terminationIdParamSchema, 'params'),
    validate(confirmTerminationSchema),
    terminationController.confirmTermination,
);

// UC-29: Admin phê duyệt đơn chấm dứt đơn phương
router.post(
    '/terminations/:id/approve',
    auth,
    requireRole(ROLE.ADMIN),
    validate(terminationIdParamSchema, 'params'),
    terminationController.approveTermination,
);

// UC-29: Admin từ chối đơn chấm dứt đơn phương
router.post(
    '/terminations/:id/reject',
    auth,
    requireRole(ROLE.ADMIN),
    validate(terminationIdParamSchema, 'params'),
    validate(rejectTerminationSchema),
    terminationController.rejectTermination,
);

// UC-28, UC-29: Manager hủy đơn chấm dứt khi còn PENDING
router.post(
    '/terminations/:id/cancel',
    auth,
    requireRole(ROLE.MANAGER),
    validate(terminationIdParamSchema, 'params'),
    validate(cancelTerminationSchema),
    terminationController.cancelTermination,
);

export default router;

