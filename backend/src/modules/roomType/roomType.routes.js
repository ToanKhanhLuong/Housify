// Routes cho module roomType (UC-20)
import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/requireRole.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ROLE } from "../../constants/enums.js";
import * as roomTypeController from "./roomType.controller.js";
import {
  createRoomTypeSchema,
  updateRoomTypeSchema,
  roomTypeIdParamSchema,
} from "./roomType.validation.js";

const router = Router();

// 1. Lấy danh sách loại phòng (UC-20 - Admin xem để quản lý, Manager xem để lọc phòng)
router.get(
  "/room-types",
  auth,
  requireRole(ROLE.ADMIN, ROLE.MANAGER),
  roomTypeController.getRoomTypes,
);

// 2. Lấy chi tiết một loại phòng (UC-20 - Chỉ Admin)
router.get(
  "/room-types/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(roomTypeIdParamSchema, "params"),
  roomTypeController.getRoomTypeById,
);

// 3. Tạo loại phòng mới (UC-20 - Chỉ Admin)
router.post(
  "/room-types",
  auth,
  requireRole(ROLE.ADMIN),
  validate(createRoomTypeSchema),
  roomTypeController.createRoomType,
);

// 4. Cập nhật tên loại phòng (UC-20 - Chỉ Admin)
router.put(
  "/room-types/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(roomTypeIdParamSchema, "params"),
  validate(updateRoomTypeSchema),
  roomTypeController.updateRoomType,
);

// 5. Xóa mềm loại phòng (UC-20 - Chỉ Admin)
router.delete(
  "/room-types/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(roomTypeIdParamSchema, "params"),
  roomTypeController.deleteRoomType,
);

export default router;

