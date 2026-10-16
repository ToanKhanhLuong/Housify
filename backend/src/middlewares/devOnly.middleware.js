import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Chặn /api/dev khi ENABLE_DEV_ROUTES tắt
export const devOnly = (req, res, next) => {
    if (!env.ENABLE_DEV_ROUTES) throw new AppError('Không tìm thấy', 404);
    next();
};