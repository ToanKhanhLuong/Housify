// Controller cho module invoice (UC-34, UC-35, UC-36, UC-37)
import asyncHandler from "../../utils/asyncHandler.js";
import { ok, created } from "../../utils/response.js";
import * as invoiceService from "./invoice.service.js";

// 1. Lấy dữ liệu gợi ý trước khi lập hóa đơn (UC-34 Prefill)
export const getPrefill = asyncHandler(async (request, response) => {
  const result = await invoiceService.getPrefill(request.query, request.user);
  return ok(response, result, "Lấy thông tin khởi tạo hóa đơn thành công");
});

// 2. Tạo hóa đơn đơn lẻ (UC-34)
export const createInvoice = asyncHandler(async (request, response) => {
  const invoice = await invoiceService.createInvoice(
    request.body,
    request.user,
  );
  return created(response, invoice, "Tạo hóa đơn nháp thành công");
});

// 3. Tạo hóa đơn hàng loạt (UC-34)
export const createBulkInvoices = asyncHandler(async (request, response) => {
  const result = await invoiceService.createBulkInvoices(
    request.body,
    request.user,
  );
  return created(response, result, "Lập hóa đơn hàng loạt thành công");
});

// 4. Lấy danh sách hóa đơn (UC-36)
export const getInvoices = asyncHandler(async (request, response) => {
  const result = await invoiceService.getInvoices(request.query, request.user);
  return ok(response, result, "Lấy danh sách hóa đơn thành công");
});

// 5. Lấy chi tiết hóa đơn (UC-36)
export const getInvoiceById = asyncHandler(async (request, response) => {
  const invoice = await invoiceService.getInvoiceById(
    request.params.id,
    request.user,
  );
  return ok(response, invoice, "Lấy chi tiết hóa đơn thành công");
});

// 6. Cập nhật hóa đơn nháp (UC-34)
export const updateInvoice = asyncHandler(async (request, response) => {
  const invoice = await invoiceService.updateInvoice(
    request.params.id,
    request.body,
    request.user,
  );
  return ok(response, invoice, "Cập nhật hóa đơn thành công");
});

// 7. Gửi hóa đơn cho khách thuê (UC-35)
export const sendInvoice = asyncHandler(async (request, response) => {
  const { invoice, warning } = await invoiceService.sendInvoice(
    request.params.id,
    request.user,
  );
  // Gửi chuông / mail lỗi: hóa đơn vẫn PENDING, data.warning để FE hiện cảnh báo + nút gửi lại
  const message = warning || "Đã gửi hóa đơn thành công";
  return ok(response, { ...invoice, warning }, message);
});

// 8. Gửi lại thông báo cho hóa đơn PENDING (UC-35)
export const resendNotification = asyncHandler(async (request, response) => {
  const { invoice, warning } = await invoiceService.resendNotification(
    request.params.id,
    request.user,
  );
  const message = warning || "Gửi lại thông báo thành công";
  return ok(response, { ...invoice, warning }, message);
});

// 9. Hủy hóa đơn (UC-37)
export const cancelInvoice = asyncHandler(async (request, response) => {
  const invoice = await invoiceService.cancelInvoice(
    request.params.id,
    request.body,
    request.user,
  );
  return ok(response, invoice, "Hủy hóa đơn thành công");
});
