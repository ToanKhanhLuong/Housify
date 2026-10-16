import { AppError } from '../utils/AppError.js';

// Chạy Joi schema trên req[property] (mặc định body).
export const validate = (schema, property = 'body') => (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
        abortEarly: false,   // gom hết lỗi
        stripUnknown: true,  // bỏ field thừa
    });

    if (error) {
        const errors = error.details.map((d) => ({
            field: d.path.join('.'),
            message: d.message,
        }));
        throw new AppError('Dữ liệu không hợp lệ', 422, errors);
    }

    req[property] = value; // gán lại giá trị đã chuẩn hóa
    next();
};