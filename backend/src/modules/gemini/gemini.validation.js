// Validation schema cho module gemini (Housify AI Assistant)
import Joi from 'joi';

export const geminiChatSchema = Joi.object({
    message: Joi.string().trim().min(1).max(2000).required().messages({
        'string.empty': 'Nội dung tin nhắn không được để trống',
        'string.min': 'Nội dung tin nhắn không được để trống',
        'string.max': 'Nội dung tin nhắn tối đa 2000 ký tự',
        'any.required': 'Nội dung tin nhắn là bắt buộc',
    }),
    history: Joi.array()
        .items(
            Joi.object({
                role: Joi.string().valid('user', 'model').required(),
                text: Joi.string().trim().max(4000).required(),
            }),
        )
        .max(20)
        .default([]),
});
