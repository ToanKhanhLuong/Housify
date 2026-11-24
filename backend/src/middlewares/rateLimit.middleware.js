// Middleware giới hạn tần suất gọi API theo địa chỉ IP để chống spam tài nguyên (UC-06)
import { AppError } from '../utils/AppError.js';

const extractClientIp = (request) => {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress || 'unknown';
};

export const createRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 30,
    message = 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau ít phút',
} = {}) => {
    const hitsByIp = new Map();
    let lastSweepAt = Date.now();

    return (request, response, next) => {
        const now = Date.now();

        // Dọn dẹp định kỳ các IP đã hết cửa sổ thời gian để tránh tích tụ bộ nhớ
        if (now - lastSweepAt >= windowMs) {
            for (const [key, bucket] of hitsByIp.entries()) {
                if (bucket.resetAt <= now) {
                    hitsByIp.delete(key);
                }
            }
            lastSweepAt = now;
        }

        const clientIp = extractClientIp(request);
        let bucket = hitsByIp.get(clientIp);

        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            hitsByIp.set(clientIp, bucket);
        }

        bucket.count += 1;

        if (bucket.count > max) {
            const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
            if (typeof response?.setHeader === 'function') {
                response.setHeader('Retry-After', String(retryAfterSeconds));
            }
            return next(new AppError(message, 429));
        }

        return next();
    };
};
