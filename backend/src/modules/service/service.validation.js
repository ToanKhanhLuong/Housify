// Validation schema cho module service (UC-21, UC-22)
import Joi from "joi";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Schema kiểm tra ID dịch vụ trên URL (/services/:id)
export const serviceIdParamSchema = Joi.object({
  id: Joi.string().pattern(OBJECT_ID_REGEX).required().messages({
    "string.pattern.base": "Mã dịch vụ không đúng định dạng",
    "any.required": "Thiếu mã dịch vụ",
  }),
});

// Schema kiểm tra ID tòa trên URL (/buildings/:id/service-prices)
export const buildingIdParamSchema = Joi.object({
  id: Joi.string().pattern(OBJECT_ID_REGEX).required().messages({
    "string.pattern.base": "Mã tòa nhà không đúng định dạng",
    "any.required": "Thiếu mã tòa nhà",
  }),
});

// Các field dùng chung cho thêm và sửa dịch vụ
const nameField = Joi.string().trim().min(2).max(100).messages({
  "string.empty": "Vui lòng nhập tên dịch vụ",
  "string.min": "Tên dịch vụ tối thiểu 2 ký tự",
  "string.max": "Tên dịch vụ tối đa 100 ký tự",
  "any.required": "Vui lòng nhập tên dịch vụ",
});

// Đơn vị chỉ để hiển thị: kWh, m³, tháng, người…
const unitField = Joi.string().trim().max(30).messages({
  "string.empty": "Vui lòng nhập đơn vị tính",
  "string.max": "Đơn vị tính tối đa 30 ký tự",
  "any.required": "Vui lòng nhập đơn vị tính",
});

// true: phí cố định (gửi xe, wifi…); false: tính theo chỉ số (điện, nước)
const isFixedField = Joi.boolean().messages({
  "boolean.base": "Vui lòng chọn cách tính",
  "any.required": "Vui lòng chọn cách tính",
});

// Schema thêm dịch vụ (UC-21)
export const createServiceSchema = Joi.object({
  name: nameField.required(),
  unit: unitField.required(),
  isFixed: isFixedField.required(),
});

// Schema sửa dịch vụ (UC-21) – gửi field muốn đổi
export const updateServiceSchema = Joi.object({
  name: nameField,
  unit: unitField,
  isFixed: isFixedField,
})
  .min(1)
  .messages({
    "object.min": "Vui lòng cung cấp ít nhất một thông tin cần cập nhật",
  });

// Schema đặt giá dịch vụ cho tòa (UC-22)
export const savePriceSchema = Joi.object({
  serviceId: Joi.string().pattern(OBJECT_ID_REGEX).required().messages({
    "string.empty": "Vui lòng chọn dịch vụ",
    "string.pattern.base": "Dịch vụ không hợp lệ",
    "any.required": "Vui lòng chọn dịch vụ",
  }),
  unitPrice: Joi.number().greater(0).required().messages({
    "number.base": "Đơn giá phải là số",
    "number.greater": "Đơn giá phải lớn hơn 0",
    "any.required": "Vui lòng nhập đơn giá",
  }),
  // FE gửi dạng yyyy-MM-dd
  effectiveFrom: Joi.date().required().messages({
    "date.base": "Ngày bắt đầu áp dụng không hợp lệ",
    "any.required": "Vui lòng chọn ngày bắt đầu áp dụng",
  }),
});
