// Nghiệp vụ cho module auth: đăng nhập và lấy thông tin tài khoản (UC-01)
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ROLE, USER_STATUS } from '../../constants/enums.js';
import { MSG } from '../../constants/messages.js';
import { AppError } from '../../utils/AppError.js';
import User from '../../models/User.js';
import Manager from '../../models/Manager.js';
import Occupant from '../../models/Occupant.js';
import Building from '../../models/Building.js';

export const getMe = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError(MSG.NOT_FOUND('Tài khoản'), 404);
    }

    const userData = {
        id: user._id,
        email: user.email,
        role: user.roleId,
        status: user.status,
        name: '',
    };

    if (user.roleId === ROLE.ADMIN) {
        userData.name = 'Admin';
    } else if (user.roleId === ROLE.MANAGER) {
        const manager = await Manager.findOne({ userId: user._id });
        userData.name = manager?.name || 'Manager';
        userData.phone = manager?.phone || '';
        const building = await Building.findOne({ managerId: user._id, isDeleted: false }).select('_id name address');
        userData.building = building ? { id: building._id, _id: building._id, name: building.name, address: building.address } : null;
    } else if (user.roleId === ROLE.CUSTOMER) {
        const occupant = await Occupant.findOne({ userId: user._id, isRepresentative: true }).sort({ createdAt: -1 });
        userData.name = occupant?.name || 'Khách hàng';
        userData.phone = occupant?.phone || '';
        userData.cccd = occupant?.cccd || '';
    }

    return userData;
};

export const login = async ({ identifier, password, remember = false }) => {
    const cleanIdentifier = identifier.trim();
    let user = null;

    // Đúng 12 chữ số: hiểu là CCCD của khách
    if (/^\d{12}$/.test(cleanIdentifier)) {
        const occupant = await Occupant.findOne({ cccd: cleanIdentifier, isRepresentative: true });
        if (!occupant || !occupant.userId) {
            // Sai mật khẩu hoặc không có tài khoản đều báo chung một câu để tránh dò tài khoản
            throw new AppError(MSG.INVALID_CREDENTIALS, 401);
        }
        user = await User.findById(occupant.userId).select('+password');
    } else {
        // Còn lại hiểu là email của Admin hoặc Manager
        user = await User.findOne({ email: cleanIdentifier.toLowerCase() }).select('+password');
    }

    if (!user) {
        throw new AppError(MSG.INVALID_CREDENTIALS, 401);
    }

    // Manager chưa kích hoạt thì chưa có mật khẩu, báo mở email bấm link kích hoạt
    if (user.roleId === ROLE.MANAGER && (user.status === USER_STATUS.PENDING || !user.password)) {
        throw new AppError('Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để đặt mật khẩu và kích hoạt tài khoản', 403);
    }

    // So sánh mật khẩu
    if (!user.password) {
        throw new AppError(MSG.INVALID_CREDENTIALS, 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError(MSG.INVALID_CREDENTIALS, 401);
    }

    // Chỉ báo rõ lý do khi đã đúng mật khẩu: bị khóa, hoặc đã ngưng hoạt động
    if (user.status === USER_STATUS.LOCKED) {
        throw new AppError(MSG.ACCOUNT_LOCKED, 403);
    }

    if (user.status === USER_STATUS.INACTIVE) {
        throw new AppError('Tài khoản đã ngưng hoạt động. Vui lòng kiểm tra email kích hoạt nếu bạn vừa có hợp đồng mới', 403);
    }

    if (user.status !== USER_STATUS.ACTIVE) {
        throw new AppError('Tài khoản không ở trạng thái hoạt động', 403);
    }

    // Cấp token: ghi nhớ đăng nhập theo JWT_REMEMBER_EXPIRES, ngược lại JWT_EXPIRES
    const expiresIn = remember ? env.JWT_REMEMBER_EXPIRES : env.JWT_EXPIRES;
    const token = jwt.sign(
        {
            id: user._id.toString(),
            role: user.roleId,
        },
        env.JWT_SECRET,
        { expiresIn },
    );

    const me = await getMe(user._id);

    return {
        token,
        user: me,
    };
};
