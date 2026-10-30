// Routes cho module service (UC-21, UC-22) – chỉ Admin
import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/requireRole.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ROLE } from "../../constants/enums.js";
import * as serviceController from "./service.controller.js";
import {
  serviceIdParamSchema,
  buildingIdParamSchema,
  createServiceSchema,
  updateServiceSchema,
  savePriceSchema,
} from "./service.validation.js";

const router = Router();

// 1. Lấy danh sách dịch vụ (UC-21)
router.get(
  "/services",
  auth,
  requireRole(ROLE.ADMIN),
  serviceController.getServices,
);

// 2. Thêm dịch vụ (UC-21)
router.post(
  "/services",
  auth,
  requireRole(ROLE.ADMIN),
  validate(createServiceSchema),
  serviceController.createService,
);

// 3. Sửa dịch vụ (UC-21)
router.put(
  "/services/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(serviceIdParamSchema, "params"),
  validate(updateServiceSchema),
  serviceController.updateService,
);

// 4. Xóa mềm dịch vụ (UC-21)
router.delete(
  "/services/:id",
  auth,
  requireRole(ROLE.ADMIN),
  validate(serviceIdParamSchema, "params"),
  serviceController.deleteService,
);

// 5. Lịch sử giá dịch vụ của tòa (UC-22)
router.get(
  "/buildings/:id/service-prices",
  auth,
  requireRole(ROLE.ADMIN),
  validate(buildingIdParamSchema, "params"),
  serviceController.getServicePrices,
);

// 6. Thêm hoặc sửa một mức giá (UC-22)
router.post(
  "/buildings/:id/service-prices",
  auth,
  requireRole(ROLE.ADMIN),
  validate(buildingIdParamSchema, "params"),
  validate(savePriceSchema),
  serviceController.saveServicePrice,
);

export default router;
