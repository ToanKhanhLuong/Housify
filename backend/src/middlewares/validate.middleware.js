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

    // gán lại giá trị đã chuẩn hóa; Express 5: req.query chỉ có getter, gán thẳng sẽ lỗi nên phải defineProperty
    if (property === 'query') {
        Object.defineProperty(req, 'query', { value, writable: true, configurable: true, enumerable: true });
    } else {
        req[property] = value;
    }
    next();
};