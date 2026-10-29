// Validation schema cho module roomType (UC-20)
import Joi from "joi";

// Schema tạo loại phòng (UC-20)
export const createRoomTypeSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.empty": "Vui lòng nhập tên loại phòng",
      "string.min": "Tên loại phòng tối thiểu 2 ký tự",
      "string.max": "Tên loại phòng tối đa 50 ký tự",
      "any.required": "Vui lòng nhập tên loại phòng",
    }),
});

// Schema cập nhật loại phòng (UC-20)
export const updateRoomTypeSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.empty": "Tên loại phòng không được để trống",
      "string.min": "Tên loại phòng tối thiểu 2 ký tự",
      "string.max": "Tên loại phòng tối đa 50 ký tự",
      "any.required": "Tên loại phòng không được để trống",
    }),
});

// Schema kiểm tra ID trên URL (/room-types/:id)
export const roomTypeIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Mã loại phòng không đúng định dạng",
      "any.required": "Thiếu mã loại phòng",
    }),
});
