import { AppError } from '../utils/AppError.js';
import { MSG } from '../constants/messages.js';

// Chặn nếu role của user không nằm trong danh sách cho phép
// Dùng: requireRole(ROLE.ADMIN), requireRole(ROLE.ADMIN, ROLE.MANAGER)
export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        throw new AppError(MSG.UNAUTHORIZED, 401);
    }
    if (!roles.includes(req.user.role)) {
        throw new AppError(MSG.FORBIDDEN, 403);
    }
    next();
};