import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { MSG } from '../constants/messages.js';

// Xác thực token từ header Authorization: Bearer <token>
export const auth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        throw new AppError(MSG.UNAUTHORIZED, 401);
    }

    try {
        const token = header.split(' ')[1];
        req.user = jwt.verify(token, env.JWT_SECRET);
        next();
    } catch {
        throw new AppError(MSG.TOKEN_INVALID, 401);
    }
};