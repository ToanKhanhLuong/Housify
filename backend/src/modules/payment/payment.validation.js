// Validation schema cho module payment (UC-38, UC-39, UC-42)
import Joi from "joi";

// 1. Schema kiểm tra Webhook do SePay gửi sang (UC-38)
export const sepayWebhookSchema = Joi.object({
  id: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().trim().min(1))
    .required()
    .messages({
      "any.required": "Thiếu mã giao dịch SePay (id)",
      "alternatives.match": "Mã giao dịch SePay (id) không hợp lệ",
    }),
  gateway: Joi.string().trim().min(1).required().messages({
    "any.required": "Thiếu tên ngân hàng (gateway)",
    "string.empty": "Thiếu tên ngân hàng (gateway)",
  }),
  transactionDate: Joi.string().trim().min(1).required().messages({
    "any.required": "Thiếu thời gian giao dịch (transactionDate)",
    "string.empty": "Thiếu thời gian giao dịch (transactionDate)",
  }),
  accountNumber: Joi.string().allow("", null).optional(),
  content: Joi.string().trim().allow("").default(""),
  transferType: Joi.string().valid("in", "out").optional(),
  transferAmount: Joi.number().greater(0).required().messages({
    "any.required": "Thiếu số tiền giao dịch (transferAmount)",
    "number.greater": "Số tiền giao dịch phải lớn hơn 0",
    "number.base": "Số tiền giao dịch phải là số hợp lệ",
  }),
  accumulated: Joi.number().optional(),
  subAccount: Joi.string().allow("", null).optional(),
  referenceCode: Joi.string().allow("", null).optional(),
  description: Joi.string().allow("", null).optional(),
}).unknown(true); // Cho phép các field phụ khác của SePay mà không báo lỗi

// 2. Schema lọc lịch sử thanh toán (UC-39): ?from=&to=&roomId=&page=&limit= (roomId chỉ Manager dùng)
export const paymentHistoryQuerySchema = Joi.object({
  roomId: Joi.string().hex().length(24).optional().messages({
    "string.hex": "Mã phòng (roomId) không hợp lệ",
    "string.length": "Mã phòng (roomId) không hợp lệ",
  }),
  from: Joi.date().iso().optional().messages({
    "date.format": "Ngày bắt đầu (from) phải có định dạng YYYY-MM-DD",
  }),
  to: Joi.date().iso().optional().messages({
    "date.format": "Ngày kết thúc (to) phải có định dạng YYYY-MM-DD",
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
})
  .custom((value, helpers) => {
    if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
      return helpers.error("any.invalid");
    }
    return value;
  })
  .messages({
    "any.invalid": "Ngày bắt đầu (from) không được lớn hơn ngày kết thúc (to)",
  });

// 3. Schema cho route Dev giả lập SePay: POST /api/dev/sepay-simulate
export const sepaySimulateSchema = Joi.object({
  invoiceCode: Joi.string().trim().required().messages({
    "string.empty": "Vui lòng cung cấp mã hóa đơn (invoiceCode)",
    "any.required": "Mã hóa đơn là bắt buộc",
  }),
  amount: Joi.number().min(1000).required().messages({
    "number.base": "Số tiền phải là số",
    "number.min": "Số tiền tối thiểu là 1.000 VNĐ",
    "any.required": "Vui lòng cung cấp số tiền chuyển",
  }),
});
