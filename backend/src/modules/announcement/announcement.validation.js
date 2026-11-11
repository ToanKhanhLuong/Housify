// Validation schema cho module announcement (UC-40)
import Joi from 'joi';
import { OBJECT_ID_REGEX } from '../../helpers/filter.js';

// target: 'ALL' = tất cả khách trong tòa, hoặc mảng roomId các phòng được chọn
export const sendAnnouncementSchema = Joi.object({
    title: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập tiêu đề',
            'any.required': 'Vui lòng nhập tiêu đề',
        }),
    message: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập nội dung',
            'any.required': 'Vui lòng nhập nội dung',
        }),
    target: Joi.alternatives()
        .try(
            Joi.string().valid('ALL'),
            Joi.array()
                .items(
                    Joi.string()
                        .pattern(OBJECT_ID_REGEX)
                        .messages({ 'string.pattern.base': 'Mã phòng không hợp lệ' }),
                )
                .min(1)
                .unique()
                .messages({
                    'array.min': 'Vui lòng chọn ít nhất 1 phòng',
                    'array.unique': 'Danh sách phòng bị trùng',
                }),
        )
        .required()
        .messages({
            'alternatives.match': 'Vui lòng chọn đối tượng nhận: tất cả hoặc ít nhất 1 phòng',
            'alternatives.types': 'Vui lòng chọn đối tượng nhận: tất cả hoặc ít nhất 1 phòng',
            'any.required': 'Vui lòng chọn đối tượng nhận',
        }),
});

export const listAnnouncementsSchema = Joi.object({
    q: Joi.string().trim().allow('').optional(),
    category: Joi.string()
        .valid('ALL', 'MAINTENANCE', 'RULE', 'REMINDER', 'GENERAL')
        .default('ALL'),
    from: Joi.date().iso().optional().messages({
        'date.format': 'Ngày bắt đầu không hợp lệ',
    }),
    to: Joi.date().iso().optional().messages({
        'date.format': 'Ngày kết thúc không hợp lệ',
    }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
});

