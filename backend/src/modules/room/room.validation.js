// Validation schema cho module room (UC-16, UC-17, UC-18, UC-19)
import Joi from 'joi';
import { ROOM_STATUS, values } from '../../constants/enums.js';
import {
  commaSeparatedEnum,
  commaSeparatedIntegers,
  commaSeparatedObjectIds,
  OBJECT_ID_REGEX,
} from '../../helpers/filter.js';

// Schema kiểm tra ID tòa trên URL (/buildings/:buildingId/rooms)
export const buildingIdParamSchema = Joi.object({
  buildingId: Joi.string()
    .pattern(OBJECT_ID_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Mã tòa nhà không đúng định dạng',
      'any.required': 'Thiếu tòa nhà',
      'string.empty': 'Thiếu tòa nhà',
    }),
});

// Schema kiểm tra ID phòng trên URL (/rooms/:id)
export const roomIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(OBJECT_ID_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Mã phòng không đúng định dạng',
      'any.required': 'Thiếu mã phòng',
      'string.empty': 'Thiếu mã phòng',
    }),
});

// Schema lọc danh sách phòng (UC-19): ?q=&floor=&status=&roomTypeId=&minPrice=&maxPrice=
export const listRoomsQuerySchema = Joi.object({
  q: Joi.string().trim().allow(''),
  status: commaSeparatedEnum(values(ROOM_STATUS), 'Trạng thái phòng không hợp lệ'),
  floor: commaSeparatedIntegers({ min: 1, message: 'Tầng không hợp lệ' }),
  roomTypeId: commaSeparatedObjectIds('Loại phòng không hợp lệ'),
  minPrice: Joi.number().min(0).messages({
    'number.base': 'Giá từ phải là số',
    'number.min': 'Giá từ không được âm',
  }),
  maxPrice: Joi.number().min(0).messages({
    'number.base': 'Giá đến phải là số',
    'number.min': 'Giá đến không được âm',
  }),
}).custom((value, helpers) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && Number(value.minPrice) > Number(value.maxPrice)) {
    return helpers.error('any.invalid');
  }
  return value;
}).messages({
  'any.invalid': 'Giá từ không được lớn hơn giá đến',
});

// Các field dùng chung cho tạo và sửa phòng
const floorNumberField = Joi.number().integer().min(1).messages({
  'number.base': 'Tầng phải là số nguyên',
  'number.integer': 'Tầng phải là số nguyên',
  'number.min': 'Tầng phải lớn hơn hoặc bằng 1',
  'any.required': 'Vui lòng chọn tầng',
});

const roomTypeIdField = Joi.string().pattern(OBJECT_ID_REGEX).messages({
  'string.empty': 'Vui lòng chọn loại phòng',
  'string.pattern.base': 'Loại phòng không tồn tại',
  'any.required': 'Vui lòng chọn loại phòng',
});

const areaField = Joi.number().greater(0).messages({
  'number.base': 'Diện tích phải là số',
  'number.greater': 'Diện tích phải lớn hơn 0',
  'any.required': 'Vui lòng nhập diện tích',
});

const rentPriceField = Joi.number().greater(0).messages({
  'number.base': 'Giá thuê phải là số',
  'number.greater': 'Giá thuê phải lớn hơn 0',
  'any.required': 'Giá thuê phải lớn hơn 0',
});

const depositField = Joi.number().greater(0).messages({
  'number.base': 'Tiền cọc phải là số',
  'number.greater': 'Tiền cọc phải lớn hơn 0',
  'any.required': 'Tiền cọc phải lớn hơn 0',
});

const imagesField = Joi.array().items(Joi.string().trim().uri()).messages({
  'array.base': 'Danh sách ảnh phải là một mảng',
  'string.uri': 'Đường dẫn ảnh không đúng định dạng URL',
});

// Schema tạo phòng (UC-16) – không còn capacity; client gửi capacity thì bỏ qua
export const createRoomSchema = Joi.object({
  roomNumber: Joi.string().trim().max(20).required().messages({
    'string.empty': 'Vui lòng nhập mã phòng',
    'string.max': 'Mã phòng tối đa 20 ký tự',
    'any.required': 'Vui lòng nhập mã phòng',
  }),
  floorNumber: floorNumberField.required(),
  roomTypeId: roomTypeIdField.required(),
  area: areaField.required(),
  rentPrice: rentPriceField.required(),
  deposit: depositField.required(),
  images: imagesField.default([]),
});

// Schema cập nhật phòng (UC-17) – không có roomNumber, không còn capacity
export const updateRoomSchema = Joi.object({
  floorNumber: floorNumberField,
  roomTypeId: roomTypeIdField,
  area: areaField,
  rentPrice: rentPriceField,
  deposit: depositField,
  images: imagesField,
  status: Joi.string()
    .valid(ROOM_STATUS.AVAILABLE, ROOM_STATUS.MAINTENANCE)
    .messages({
      'any.only': 'Trạng thái chỉ được chọn Trống hoặc Bảo trì',
    }),
})
  .min(1)
  .messages({
    'object.min': 'Vui lòng cung cấp ít nhất một thông tin cần cập nhật',
  });
