// Routes cho module invoice (UC-34, UC-35, UC-36, UC-37)
import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/requireRole.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ROLE } from "../../constants/enums.js";
import * as invoiceController from "./invoice.controller.js";
import {
  prefillQuerySchema,
  createInvoiceSchema,
  bulkCreateInvoiceSchema,
  updateInvoiceSchema,
  cancelInvoiceSchema,
  invoiceIdParamSchema,
  listInvoicesQuerySchema,
} from "./invoice.validation.js";

const router = Router();

// 1. Lấy dữ liệu gợi ý trước khi lập hóa đơn (UC-34 Prefill: chỉ Manager)
router.get(
  "/invoices/prefill",
  auth,
  requireRole(ROLE.MANAGER),
  validate(prefillQuerySchema, "query"),
  invoiceController.getPrefill,
);

// 2. Tạo hóa đơn hàng loạt (UC-34: chỉ Manager) - Đặt TRƯỚC /invoices/:id
router.post(
  "/invoices/bulk",
  auth,
  requireRole(ROLE.MANAGER),
  validate(bulkCreateInvoiceSchema),
  invoiceController.createBulkInvoices,
);

// 3. Tạo hóa đơn đơn lẻ (UC-34: chỉ Manager)
router.post(
  "/invoices",
  auth,
  requireRole(ROLE.MANAGER),
  validate(createInvoiceSchema),
  invoiceController.createInvoice,
);

// 4. Lấy danh sách hóa đơn (UC-36: Manager xem tòa mình, Customer xem phòng mình)
router.get(
  "/invoices",
  auth,
  requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
  validate(listInvoicesQuerySchema, "query"),
  invoiceController.getInvoices,
);

// 5. Lấy chi tiết hóa đơn (UC-36: Manager, Customer)
router.get(
  "/invoices/:id",
  auth,
  requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
  validate(invoiceIdParamSchema, "params"),
  invoiceController.getInvoiceById,
);

// 6. Cập nhật hóa đơn nháp (UC-34: chỉ Manager, chỉ khi còn DRAFT)
router.put(
  "/invoices/:id",
  auth,
  requireRole(ROLE.MANAGER),
  validate(invoiceIdParamSchema, "params"),
  validate(updateInvoiceSchema),
  invoiceController.updateInvoice,
);

// 7. Gửi hóa đơn cho khách (UC-35: chỉ Manager)
router.post(
  "/invoices/:id/send",
  auth,
  requireRole(ROLE.MANAGER),
  validate(invoiceIdParamSchema, "params"),
  invoiceController.sendInvoice,
);

// 8. Gửi lại thông báo cho hóa đơn PENDING (UC-35: chỉ Manager)
router.post(
  "/invoices/:id/resend-notification",
  auth,
  requireRole(ROLE.MANAGER),
  validate(invoiceIdParamSchema, "params"),
  invoiceController.resendNotification,
);

// 9. Hủy hóa đơn (UC-37: chỉ Manager)
router.post(
  "/invoices/:id/cancel",
  auth,
  requireRole(ROLE.MANAGER),
  validate(invoiceIdParamSchema, "params"),
  validate(cancelInvoiceSchema),
  invoiceController.cancelInvoice,
);

export default router;
