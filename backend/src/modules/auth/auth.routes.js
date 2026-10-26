// Khai báo routes cho module auth (UC-01, UC-03)
import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { loginSchema, changePasswordSchema } from './auth.validation.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/auth/login', validate(loginSchema), authController.login);
router.get('/auth/me', auth, authController.getMe);
router.put('/auth/change-password', auth, validate(changePasswordSchema), authController.changePassword);

export default router;
