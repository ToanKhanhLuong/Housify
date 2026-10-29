// Routes cho module building (UC-12, UC-13, UC-14, UC-15, UC-23)
import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/requireRole.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ROLE } from "../../constants/enums.js";
import * as buildingController from "./building.controller.js";
import {
  createBuildingSchema,
  updateBuildingSchema,
  buildingIdParamSchema,
  updateFloorCountSchema,
  updateRulesSchema,
} from "./building.validation.js";

const router = Router();

// 1. Tạo tòa nhà (UC-12 - Chỉ Admin)
router.post(
  "/buildings",
  auth,
  requireRole(ROLE.ADMIN),
  validate(createBuildingSchema),
  buildingController.createBuilding,
);

// 2. Lấy danh sách tòa nhà (UC-13 - Admin xem hết, Manager xem tòa mình)
router.get(
  "/buildings",
  auth,
  requireRole(ROLE.ADMIN, ROLE.MANAGER),
  buildingController.getBuildings,
);

// 3. Lấy chi tiết tòa nhà (UC-13 - Admin xem hết, Manager xem tòa mình)
router.get(
  "/buildings/:id",
  auth,
  requireRole(ROLE.ADMIN, ROLE.MANAGER),
  validate(buildingIdParamSchema, "params"),
  buildingController.getBuildingById,
);

// 4. Cập nhật thông tin tòa nhà (UC-13 - Chỉ Admin)
router.put(
  "/buildings/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(buildingIdParamSchema, "params"),
  validate(updateBuildingSchema),
  buildingController.updateBuilding,
);

// 5. Xóa mềm tòa nhà (UC-14 - Chỉ Admin)
router.delete(
  "/buildings/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(buildingIdParamSchema, "params"),
  buildingController.deleteBuilding,
);

// 6. Lấy danh sách tầng và thống kê số phòng mỗi tầng (UC-15 - Admin xem hết, Manager xem tòa mình)
router.get(
  "/buildings/:id/floors",
  auth,
  requireRole(ROLE.ADMIN, ROLE.MANAGER),
  validate(buildingIdParamSchema, "params"),
  buildingController.getBuildingFloors,
);

// 7. Cập nhật số tầng / xóa tầng trên cùng (UC-15 - Chỉ Admin)
router.patch(
  "/buildings/:id/floor-count",
  auth,
  requireRole(ROLE.ADMIN),
  validate(buildingIdParamSchema, "params"),
  validate(updateFloorCountSchema),
  buildingController.updateFloorCount,
);

// 8. Lấy nội quy tòa nhà (UC-23 - Admin, Manager, Customer)
router.get(
  "/buildings/:id/rules",
  auth,
  requireRole(ROLE.ADMIN, ROLE.MANAGER, ROLE.CUSTOMER),
  validate(buildingIdParamSchema, "params"),
  buildingController.getBuildingRules,
);

// 9. Cập nhật / Ghi đè nội quy tòa nhà (UC-23 - Chỉ Admin)
router.put(
  "/buildings/:id/rules",
  auth,
  requireRole(ROLE.ADMIN),
  validate(buildingIdParamSchema, "params"),
  validate(updateRulesSchema),
  buildingController.updateBuildingRules,
);

export default router;
