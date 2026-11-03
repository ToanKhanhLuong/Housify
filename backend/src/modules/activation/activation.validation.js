// Validation schema cho module activation (UC-08 bước 6–8 cho Manager, UC-06 cho Customer)
import Joi from 'joi';
import { PASSWORD_REGEX, PHONE_REGEX } from '../../helpers/validators.js';

export const activateManagerSchema = Joi.object({
    token: Joi.string().trim().required().messages({
        'string.empty': 'Vui lòng cung cấp mã kích hoạt',
        'any.required': 'Vui lòng cung cấp mã kích hoạt',
    }),
    password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
        'string.empty': 'Vui lòng nhập mật khẩu',
        'string.pattern.base': 'Mật khẩu tối thiểu 6 ký tự, có chữ và số',
        'any.required': 'Vui lòng nhập mật khẩu',
    }),
    confirmPassword: Joi.string().empty('').valid(Joi.ref('password')).required().messages({
        'string.empty': 'Vui lòng xác nhận mật khẩu',
        'any.only': 'Xác nhận mật khẩu không khớp',
        'any.required': 'Vui lòng xác nhận mật khẩu',
    }),
});

export const activateCustomerContractSchema = Joi.object({
    token: Joi.string().trim().required().messages({
        'string.empty': 'Vui lòng cung cấp mã kích hoạt',
        'any.required': 'Vui lòng cung cấp mã kích hoạt',
    }),
    name: Joi.string().trim().max(100).required().messages({
        'string.empty': 'Vui lòng nhập họ và tên',
        'string.max': 'Họ và tên tối đa 100 ký tự',
        'any.required': 'Vui lòng nhập họ và tên',
    }),
    phone: Joi.string().trim().pattern(PHONE_REGEX).required().messages({
        'string.empty': 'Vui lòng nhập số điện thoại',
        'string.pattern.base': 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)',
        'any.required': 'Vui lòng nhập số điện thoại',
    }),
    dateOfBirth: Joi.date().max('now').required().messages({
        'date.base': 'Ngày sinh không hợp lệ',
        'date.max': 'Ngày sinh không được ở tương lai',
        'any.required': 'Vui lòng nhập ngày sinh',
    }),
    address: Joi.string().trim().allow('').max(255),
    password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
        'string.empty': 'Vui lòng nhập mật khẩu',
        'string.pattern.base': 'Mật khẩu tối thiểu 6 ký tự, có chữ và số',
        'any.required': 'Vui lòng nhập mật khẩu',
    }),
    confirmPassword: Joi.string().empty('').valid(Joi.ref('password')).required().messages({
        'string.empty': 'Vui lòng xác nhận mật khẩu',
        'any.only': 'Xác nhận mật khẩu không khớp',
        'any.required': 'Vui lòng xác nhận mật khẩu',
    }),
    agreed: Joi.boolean().valid(true).required().messages({
        'any.only': 'Bạn phải tích chọn đồng ý điều khoản hợp đồng để xác nhận',
        'any.required': 'Bạn phải tích chọn đồng ý điều khoản hợp đồng để xác nhận',
    }),
    cccdFrontImage: Joi.string().trim().required().messages({
        'string.empty': 'Vui lòng tải lên ảnh CCCD mặt trước',
        'any.required': 'Vui lòng tải lên ảnh CCCD mặt trước',
    }),
    cccdBackImage: Joi.string().trim().required().messages({
        'string.empty': 'Vui lòng tải lên ảnh CCCD mặt sau',
        'any.required': 'Vui lòng tải lên ảnh CCCD mặt sau',
    }),
});
