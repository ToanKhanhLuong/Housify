// Routes cho module gemini: Trợ lý AI Housify
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { geminiChatSchema } from './gemini.validation.js';
import * as geminiController from './gemini.controller.js';

const router = Router();

// POST /api/gemini/chat - Trò chuyện với Trợ lý AI (Customer, Manager, Admin)
router.post(
    '/gemini/chat',
    auth,
    validate(geminiChatSchema),
    geminiController.chat,
);

export default router;
