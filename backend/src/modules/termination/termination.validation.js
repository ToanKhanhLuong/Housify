// Validation schema cho module termination: tạo đơn, xem danh sách/chi tiết, xác nhận, duyệt/từ chối, hủy đơn chấm dứt (UC-28, UC-29)
import Joi from 'joi';
import { TERMINATION_STATUS, TERMINATION_TYPE, values } from '../../constants/enums.js';
import { OBJECT_ID_REGEX, commaSeparatedEnum } from '../../helpers/filter.js';

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

export const terminationIdParamSchema = Joi.object({
    id: Joi.string()
        .pattern(OBJECT_ID_REGEX)
        .required()
        .messages({
            'string.pattern.base': 'Mã đơn chấm dứt không đúng định dạng',
            'any.required': 'Thiếu mã đơn chấm dứt',
            'string.empty': 'Thiếu mã đơn chấm dứt',
        }),
});

export const listTerminationsSchema = Joi.object({
    status: commaSeparatedEnum(values(TERMINATION_STATUS), 'Giá trị lọc trạng thái không hợp lệ'),
    type: commaSeparatedEnum(values(TERMINATION_TYPE), 'Giá trị lọc loại đơn không hợp lệ'),
    contractId: Joi.string()
        .trim()
        .pattern(OBJECT_ID_REGEX)
        .messages({
            'string.pattern.base': 'Mã hợp đồng không đúng định dạng',
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

export const createTerminationSchema = Joi.object({
    type: Joi.string()
        .valid(...values(TERMINATION_TYPE))
        .default(TERMINATION_TYPE.MUTUAL)
        .messages({
            'any.only': 'Loại đơn chấm dứt không hợp lệ (chỉ chấp nhận MUTUAL hoặc UNILATERAL)',
        }),
    reason: Joi.string()
        .trim()
        .min(1)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập lý do chấm dứt hợp đồng',
            'string.min': 'Vui lòng nhập lý do chấm dứt hợp đồng',
            'string.max': 'Lý do chấm dứt hợp đồng tối đa 1000 ký tự',
            'any.required': 'Vui lòng nhập lý do chấm dứt hợp đồng',
        }),
    effectiveDate: Joi.date()
        .required()
        .messages({
            'date.base': 'Ngày hiệu lực chấm dứt không hợp lệ',
            'any.required': 'Vui lòng chọn ngày hiệu lực chấm dứt hợp đồng',
        }),
    note: Joi.string()
        .trim()
        .allow('')
        .max(1000)
        .messages({
            'string.max': 'Ghi chú bàn giao tối đa 1000 ký tự',
        }),
});

export const confirmTerminationSchema = Joi.object({
    agreed: Joi.boolean()
        .valid(true)
        .required()
        .messages({
            'any.only': 'Vui lòng tích chọn đồng ý nội dung đơn chấm dứt hợp đồng',
            'boolean.base': 'Vui lòng tích chọn đồng ý nội dung đơn chấm dứt hợp đồng',
            'any.required': 'Vui lòng tích chọn đồng ý nội dung đơn chấm dứt hợp đồng',
        }),
});

export const rejectTerminationSchema = Joi.object({
    reason: Joi.string()
        .trim()
        .min(1)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập lý do từ chối đơn chấm dứt',
            'string.min': 'Vui lòng nhập lý do từ chối đơn chấm dứt',
            'string.max': 'Lý do từ chối tối đa 1000 ký tự',
            'any.required': 'Vui lòng nhập lý do từ chối đơn chấm dứt',
        }),
});

export const cancelTerminationSchema = Joi.object({
    reason: Joi.string()
        .trim()
        .min(1)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập lý do hủy đơn chấm dứt',
            'string.min': 'Vui lòng nhập lý do hủy đơn chấm dứt',
            'string.max': 'Lý do hủy đơn tối đa 1000 ký tự',
            'any.required': 'Vui lòng nhập lý do hủy đơn chấm dứt',
        }),
});

