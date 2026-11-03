// Validation schema cho module contract (UC-24, UC-25, UC-26, UC-27, UC-46)
import Joi from 'joi';
import { CONTRACT_STATUS, CONTRACT_TYPE, values } from '../../constants/enums.js';
import { CCCD_REGEX, PHONE_REGEX } from '../../helpers/validators.js';
import { OBJECT_ID_REGEX, commaSeparatedEnum } from '../../helpers/filter.js';

// Kiểm tra tham số ID hợp đồng trên URL (/contracts/:id, /contracts/:id/resend-invite, /contracts/:id/renew, /contracts/:id/cancel)
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

// Schema lọc danh sách hợp đồng (UC-25)
export const listContractsSchema = Joi.object({
    status: commaSeparatedEnum(values(CONTRACT_STATUS), 'Trạng thái hợp đồng không hợp lệ'),
    roomId: Joi.string()
        .trim()
        .pattern(OBJECT_ID_REGEX)
        .messages({
            'string.pattern.base': 'Mã phòng không hợp lệ',
        }),
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.base': 'Trang phải là số nguyên từ 1 trở lên',
            'number.integer': 'Trang phải là số nguyên từ 1 trở lên',
            'number.min': 'Trang phải là số nguyên từ 1 trở lên',
        }),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .default(10)
        .messages({
            'number.base': 'Số bản ghi mỗi trang phải từ 1 đến 50',
            'number.integer': 'Số bản ghi mỗi trang phải từ 1 đến 50',
            'number.min': 'Số bản ghi mỗi trang phải từ 1 đến 50',
            'number.max': 'Số bản ghi mỗi trang phải từ 1 đến 50',
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

// Schema cập nhật hợp đồng (UC-26)
// Giữ .unknown(true) để service bắt và trả thông báo lỗi nghiệp vụ rõ ràng khi client cố gửi các trường bị khóa
export const updateContractSchema = Joi.object({
    representativeCccd: Joi.string()
        .trim()
        .pattern(CCCD_REGEX)
        .messages({
            'string.empty': 'Vui lòng nhập số CCCD người đại diện',
            'string.pattern.base': 'CCCD phải đúng 12 chữ số',
        }),
    representativeEmail: Joi.string()
        .trim()
        .lowercase()
        .email()
        .messages({
            'string.empty': 'Vui lòng nhập email người đại diện',
            'string.email': 'Email không hợp lệ',
        }),
    startDate: Joi.date()
        .messages({
            'date.base': 'Ngày bắt đầu không hợp lệ',
        }),
    durationMonths: Joi.number()
        .integer()
        .min(1)
        .max(120)
        .messages({
            'number.base': 'Thời hạn thuê phải là số tháng',
            'number.integer': 'Thời hạn thuê phải là số nguyên',
            'number.min': 'Thời hạn thuê tối thiểu 1 tháng',
            'number.max': 'Thời hạn thuê tối đa 120 tháng',
        }),
    notes: Joi.string()
        .trim()
        .allow('')
        .max(1000)
        .messages({
            'string.max': 'Ghi chú tối đa 1000 ký tự',
        }),
})
    .min(1)
    .unknown(true)
    .messages({
        'object.min': 'Vui lòng cung cấp dữ liệu cần cập nhật',
    });

// Schema gia hạn hợp đồng (UC-27)
export const renewContractSchema = Joi.object({
    months: Joi.number()
        .integer()
        .min(1)
        .max(120)
        .default(12)
        .messages({
            'number.base': 'Số tháng gia hạn phải là số nguyên lớn hơn 0',
            'number.integer': 'Số tháng gia hạn phải là số nguyên lớn hơn 0',
            'number.min': 'Số tháng gia hạn phải là số nguyên lớn hơn 0',
            'number.max': 'Số tháng gia hạn tối đa 120 tháng',
        }),
    notes: Joi.string()
        .trim()
        .allow('')
        .max(1000)
        .messages({
            'string.max': 'Ghi chú tối đa 1000 ký tự',
        }),
});

// Schema hủy hợp đồng nháp (UC-46)
export const cancelContractSchema = Joi.object({
    reason: Joi.string()
        .trim()
        .allow('')
        .max(500)
        .messages({
            'string.max': 'Lý do hủy tối đa 500 ký tự',
        }),
});
