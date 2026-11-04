// Validation schema cho module incident (UC-43, UC-44)
import Joi from 'joi';
import { INCIDENT_STATUS, INCIDENT_TYPE, values } from '../../constants/enums.js';
import { OBJECT_ID_REGEX, commaSeparatedEnum } from '../../helpers/filter.js';

// Kiểm tra tham số ID đơn sự cố trên URL (/incidents/:id)
export const incidentIdParamSchema = Joi.object({
    id: Joi.string()
        .pattern(OBJECT_ID_REGEX)
        .required()
        .messages({
            'string.pattern.base': 'Mã đơn sự cố không đúng định dạng',
            'any.required': 'Thiếu mã đơn sự cố',
            'string.empty': 'Thiếu mã đơn sự cố',
        }),
});

// UC-43: Customer gửi báo cáo sự cố. Ảnh là đường dẫn công khai đã tải qua module upload (POST /uploads)
export const createIncidentSchema = Joi.object({
    type: Joi.string()
        .valid(...values(INCIDENT_TYPE))
        .required()
        .messages({
            'any.only': 'Loại sự cố không hợp lệ',
            'string.empty': 'Vui lòng chọn loại sự cố',
            'any.required': 'Vui lòng chọn loại sự cố',
        }),
    title: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập tiêu đề',
            'any.required': 'Vui lòng nhập tiêu đề',
        }),
    description: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập mô tả chi tiết',
            'any.required': 'Vui lòng nhập mô tả chi tiết',
        }),
    images: Joi.array()
        .items(Joi.string().uri().messages({ 'string.uri': 'Đường dẫn ảnh không hợp lệ' }))
        .default([]),
});

// UC-43, UC-44: lọc danh sách đơn. from, to là ngày gửi (YYYY-MM-DD)
export const listIncidentsSchema = Joi.object({
    status: commaSeparatedEnum(values(INCIDENT_STATUS), 'Trạng thái sự cố không hợp lệ'),
    type: commaSeparatedEnum(values(INCIDENT_TYPE), 'Loại sự cố không hợp lệ'),
    roomId: Joi.string()
        .trim()
        .pattern(OBJECT_ID_REGEX)
        .messages({
            'string.pattern.base': 'Mã phòng không hợp lệ',
        }),
    from: Joi.date()
        .iso()
        .messages({
            'date.base': 'Ngày bắt đầu không hợp lệ',
            'date.format': 'Ngày bắt đầu phải có định dạng YYYY-MM-DD',
        }),
    to: Joi.date()
        .iso()
        .messages({
            'date.base': 'Ngày kết thúc không hợp lệ',
            'date.format': 'Ngày kết thúc phải có định dạng YYYY-MM-DD',
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

// UC-44: giải quyết (ghi chú kết quả) / từ chối (lý do) đều bắt buộc resultNote
export const resolveIncidentSchema = Joi.object({
    resultNote: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập ghi chú kết quả',
            'any.required': 'Vui lòng nhập ghi chú kết quả',
        }),
});

export const rejectIncidentSchema = Joi.object({
    resultNote: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập lý do từ chối',
            'any.required': 'Vui lòng nhập lý do từ chối',
        }),
});
