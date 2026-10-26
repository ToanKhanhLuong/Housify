// Validation schema cho module auth (UC-01, UC-03, UC-04, UC-05)
import Joi from 'joi';
import { PASSWORD_REGEX, PHONE_REGEX } from '../../helpers/validators.js';

export const loginSchema = Joi.object({
    identifier: Joi.string().trim().required().messages({
        'string.empty': 'Vui lòng nhập email hoặc số CCCD',
        'any.required': 'Vui lòng nhập email hoặc số CCCD',
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Vui lòng nhập mật khẩu',
        'any.required': 'Vui lòng nhập mật khẩu',
    }),
    remember: Joi.boolean().default(false),
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'string.empty': 'Vui lòng nhập mật khẩu hiện tại',
        'any.required': 'Vui lòng nhập mật khẩu hiện tại',
    }),
    newPassword: Joi.string().pattern(PASSWORD_REGEX).required().messages({
        'string.empty': 'Vui lòng nhập mật khẩu mới',
        'string.pattern.base': 'Mật khẩu tối thiểu 6 ký tự, có chữ và số',
        'any.required': 'Vui lòng nhập mật khẩu mới',
    }),
    confirmPassword: Joi.string().empty('').valid(Joi.ref('newPassword')).required().messages({
        'string.empty': 'Vui lòng xác nhận mật khẩu',
        'any.only': 'Xác nhận mật khẩu không khớp',
        'any.required': 'Vui lòng xác nhận mật khẩu',
    }),
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
        'string.empty': 'Vui lòng nhập email',
        'string.email': 'Email không đúng định dạng',
        'any.required': 'Vui lòng nhập email',
    }),
});

export const verifyOtpSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
        'string.empty': 'Vui lòng nhập email',
        'string.email': 'Email không đúng định dạng',
        'any.required': 'Vui lòng nhập email',
    }),
    otp: Joi.string().pattern(/^\d{4}$/).required().messages({
        'string.empty': 'Vui lòng nhập mã OTP',
        'string.pattern.base': 'Mã OTP gồm 4 chữ số',
        'any.required': 'Vui lòng nhập mã OTP',
    }),
});

export const resetPasswordSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
        'string.empty': 'Vui lòng nhập email',
        'string.email': 'Email không đúng định dạng',
        'any.required': 'Vui lòng nhập email',
    }),
    otp: Joi.string().pattern(/^\d{4}$/).required().messages({
        'string.empty': 'Vui lòng nhập mã OTP',
        'string.pattern.base': 'Mã OTP gồm 4 chữ số',
        'any.required': 'Vui lòng nhập mã OTP',
    }),
    newPassword: Joi.string().pattern(PASSWORD_REGEX).required().messages({
        'string.empty': 'Vui lòng nhập mật khẩu mới',
        'string.pattern.base': 'Mật khẩu tối thiểu 6 ký tự, có chữ và số',
        'any.required': 'Vui lòng nhập mật khẩu mới',
    }),
    confirmPassword: Joi.string().empty('').valid(Joi.ref('newPassword')).required().messages({
        'string.empty': 'Vui lòng xác nhận mật khẩu',
        'any.only': 'Xác nhận mật khẩu không khớp',
        'any.required': 'Vui lòng xác nhận mật khẩu',
    }),
});

// Chỉ gửi field muốn đổi; không cho gửi chuỗi rỗng để xóa trắng một ô
export const updateProfileSchema = Joi.object({
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
    cccd: Joi.string().trim().empty(''), // chỉ nhận để kiểm, không bao giờ lưu
}).min(1).messages({
    'object.min': 'Vui lòng nhập thông tin cần cập nhật',
});
