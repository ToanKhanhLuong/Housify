// Khai báo routes cho module activation: kích hoạt Manager (UC-08 bước 6–8)
import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { activateManagerSchema } from './activation.validation.js';
import * as activationController from './activation.controller.js';

const router = Router();

// Không cần đăng nhập (công khai cho người nhận link qua email)
router.get('/activation/manager/:token', activationController.getManagerActivationInfo);
router.post('/activation/manager', validate(activateManagerSchema), activationController.activateManager);

export default router;

