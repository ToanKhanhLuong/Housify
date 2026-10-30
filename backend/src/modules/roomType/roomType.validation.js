// Validation schema cho module roomType (UC-20)
import Joi from 'joi';

const nameField = Joi.string()
  .trim()
  .required()
  .messages({
    'string.empty': 'Tên loại phòng không được để trống',
    'any.required': 'Tên loại phòng không được để trống',
  });

const capacityField = Joi.number()
  .integer()
  .min(1)
  .required()
  .messages({
    'number.base': 'Sức chứa phải là số nguyên lớn hơn hoặc bằng 1',
    'number.integer': 'Sức chứa phải là số nguyên lớn hơn hoặc bằng 1',
    'number.min': 'Sức chứa phải là số nguyên lớn hơn hoặc bằng 1',
    'any.required': 'Sức chứa phải là số nguyên lớn hơn hoặc bằng 1',
  });

// Schema tạo loại phòng (UC-20)
export const createRoomTypeSchema = Joi.object({
  name: nameField,
  capacity: capacityField,
});

// Schema cập nhật loại phòng (UC-20)
export const updateRoomTypeSchema = Joi.object({
  name: nameField,
  capacity: capacityField,
});

// Schema kiểm tra ID trên URL (/room-types/:id)
export const roomTypeIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mã loại phòng không đúng định dạng',
      'any.required': 'Thiếu mã loại phòng',
    }),
});
