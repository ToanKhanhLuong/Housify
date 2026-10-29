// Validation schema cho module manager (UC-08, UC-09, UC-10, UC-11)
import Joi from 'joi';
import { USER_STATUS } from '../../constants/enums.js';
import { PHONE_REGEX } from '../../helpers/validators.js';

export const createManagerSchema = Joi.object({
    name: Joi.string().trim().max(100).required().messages({
        'string.empty': 'Vui lòng nhập họ tên',
        'string.max': 'Họ tên tối đa 100 ký tự',
        'any.required': 'Vui lòng nhập họ tên',
    }),
    email: Joi.string().trim().lowercase().email().required().messages({
        'string.empty': 'Vui lòng nhập email',
        'string.email': 'Email không hợp lệ',
        'any.required': 'Vui lòng nhập email',
    }),
    phone: Joi.string().trim().pattern(PHONE_REGEX).required().messages({
        'string.empty': 'Vui lòng nhập số điện thoại',
        'string.pattern.base': 'Số điện thoại không hợp lệ',
        'any.required': 'Vui lòng nhập số điện thoại',
    }),
});

export const listManagersSchema = Joi.object({
    status: Joi.string().valid(USER_STATUS.PENDING, USER_STATUS.ACTIVE, USER_STATUS.LOCKED).messages({
        'any.only': 'Trạng thái không hợp lệ',
        'string.empty': 'Trạng thái không hợp lệ',
    }),
    q: Joi.string().trim().allow('').max(100).messages({
        'string.max': 'Từ khóa tìm kiếm tối đa 100 ký tự',
    }),
    unassigned: Joi.boolean().default(false).messages({
        'boolean.base': 'Giá trị unassigned không hợp lệ',
    }),
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'Trang phải là số nguyên từ 1 trở lên',
        'number.integer': 'Trang phải là số nguyên từ 1 trở lên',
        'number.min': 'Trang phải là số nguyên từ 1 trở lên',
    }),
    limit: Joi.number().integer().min(1).max(50).default(10).messages({
        'number.base': 'Số dòng mỗi trang phải từ 1 đến 50',
        'number.integer': 'Số dòng mỗi trang phải từ 1 đến 50',
        'number.min': 'Số dòng mỗi trang phải từ 1 đến 50',
        'number.max': 'Số dòng mỗi trang phải từ 1 đến 50',
    }),
});

// Chỉ gửi field muốn đổi; không cho gửi chuỗi rỗng để xóa trắng một ô
export const updateManagerSchema = Joi.object({
    name: Joi.string().trim().max(100).messages({
        'string.empty': 'Họ tên không được để trống',
        'string.max': 'Họ tên tối đa 100 ký tự',
    }),
    email: Joi.string().trim().lowercase().email().messages({
        'string.empty': 'Email không hợp lệ',
        'string.email': 'Email không hợp lệ',
    }),
    phone: Joi.string().trim().pattern(PHONE_REGEX).messages({
        'string.empty': 'Số điện thoại không hợp lệ',
        'string.pattern.base': 'Số điện thoại không hợp lệ',
    }),
    dateOfBirth: Joi.date().max('now').messages({
        'date.base': 'Ngày sinh không hợp lệ',
        'date.max': 'Ngày sinh không hợp lệ',
    }),
    address: Joi.string().trim().max(255).messages({
        'string.empty': 'Địa chỉ không được để trống',
        'string.max': 'Địa chỉ tối đa 255 ký tự',
    }),
    cccdFrontImage: Joi.string().trim().messages({
        'string.base': 'Ảnh CCCD mặt trước không hợp lệ',
        'string.empty': 'Ảnh CCCD mặt trước không hợp lệ',
    }),
    cccdBackImage: Joi.string().trim().messages({
        'string.base': 'Ảnh CCCD mặt sau không hợp lệ',
        'string.empty': 'Ảnh CCCD mặt sau không hợp lệ',
    }),
}).min(1).messages({
    'object.min': 'Vui lòng nhập thông tin cần cập nhật',
});

export const lockManagerSchema = Joi.object({
    reason: Joi.string().trim().max(500).required().messages({
        'string.base': 'Vui lòng nhập lý do khóa',
        'string.empty': 'Vui lòng nhập lý do khóa',
        'string.max': 'Lý do khóa tối đa 500 ký tự',
        'any.required': 'Vui lòng nhập lý do khóa',
    }),
});

// managerId = null là gỡ phân công
export const assignManagerSchema = Joi.object({
    managerId: Joi.string().trim().allow(null).required().messages({
        'string.base': 'Manager không hợp lệ',
        'string.empty': 'Vui lòng chọn Manager',
        'any.required': 'Vui lòng chọn Manager',
    }),
    confirmReplace: Joi.boolean().default(false).messages({
        'boolean.base': 'Giá trị confirmReplace không hợp lệ',
    }),
});
