// Khai báo routes cho module announcement (UC-40)
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { ROLE } from '../../constants/enums.js';
import { listAnnouncementsSchema, sendAnnouncementSchema } from './announcement.validation.js';
import * as announcementController from './announcement.controller.js';

const router = Router();

// UC-40: Manager xem lịch sử các đợt thông báo chung đã gửi
router.get(
    '/announcements',
    auth,
    requireRole(ROLE.MANAGER),
    validate(listAnnouncementsSchema, 'query'),
    announcementController.listAnnouncements,
);

// UC-40: Manager gửi thông báo cho khách trong tòa mình
router.post(
    '/announcements',
    auth,
    requireRole(ROLE.MANAGER),
    validate(sendAnnouncementSchema),
    announcementController.sendAnnouncement,
);

export default router;

