// Validation schema cho module activation (UC-08 bước 6–8)
import Joi from 'joi';
import { PASSWORD_REGEX } from '../../helpers/validators.js';

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

