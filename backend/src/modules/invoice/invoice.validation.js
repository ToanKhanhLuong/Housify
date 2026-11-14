// Validation schema cho module invoice (UC-34, UC-35, UC-36, UC-37)
import Joi from "joi";
import {
  INVOICE_ITEM_TYPE,
  INVOICE_STATUS,
  values,
} from "../../constants/enums.js";
import { OBJECT_ID_REGEX, commaSeparatedEnum } from "../../helpers/filter.js";

// Helper kiểm tra định dạng ObjectId (24 ký tự hex)
const objectIdField = (fieldName) =>
  Joi.string()
    .pattern(OBJECT_ID_REGEX)
    .messages({
      "string.pattern.base": `${fieldName} không đúng định dạng ObjectId`,
      "any.required": `Vui lòng cung cấp ${fieldName}`,
      "string.empty": `Vui lòng cung cấp ${fieldName}`,
    });

// Helper kiểm tra định dạng kỳ hóa đơn: "YYYY-MM" (ví dụ: 2026-11)
const monthField = Joi.string()
  .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
  .messages({
    "string.pattern.base":
      "Kỳ hóa đơn phải có định dạng YYYY-MM (ví dụ: 2026-11)",
    "any.required": "Vui lòng chọn kỳ hóa đơn (tháng)",
  });

// 1. Schema cho API gợi ý: GET /api/invoices/prefill?contractId=&month=
export const prefillQuerySchema = Joi.object({
  contractId: objectIdField("Mã hợp đồng").required(),
  month: monthField.required(),
});

// Định nghĩa một dòng khoản thu (item) trên hóa đơn
const invoiceItemSchema = Joi.object({
  serviceId: Joi.string().pattern(OBJECT_ID_REGEX).allow(null, "").optional(),
  type: Joi.string()
    .valid(...values(INVOICE_ITEM_TYPE))
    .required()
    .messages({
      "any.only": "Loại dòng tiền không hợp lệ",
      "any.required":
        "Vui lòng chọn loại dòng tiền (RENT, METERED, FIXED, EXTRA)",
    }),
  description: Joi.string().trim().required().messages({
    "string.empty": "Tên khoản thu không được để trống",
    "any.required": "Tên khoản thu là bắt buộc",
  }),
  oldReading: Joi.number().min(0).optional().allow(null).messages({
    "number.min": "Chỉ số cũ không được âm",
  }),
  newReading: Joi.number().min(0).optional().allow(null).messages({
    "number.min": "Chỉ số mới không được âm",
  }),
  quantity: Joi.number().min(0).default(1).messages({
    "number.min": "Số lượng không được âm",
  }),
  unitPrice: Joi.number().min(0).default(0).messages({
    "number.base": "Đơn giá phải là số",
    "number.min": "Đơn giá không được âm",
  }),
});

// 2. Schema tạo hóa đơn đơn lẻ: POST /api/invoices (UC-34)
export const createInvoiceSchema = Joi.object({
  contractId: objectIdField("Mã hợp đồng").required(),
  month: monthField.required(),
  // Server luôn tự thêm dòng RENT (tiền phòng), nên cho phép mảng items phụ (dịch vụ/phát sinh) rỗng
  items: Joi.array().items(invoiceItemSchema).default([]).messages({
    "array.base": "Danh sách các khoản thu không hợp lệ",
  }),
  confirmDuplicate: Joi.boolean().default(false), // Manager bấm đồng ý tạo thêm khi đã có hóa đơn cùng kỳ
});

// 3. Schema tạo hóa đơn hàng loạt: POST /api/invoices/bulk (UC-34 A1)
export const bulkCreateInvoiceSchema = Joi.object({
  contractIds: Joi.array()
    .items(Joi.string().pattern(OBJECT_ID_REGEX))
    .min(1)
    .required()
    .messages({
      "array.min": "Vui lòng chọn ít nhất một hợp đồng để tạo hóa đơn",
      "any.required": "Danh sách hợp đồng là bắt buộc",
    }),
  month: monthField.required(),
});

// 4. Schema cập nhật hóa đơn nháp: PUT /api/invoices/:id (UC-34)
export const updateInvoiceSchema = Joi.object({
  items: Joi.array().items(invoiceItemSchema).default([]).messages({
    "array.base": "Danh sách các khoản thu không hợp lệ",
  }),
});

// 5. Schema hủy hóa đơn: POST /api/invoices/:id/cancel (UC-37)
export const cancelInvoiceSchema = Joi.object({
  reason: Joi.string().trim().min(3).required().messages({
    "string.empty": "Vui lòng nhập lý do hủy hóa đơn",
    "string.min": "Lý do hủy phải có ít nhất 3 ký tự",
    "any.required": "Lý do hủy hóa đơn là bắt buộc",
  }),
});

// 6. Schema kiểm tra ID hóa đơn trên URL params: /invoices/:id
export const invoiceIdParamSchema = Joi.object({
  id: objectIdField("Mã hóa đơn").required(),
});

// 7. Schema lọc danh sách hóa đơn: GET /api/invoices (UC-36)
export const listInvoicesQuerySchema = Joi.object({
  status: commaSeparatedEnum(
    values(INVOICE_STATUS),
    "Trạng thái hóa đơn không hợp lệ",
  ),
  month: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  roomId: Joi.string().pattern(OBJECT_ID_REGEX).optional(),
  buildingId: Joi.string().pattern(OBJECT_ID_REGEX).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
