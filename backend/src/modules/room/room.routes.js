// Routes cho module room (UC-16, UC-17, UC-18, UC-19)
import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/requireRole.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ROLE } from "../../constants/enums.js";
import * as roomController from "./room.controller.js";
import {
  buildingIdParamSchema,
  roomIdParamSchema,
  listRoomsQuerySchema,
  createRoomSchema,
  updateRoomSchema,
} from "./room.validation.js";

const router = Router();

// 1. Lấy danh sách phòng của một tòa (UC-19 - Admin xem mọi tòa, Manager xem tòa mình)
router.get(
  "/buildings/:buildingId/rooms",
  auth,
  requireRole(ROLE.ADMIN, ROLE.MANAGER),
  validate(buildingIdParamSchema, "params"),
  validate(listRoomsQuerySchema, "query"),
  roomController.getRooms,
);

// 2. Tạo phòng trong tòa (UC-16 - Chỉ Admin)
router.post(
  "/buildings/:buildingId/rooms",
  auth,
  requireRole(ROLE.ADMIN),
  validate(buildingIdParamSchema, "params"),
  validate(createRoomSchema),
  roomController.createRoom,
);

// 3. Lấy chi tiết phòng (UC-19 - Admin xem mọi phòng, Manager xem phòng tòa mình)
router.get(
  "/rooms/:id",
  auth,
  requireRole(ROLE.ADMIN, ROLE.MANAGER),
  validate(roomIdParamSchema, "params"),
  roomController.getRoomById,
);

// 4. Cập nhật phòng (UC-17 - Chỉ Admin)
router.put(
  "/rooms/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(roomIdParamSchema, "params"),
  validate(updateRoomSchema),
  roomController.updateRoom,
);

// 5. Xóa mềm phòng (UC-18 - Chỉ Admin)
router.delete(
  "/rooms/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(roomIdParamSchema, "params"),
  roomController.deleteRoom,
);

export default router;
