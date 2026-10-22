// Middleware xác thực token và kiểm tra trạng thái tài khoản mỗi request (BR-027)
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { MSG } from '../constants/messages.js';
import { USER_STATUS } from '../constants/enums.js';
import User from '../models/User.js';

// Xác thực token từ header Authorization: Bearer <token>
export const auth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            throw new AppError(MSG.UNAUTHORIZED, 401);
        }

        const token = header.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, env.JWT_SECRET);
        } catch {
            throw new AppError(MSG.TOKEN_INVALID, 401);
        }

        // Đọc lại trạng thái tài khoản trong database mỗi request (BR-027)
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new AppError(MSG.UNAUTHORIZED, 401);
        }

        if (user.status !== USER_STATUS.ACTIVE) {

            // Tài khoản bị khóa
            if (user.status === USER_STATUS.LOCKED) {
                throw new AppError(MSG.ACCOUNT_LOCKED, 401);
            }
            // Tài khoản ngừng hoạt động
            if (user.status === USER_STATUS.INACTIVE) {
                throw new AppError('Tài khoản đã ngưng hoạt động, vui lòng đăng nhập lại', 401);
            }
            // Tài khoản chưa kích hoạt
            if (user.status === USER_STATUS.PENDING) {
                throw new AppError(MSG.ACCOUNT_NOT_ACTIVATED, 401);
            }
            throw new AppError('Tài khoản không còn hoạt động, vui lòng đăng nhập lại', 401);
        }

        req.user = {
            id: user._id.toString(),
            _id: user._id,
            email: user.email,
            role: user.roleId,
            status: user.status,
        };

        next();
    } catch (error) {
        next(error);
    }
};
