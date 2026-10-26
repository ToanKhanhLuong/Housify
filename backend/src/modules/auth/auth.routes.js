// Khai báo routes cho module auth (UC-01, UC-03, UC-04)
import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { loginSchema, changePasswordSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } from './auth.validation.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/auth/login', validate(loginSchema), authController.login);
router.get('/auth/me', auth, authController.getMe);
router.put('/auth/change-password', auth, validate(changePasswordSchema), authController.changePassword);
router.post('/auth/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/auth/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
