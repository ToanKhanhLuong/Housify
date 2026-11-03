// Khai báo routes cho module contract (UC-24..27, UC-46)
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { ROLE } from '../../constants/enums.js';
import {
    contractIdParamSchema,
    listContractsSchema,
    createContractSchema,
    updateContractSchema,
    renewContractSchema,
    cancelContractSchema,
} from './contract.validation.js';
import * as contractController from './contract.controller.js';

const router = Router();

router.use('/contracts', auth);

// UC-25: Xem danh sách & chi tiết hợp đồng (Manager, Customer)
router.get(
    '/contracts',
    requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
    validate(listContractsSchema, 'query'),
    contractController.getContracts,
);

router.get(
    '/contracts/:id',
    requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
    validate(contractIdParamSchema, 'params'),
    contractController.getContractById,
);

// UC-24: Tạo hợp đồng nháp & gửi lại lời mời (Manager)
router.post(
    '/contracts',
    requireRole(ROLE.MANAGER),
    validate(createContractSchema),
    contractController.createContract,
);

router.post(
    '/contracts/:id/resend-invite',
    requireRole(ROLE.MANAGER),
    validate(contractIdParamSchema, 'params'),
    contractController.resendInvite,
);

// UC-26: Sửa hợp đồng (Manager)
router.put(
    '/contracts/:id',
    requireRole(ROLE.MANAGER),
    validate(contractIdParamSchema, 'params'),
    validate(updateContractSchema),
    contractController.updateContract,
);

// UC-27: Gia hạn hợp đồng (Manager)
router.post(
    '/contracts/:id/renew',
    requireRole(ROLE.MANAGER),
    validate(contractIdParamSchema, 'params'),
    validate(renewContractSchema),
    contractController.renewContract,
);

// UC-46: Hủy hợp đồng nháp (Manager)
router.post(
    '/contracts/:id/cancel',
    requireRole(ROLE.MANAGER),
    validate(contractIdParamSchema, 'params'),
    validate(cancelContractSchema),
    contractController.cancelDraftContract,
);

export default router;
