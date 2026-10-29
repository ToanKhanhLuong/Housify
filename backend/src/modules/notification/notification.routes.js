// Khai báo routes cho module notification (UC-41) – mọi role, chỉ thông báo của chính mình
import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { listNotificationsSchema } from './notification.validation.js';
import * as notificationController from './notification.controller.js';

const router = Router();

// Đường dẫn cố định khai báo trước đường dẫn có :id
router.get('/notifications', auth, validate(listNotificationsSchema, 'query'), notificationController.getMyNotifications);
router.get('/notifications/unread-count', auth, notificationController.getUnreadCount);
router.patch('/notifications/read-all', auth, notificationController.markAllAsRead);
router.patch('/notifications/:id/read', auth, notificationController.markAsRead);

export default router;
