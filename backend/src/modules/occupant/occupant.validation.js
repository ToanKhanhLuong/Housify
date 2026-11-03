// Validation schema cho module occupant (UC-30, UC-31, UC-32, UC-33)
import Joi from 'joi';
import { OCCUPANT_STATUS, values } from '../../constants/enums.js';
import { CCCD_REGEX, PHONE_REGEX } from '../../helpers/validators.js';
import { OBJECT_ID_REGEX, commaSeparatedEnum } from '../../helpers/filter.js';

// Kiểm tra tham số ID cư dân trên URL (/occupants/:id, /occupants/:id/leave)
export const occupantIdParamSchema = Joi.object({
    id: Joi.string()
        .pattern(OBJECT_ID_REGEX)
        .required()
        .messages({
            'string.pattern.base': 'Mã cư dân không đúng định dạng',
            'any.required': 'Thiếu mã cư dân',
            'string.empty': 'Thiếu mã cư dân',
        }),
});

// Kiểm tra tham số ID hợp đồng trên URL (/contracts/:id/occupants)
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

// Schema lọc danh sách cư dân (UC-30)
export const listOccupantsSchema = Joi.object({
    roomId: Joi.string()
        .trim()
        .pattern(OBJECT_ID_REGEX)
        .messages({
            'string.pattern.base': 'Mã phòng không hợp lệ',
        }),
    status: commaSeparatedEnum(values(OCCUPANT_STATUS), 'Trạng thái cư dân không hợp lệ'),
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

// Schema sửa thông tin cư dân (UC-31)
export const updateOccupantSchema = Joi.object({
    name: Joi.string()
        .trim()
        .max(100)
        .messages({
            'string.empty': 'Họ tên không được để trống',
            'string.max': 'Họ tên tối đa 100 ký tự',
        }),
    phone: Joi.string()
        .trim()
        .pattern(PHONE_REGEX)
        .messages({
            'string.empty': 'Số điện thoại không được để trống',
            'string.pattern.base': 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)',
        }),
    dateOfBirth: Joi.date()
        .max('now')
        .messages({
            'date.base': 'Ngày sinh không hợp lệ',
            'date.max': 'Ngày sinh không được ở tương lai',
        }),
    address: Joi.string()
        .trim()
        .allow('', null)
        .max(255)
        .messages({
            'string.max': 'Địa chỉ tối đa 255 ký tự',
        }),
    cccd: Joi.string()
        .trim()
        .pattern(CCCD_REGEX)
        .messages({
            'string.empty': 'Số CCCD không được để trống',
            'string.pattern.base': 'Số CCCD phải gồm đúng 12 chữ số',
        }),
    relationship: Joi.string()
        .trim()
        .allow('', null)
        .max(50)
        .messages({
            'string.max': 'Quan hệ với người đại diện tối đa 50 ký tự',
        }),
    cccdFrontImage: Joi.string()
        .trim()
        .allow('', null)
        .max(255),
    cccdBackImage: Joi.string()
        .trim()
        .allow('', null)
        .max(255),
})
    .min(1)
    .messages({
        'object.min': 'Vui lòng cung cấp dữ liệu cần cập nhật',
    });

// Schema thêm người ở cùng vào hợp đồng đang hiệu lực (UC-32)
export const addOccupantSchema = Joi.object({
    name: Joi.string()
        .trim()
        .max(100)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập họ tên người ở cùng',
            'string.max': 'Họ tên tối đa 100 ký tự',
            'any.required': 'Vui lòng nhập họ tên người ở cùng',
        }),
    cccd: Joi.string()
        .trim()
        .pattern(CCCD_REGEX)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập số CCCD',
            'string.pattern.base': 'Số CCCD phải gồm đúng 12 chữ số',
            'any.required': 'Vui lòng nhập số CCCD',
        }),
    phone: Joi.string()
        .trim()
        .pattern(PHONE_REGEX)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập số điện thoại',
            'string.pattern.base': 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)',
            'any.required': 'Vui lòng nhập số điện thoại',
        }),
    dateOfBirth: Joi.date()
        .max('now')
        .required()
        .messages({
            'date.base': 'Ngày sinh không hợp lệ',
            'date.max': 'Ngày sinh không được ở tương lai',
            'any.required': 'Vui lòng nhập ngày sinh',
        }),
    address: Joi.string()
        .trim()
        .allow('', null)
        .max(255)
        .messages({
            'string.max': 'Địa chỉ tối đa 255 ký tự',
        }),
    joinDate: Joi.date()
        .default(() => new Date())
        .messages({
            'date.base': 'Ngày bắt đầu ở không hợp lệ',
        }),
    relationship: Joi.string()
        .trim()
        .allow('', null)
        .max(50)
        .messages({
            'string.max': 'Quan hệ với người đại diện tối đa 50 ký tự',
        }),
    cccdFrontImage: Joi.string()
        .trim()
        .allow('', null)
        .max(255),
    cccdBackImage: Joi.string()
        .trim()
        .allow('', null)
        .max(255),
});

// Schema rút tên người ở cùng (UC-33)
export const leaveOccupantSchema = Joi.object({
    exitDate: Joi.date()
        .messages({
            'date.base': 'Ngày chuyển ra không hợp lệ',
        }),
    note: Joi.string()
        .trim()
        .allow('', null)
        .max(500)
        .messages({
            'string.max': 'Ghi chú tối đa 500 ký tự',
        }),
});
