// Khai báo routes cho module contract (UC-24)
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { ROLE } from '../../constants/enums.js';
import { createContractSchema, contractIdParamSchema } from './contract.validation.js';
import * as contractController from './contract.controller.js';

const router = Router();

// Yêu cầu đăng nhập và vai trò Manager cho việc tạo và gửi lại lời mời hợp đồng
router.use('/contracts', auth, requireRole(ROLE.MANAGER));

router.post('/contracts', validate(createContractSchema), contractController.createContract);
router.post(
    '/contracts/:id/resend-invite',
    validate(contractIdParamSchema, 'params'),
    contractController.resendInvite,
);

export default router;

