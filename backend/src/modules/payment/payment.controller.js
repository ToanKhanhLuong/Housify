// Controller cho module payment (UC-38, UC-39, UC-42)
import asyncHandler from "../../utils/asyncHandler.js";
import { ok } from "../../utils/response.js";
import * as paymentService from "./payment.service.js";

// 1. Nhận Webhook SePay báo tiền về (UC-38, UC-42)
export const handleSepayWebhook = asyncHandler(async (request, response) => {
  const result = await paymentService.processSepayWebhook(request.body);
  return ok(
    response,
    result,
    result.message || "Xử lý webhook SePay thành công",
  );
});

// 2. Lấy lịch sử thanh toán (UC-39)
export const getPayments = asyncHandler(async (request, response) => {
  const result = await paymentService.getPayments(request.query, request.user);
  return ok(response, result, "Lấy lịch sử thanh toán thành công");
});

// 3. Lấy chi tiết 1 biên lai thanh toán (UC-39)
export const getPaymentById = asyncHandler(async (request, response) => {
  const result = await paymentService.getPaymentById(request.params.id, request.user);
  return ok(response, result, "Lấy chi tiết biên lai thanh toán thành công");
});

// 3. Route Dev giả lập SePay báo tiền về ở local
export const simulateSepay = asyncHandler(async (request, response) => {
  const result = await paymentService.simulateSepay(request.body);
  return ok(response, result, "Giả lập SePay thành công");
});
