// Validation schema cho module dashboard (UC-07, UC-47, UC-48)
import Joi from 'joi';
import { OBJECT_ID_REGEX } from '../../helpers/filter.js';

const buildingIdField = Joi.string()
    .trim()
    .pattern(OBJECT_ID_REGEX)
    .messages({
        'string.pattern.base': 'Mã tòa nhà không hợp lệ',
    });

// UC-07: Admin lọc theo một tòa, bỏ trống là toàn hệ thống
export const adminDashboardSchema = Joi.object({
    buildingId: buildingIdField,
});

// UC-48: kỳ báo cáo from, to (YYYY-MM-DD, giờ Việt Nam); bỏ trống là tháng hiện tại. Tháng / quý / năm do FE đổi thành from, to
export const reportSchema = Joi.object({
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
    buildingId: buildingIdField,
})
    .custom((value, helpers) => {
        if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
            return helpers.message('Ngày bắt đầu không được lớn hơn ngày kết thúc');
        }
        return value;
    });
