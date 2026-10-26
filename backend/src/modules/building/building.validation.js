// Validation schema cho module building (UC-12, UC-13, UC-14)
import Joi from "joi";
import {
  BUILDING_NAME_REGEX,
  ADDRESS_REGEX,
  SAFE_TEXT_REGEX,
} from "../../helpers/validators.js";

// Schema tạo tòa nhà (UC-12)
export const createBuildingSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(BUILDING_NAME_REGEX)
    .required()
    .messages({
      "string.empty": "Vui lòng nhập tên tòa nhà",
      "string.min": "Tên tòa nhà tối thiểu 2 ký tự",
      "string.max": "Tên tòa nhà tối đa 100 ký tự",
      "string.pattern.base": "Tên tòa nhà không được chứa ký tự đặc biệt",
      "any.required": "Vui lòng nhập tên tòa nhà",
    }),

  address: Joi.string()
    .trim()
    .min(5)
    .max(255)
    .pattern(ADDRESS_REGEX)
    .required()
    .messages({
      "string.empty": "Vui lòng nhập địa chỉ tòa nhà",
      "string.min": "Địa chỉ tối thiểu 5 ký tự",
      "string.max": "Địa chỉ tối đa 255 ký tự",
      "string.pattern.base": "Địa chỉ chứa ký tự không hợp lệ",
      "any.required": "Vui lòng nhập địa chỉ tòa nhà",
    }),

  floorCount: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Số tầng phải là số nguyên",
    "number.integer": "Số tầng phải là số nguyên",
    "number.min": "Số tầng phải lớn hơn hoặc bằng 1",
  }),

  description: Joi.string()
    .trim()
    .max(1000)
    .pattern(SAFE_TEXT_REGEX)
    .allow("", null)
    .default("")
    .messages({
      "string.max": "Mô tả tối đa 1000 ký tự",
      "string.pattern.base": "Mô tả không được chứa ký tự < hoặc >",
    }),

  images: Joi.array().items(Joi.string().trim().uri()).default([]).messages({
    "array.base": "Danh sách ảnh phải là một mảng",
    "string.uri": "Đường dẫn ảnh không đúng định dạng URL",
  }),
});

// Schema cập nhật tòa nhà (UC-13)
export const updateBuildingSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(BUILDING_NAME_REGEX)
    .messages({
      "string.empty": "Tên tòa nhà không được để trống",
      "string.min": "Tên tòa nhà tối thiểu 2 ký tự",
      "string.max": "Tên tòa nhà tối đa 100 ký tự",
      "string.pattern.base": "Tên tòa nhà không được chứa ký tự đặc biệt",
    }),

  address: Joi.string().trim().min(5).max(255).pattern(ADDRESS_REGEX).messages({
    "string.empty": "Địa chỉ không được để trống",
    "string.min": "Địa chỉ tối thiểu 5 ký tự",
    "string.max": "Địa chỉ tối đa 255 ký tự",
    "string.pattern.base": "Địa chỉ chứa ký tự không hợp lệ",
  }),

  description: Joi.string()
    .trim()
    .max(1000)
    .pattern(SAFE_TEXT_REGEX)
    .allow("", null)
    .messages({
      "string.max": "Mô tả tối đa 1000 ký tự",
      "string.pattern.base": "Mô tả không được chứa ký tự < hoặc >",
    }),

  images: Joi.array().items(Joi.string().trim().uri()).messages({
    "array.base": "Danh sách ảnh phải là một mảng",
    "string.uri": "Đường dẫn ảnh không đúng định dạng URL",
  }),
})
  .min(1)
  .messages({
    "object.min": "Vui lòng cung cấp ít nhất một thông tin cần cập nhật",
  });

// Schema kiểm tra ID trên URL (/buildings/:id)
export const buildingIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Mã tòa nhà không đúng định dạng",
      "any.required": "Thiếu mã tòa nhà",
    }),
});
