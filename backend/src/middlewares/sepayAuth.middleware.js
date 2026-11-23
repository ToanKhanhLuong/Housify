import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest();

// Xác thực webhook SePay: bắt buộc header "Authorization: Apikey <SEPAY_API_KEY>" và so sánh hằng thời gian
export const sepayAuth = (req, res, next) => {
    const header = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
    const match = header.match(/^Apikey\s+(.+)$/i);
    const apiKey = match ? match[1].trim() : '';

    if (!env.SEPAY_API_KEY || !apiKey) {
        throw new AppError('Webhook không hợp lệ', 401);
    }

    const isValid = crypto.timingSafeEqual(sha256(apiKey), sha256(env.SEPAY_API_KEY));
    if (!isValid) {
        throw new AppError('Webhook không hợp lệ', 401);
    }
    next();
};