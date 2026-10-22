// Validation schema cho module auth (UC-01)
import Joi from 'joi';

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
