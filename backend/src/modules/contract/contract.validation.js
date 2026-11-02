// Validation schema cho module contract (UC-24, UC-26, UC-27, UC-46)
import Joi from 'joi';
import { CONTRACT_TYPE, values } from '../../constants/enums.js';
import { CCCD_REGEX, PHONE_REGEX } from '../../helpers/validators.js';
import { OBJECT_ID_REGEX } from '../../helpers/filter.js';

// Kiểm tra tham số ID hợp đồng trên URL (/contracts/:id, /contracts/:id/resend-invite)
export const contractIdParamSchema = Joi.object({
    id: Joi.string()
        .pattern(OBJECT_ID_REGEX)
        .required()
        .messages({
            'string.pattern.base': 'Mã hợp đồng không đúng định dạng',
            'any.required': 'Thiếu mã hợp đồng',
            'string.empty': 'Thiếu mã hợp đồng',
        }),
});

// Schema tạo hợp đồng thuê (UC-24)
export const createContractSchema = Joi.object({
    roomId: Joi.string()
        .pattern(OBJECT_ID_REGEX)
        .required()
        .messages({
            'string.empty': 'Vui lòng chọn phòng',
            'string.pattern.base': 'Mã phòng không hợp lệ',
            'any.required': 'Vui lòng chọn phòng',
        }),
    startDate: Joi.date()
        .required()
        .messages({
            'date.base': 'Ngày bắt đầu không hợp lệ',
            'any.required': 'Vui lòng nhập ngày bắt đầu',
        }),
    durationMonths: Joi.number()
        .integer()
        .min(1)
        .max(120)
        .required()
        .messages({
            'number.base': 'Thời hạn thuê phải là số tháng',
            'number.integer': 'Thời hạn thuê phải là số nguyên',
            'number.min': 'Thời hạn thuê tối thiểu 1 tháng',
            'number.max': 'Thời hạn thuê tối đa 120 tháng',
            'any.required': 'Vui lòng nhập thời hạn thuê',
        }),
    representativeCccd: Joi.string()
        .trim()
        .pattern(CCCD_REGEX)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập số CCCD người đại diện',
            'string.pattern.base': 'CCCD phải đúng 12 chữ số',
            'any.required': 'Vui lòng nhập số CCCD người đại diện',
        }),
    representativeEmail: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập email người đại diện',
            'string.email': 'Email không hợp lệ',
            'any.required': 'Vui lòng nhập email người đại diện',
        }),
    contractType: Joi.string()
        .valid(...values(CONTRACT_TYPE))
        .required()
        .messages({
            'any.only': 'Loại hợp đồng không hợp lệ (chỉ chấp nhận SINGLE hoặc GROUP)',
            'any.required': 'Vui lòng chọn loại hợp đồng',
        }),
    notes: Joi.string()
        .trim()
        .allow('')
        .max(1000)
        .messages({
            'string.max': 'Ghi chú tối đa 1000 ký tự',
        }),
    coOccupants: Joi.array()
        .items(
            Joi.object({
                name: Joi.string().trim().max(100).required().messages({
                    'string.empty': 'Vui lòng nhập họ tên người ở cùng',
                    'any.required': 'Vui lòng nhập họ tên người ở cùng',
                }),
                cccd: Joi.string().trim().pattern(CCCD_REGEX).required().messages({
                    'string.empty': 'Vui lòng nhập CCCD người ở cùng',
                    'string.pattern.base': 'CCCD người ở cùng phải đúng 12 chữ số',
                    'any.required': 'Vui lòng nhập CCCD người ở cùng',
                }),
                phone: Joi.string().trim().pattern(PHONE_REGEX).required().messages({
                    'string.empty': 'Vui lòng nhập SĐT người ở cùng',
                    'string.pattern.base': 'SĐT người ở cùng không hợp lệ (10 số, bắt đầu bằng 0)',
                    'any.required': 'Vui lòng nhập SĐT người ở cùng',
                }),
                dateOfBirth: Joi.date().max('now').required().messages({
                    'date.base': 'Ngày sinh người ở cùng không hợp lệ',
                    'date.max': 'Ngày sinh không được ở tương lai',
                    'any.required': 'Vui lòng nhập ngày sinh người ở cùng',
                }),
                address: Joi.string().trim().allow('').max(255),
                relationship: Joi.string().trim().allow('').max(50),
            }),
        )
        .default([]),
});

