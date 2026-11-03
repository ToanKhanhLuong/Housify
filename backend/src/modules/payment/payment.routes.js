// Routes cho module payment (UC-38, UC-39, UC-42)
import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/requireRole.middleware.js";
import { sepayAuth } from "../../middlewares/sepayAuth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ROLE } from "../../constants/enums.js";
import * as paymentController from "./payment.controller.js";
import {
  sepayWebhookSchema,
  paymentHistoryQuerySchema,
} from "./payment.validation.js";

const router = Router();

// 1. Webhook nhận tiền từ SePay (UC-38, UC-42: xác thực bằng API key)
router.post(
  "/webhooks/sepay",
  sepayAuth,
  validate(sepayWebhookSchema),
  paymentController.handleSepayWebhook,
);

// 2. Lấy lịch sử thanh toán (UC-39: Manager xem tòa mình, Customer xem phòng mình)
router.get(
  "/payments",
  auth,
  requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
  validate(paymentHistoryQuerySchema, "query"),
  paymentController.getPayments,
);

export default router;
