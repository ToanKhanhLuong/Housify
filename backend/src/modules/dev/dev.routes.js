// Routes cho module dev hỗ trợ test ở local
import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/requireRole.middleware.js";
import { devOnly } from "../../middlewares/devOnly.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ROLE } from "../../constants/enums.js";
import { sepaySimulateSchema } from "../payment/payment.validation.js";
import * as paymentController from "../payment/payment.controller.js";

const router = Router();

// Giả lập SePay báo tiền về ở local (UC-38: chỉ Admin, chỉ khi ENABLE_DEV_ROUTES = true)
router.post(
  "/dev/sepay-simulate",
  devOnly,
  auth,
  requireRole(ROLE.ADMIN),
  validate(sepaySimulateSchema),
  paymentController.simulateSepay,
);

export default router;
