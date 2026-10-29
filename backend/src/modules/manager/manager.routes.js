// Khai báo routes cho module manager (UC-08, UC-09, UC-10, UC-11) – chỉ Admin (BR-024)
// :id ở /managers/:id và managerId ở /buildings/:id/manager đều là _id của users
import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { ROLE } from '../../constants/enums.js';
import {
    createManagerSchema,
    listManagersSchema,
    updateManagerSchema,
    lockManagerSchema,
    assignManagerSchema,
} from './manager.validation.js';
import * as managerController from './manager.controller.js';

const router = Router();

router.post('/managers', auth, requireRole(ROLE.ADMIN), validate(createManagerSchema), managerController.createManager);
router.get('/managers', auth, requireRole(ROLE.ADMIN), validate(listManagersSchema, 'query'), managerController.listManagers);
router.get('/managers/:id', auth, requireRole(ROLE.ADMIN), managerController.getManager);
router.put('/managers/:id', auth, requireRole(ROLE.ADMIN), validate(updateManagerSchema), managerController.updateManager);
router.delete('/managers/:id', auth, requireRole(ROLE.ADMIN), managerController.deleteManager);
router.post('/managers/:id/resend-activation', auth, requireRole(ROLE.ADMIN), managerController.resendActivation);
router.patch('/managers/:id/lock', auth, requireRole(ROLE.ADMIN), validate(lockManagerSchema), managerController.lockManager);
router.patch('/managers/:id/unlock', auth, requireRole(ROLE.ADMIN), managerController.unlockManager);

// Phân công tòa (UC-11) – đặt ở module manager, không đụng module building
router.put('/buildings/:id/manager', auth, requireRole(ROLE.ADMIN), validate(assignManagerSchema), managerController.assignManager);

export default router;
