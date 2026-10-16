import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Xác thực webhook SePay: header "Authorization: Apikey <SEPAY_API_KEY>"
export const sepayAuth = (req, res, next) => {
    const header = req.headers.authorization || '';
    const apiKey = header.replace('Apikey ', '').trim();

    if (!env.SEPAY_API_KEY || apiKey !== env.SEPAY_API_KEY) {
        throw new AppError('Webhook không hợp lệ', 401);
    }
    next();
};