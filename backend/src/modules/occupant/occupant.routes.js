// Khai báo routes cho module occupant (UC-30, UC-31, UC-32, UC-33)
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { ROLE } from '../../constants/enums.js';
import {
    occupantIdParamSchema,
    contractIdParamSchema,
    listOccupantsSchema,
    updateOccupantSchema,
    addOccupantSchema,
    leaveOccupantSchema,
} from './occupant.validation.js';
import * as occupantController from './occupant.controller.js';

const router = Router();

// UC-30: Xem danh sách cư dân trong tòa của Manager
router.get(
    '/occupants',
    auth,
    requireRole(ROLE.MANAGER),
    validate(listOccupantsSchema, 'query'),
    occupantController.getOccupants,
);

// UC-30: Customer (người đại diện) xem danh sách thành viên trong hợp đồng ACTIVE của mình
router.get(
    '/me/room-members',
    auth,
    requireRole(ROLE.CUSTOMER),
    occupantController.getMyRoomMembers,
);

// UC-30: Xem chi tiết cư dân kèm link ảnh CCCD có chữ ký (Manager của tòa, Customer đại diện phòng)
router.get(
    '/occupants/:id',
    auth,
    requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
    validate(occupantIdParamSchema, 'params'),
    occupantController.getOccupantById,
);

// UC-31: Sửa thông tin cư dân (Manager của tòa, Customer đại diện phòng)
router.put(
    '/occupants/:id',
    auth,
    requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
    validate(occupantIdParamSchema, 'params'),
    validate(updateOccupantSchema),
    occupantController.updateOccupant,
);

// UC-32: Thêm người ở cùng vào hợp đồng đang hiệu lực (Manager)
router.post(
    '/contracts/:id/occupants',
    auth,
    requireRole(ROLE.MANAGER),
    validate(contractIdParamSchema, 'params'),
    validate(addOccupantSchema),
    occupantController.addOccupant,
);

// UC-33: Rút tên người ở cùng khỏi phòng (Manager)
router.patch(
    '/occupants/:id/leave',
    auth,
    requireRole(ROLE.MANAGER),
    validate(occupantIdParamSchema, 'params'),
    validate(leaveOccupantSchema),
    occupantController.leaveOccupant,
);

export default router;

