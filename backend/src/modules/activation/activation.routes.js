// Khai báo routes cho module activation: kích hoạt Manager (UC-08) và kích hoạt Customer (UC-06)
import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { activateManagerSchema, activateCustomerContractSchema } from './activation.validation.js';
import * as activationController from './activation.controller.js';

const router = Router();

// Không cần đăng nhập (công khai cho người nhận link qua email)
router.get('/activation/manager/:token', activationController.getManagerActivationInfo);
router.post('/activation/manager', validate(activateManagerSchema), activationController.activateManager);

router.get('/activation/contract/:token', activationController.getContractActivationInfo);
router.post('/activation/contract', validate(activateCustomerContractSchema), activationController.activateCustomerContract);

export default router;
