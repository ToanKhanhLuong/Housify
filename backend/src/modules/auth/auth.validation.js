// Validation schema cho module auth (UC-01, UC-03, UC-04)
import Joi from 'joi';
import { PASSWORD_REGEX } from '../../helpers/validators.js';

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
    otp: Joi.string().pattern(/^\d{6}$/).required().messages({
        'string.empty': 'Vui lòng nhập mã OTP',
        'string.pattern.base': 'Mã OTP gồm 6 chữ số',
        'any.required': 'Vui lòng nhập mã OTP',
    }),
});

export const resetPasswordSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
        'string.empty': 'Vui lòng nhập email',
        'string.email': 'Email không đúng định dạng',
        'any.required': 'Vui lòng nhập email',
    }),
    otp: Joi.string().pattern(/^\d{6}$/).required().messages({
        'string.empty': 'Vui lòng nhập mã OTP',
        'string.pattern.base': 'Mã OTP gồm 6 chữ số',
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
