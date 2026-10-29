// Validation schema cho module notification (UC-41)
import Joi from 'joi';

export const listNotificationsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'Trang phải là số nguyên từ 1 trở lên',
        'number.integer': 'Trang phải là số nguyên từ 1 trở lên',
        'number.min': 'Trang phải là số nguyên từ 1 trở lên',
    }),
    limit: Joi.number().integer().min(1).max(50).default(10).messages({
        'number.base': 'Số thông báo mỗi trang phải từ 1 đến 50',
        'number.integer': 'Số thông báo mỗi trang phải từ 1 đến 50',
        'number.min': 'Số thông báo mỗi trang phải từ 1 đến 50',
        'number.max': 'Số thông báo mỗi trang phải từ 1 đến 50',
    }),
    unread: Joi.boolean().default(false).messages({
        'boolean.base': 'Giá trị unread không hợp lệ',
    }),
});
