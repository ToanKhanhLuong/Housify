import { ROLE } from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import Building from '../models/building.model.js';

/**
 * Chặn Manager thao tác trên tòa nhà không thuộc quyền quản lý.
 * - Admin: bỏ qua, cho qua hết.
 * - Manager: buildingId (từ params/body) phải khớp tòa họ quản lý.
 * Đặt sau auth + requireRole(ROLE.MANAGER, ROLE.ADMIN).
 */
export const requireManagerBuilding = (getBuildingId) => async (req, res, next) => {
    // Admin không bị giới hạn
    if (req.user.role === ROLE.ADMIN) return next();

    const buildingId = getBuildingId(req);
    if (!buildingId) {
        throw new AppError('Thiếu thông tin tòa nhà', 400);
    }

    const building = await Building.findById(buildingId).select('managerId');
    if (!building) {
        throw new AppError('Tòa nhà không tồn tại', 404);
    }

    if (String(building.managerId) !== String(req.user.id)) {
        throw new AppError('Bạn không quản lý tòa nhà này', 403);
    }

    next();
};