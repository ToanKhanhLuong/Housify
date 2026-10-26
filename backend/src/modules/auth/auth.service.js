// Nghiệp vụ cho module auth: đăng nhập, lấy thông tin tài khoản, đổi mật khẩu, quên mật khẩu (UC-01, UC-03, UC-04)
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { ROLE, USER_STATUS, TOKEN_STATUS } from '../../constants/enums.js';
import { MSG } from '../../constants/messages.js';
import { AppError } from '../../utils/AppError.js';
import { sendMail } from '../../config/mail.js';
import User from '../../models/User.js';
import Manager from '../../models/Manager.js';
import Occupant from '../../models/Occupant.js';
import Building from '../../models/Building.js';
import OtpToken from '../../models/OtpToken.js';

export const getMe = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError(MSG.NOT_FOUND('Tài khoản'), 404);
    }

    const userData = {
        _id: user._id,
        email: user.email,
        role: user.roleId,
        status: user.status,
        name: '',
        building: null,
    };

    if (user.roleId === ROLE.ADMIN) {
        userData.name = 'Admin';
    } else if (user.roleId === ROLE.MANAGER) {
        const manager = await Manager.findOne({ userId: user._id });
        userData.name = manager?.name || 'Manager';
        userData.phone = manager?.phone || '';
        const building = await Building.findOne({ managerId: user._id, isDeleted: false })
            .select('name address')
            .lean();
        userData.building = building; // { _id, name, address } hoặc null
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
        if (user?.roleId === ROLE.CUSTOMER) user = null;
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

export const changePassword = async (userId, { currentPassword, newPassword }) => {
    const user = await User.findById(userId).select('+password');
    if (!user) {
        throw new AppError(MSG.NOT_FOUND('Tài khoản'), 404);
    }

    const isMatch = user.password ? await bcrypt.compare(currentPassword, user.password) : false;
    if (!isMatch) {
        throw new AppError('Mật khẩu hiện tại không đúng', 400);
    }

    // BR-006: mật khẩu mới không được trùng mật khẩu hiện tại
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
        throw new AppError('Mật khẩu mới không được trùng mật khẩu hiện tại', 400);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
};

// OTP chưa dùng: status trống (null hoặc không có field)
const UNUSED_OTP = { $in: [null] };

export const forgotPassword = async ({ email }) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

    // BR-008, BR-021: không lộ email có tồn tại hay không; Manager chưa kích hoạt / chưa có mật khẩu thì không gửi OTP
    const canSend = user && user.password && !(user.roleId === ROLE.MANAGER && user.status === USER_STATUS.PENDING);
    if (canSend) {
        // Gửi lại thì OTP cũ chưa dùng mất hiệu lực
        await OtpToken.updateMany({ userId: user._id, status: UNUSED_OTP }, { status: TOKEN_STATUS.EXPIRED });

        const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
        await OtpToken.create({
            userId: user._id,
            otp: await bcrypt.hash(otp, 10),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // BR-007
        });

        const sent = await sendMail(
            user.email,
            'Housify - Mã OTP đặt lại mật khẩu',
            `<p>Mã OTP đặt lại mật khẩu của bạn là: <b>${otp}</b></p>
<p>Mã có hiệu lực trong 5 phút.</p>
<p>Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này.</p>`,
        );
        if (!sent) {
            throw new AppError('Gửi email thất bại, vui lòng thử lại sau', 500);
        }
    }
};

const findValidOtp = async (email, otp) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
        throw new AppError('Mã OTP không đúng hoặc đã hết hạn', 400);
    }

    const otpDoc = await OtpToken.findOne({
        userId: user._id,
        status: UNUSED_OTP,
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    const isMatch = otpDoc ? await bcrypt.compare(otp, otpDoc.otp) : false;
    if (!isMatch) {
        throw new AppError('Mã OTP không đúng hoặc đã hết hạn', 400);
    }

    return { user, otpDoc };
};

export const verifyOtp = async ({ email, otp }) => {
    await findValidOtp(email, otp);
};

export const resetPassword = async ({ email, otp, newPassword }) => {
    const { user, otpDoc } = await findValidOtp(email, otp);

    const userWithPassword = await User.findById(user._id).select('+password');
    const isSame = userWithPassword.password ? await bcrypt.compare(newPassword, userWithPassword.password) : false;
    if (isSame) {
        throw new AppError('Mật khẩu mới không được trùng mật khẩu hiện tại', 400);
    }

    userWithPassword.password = await bcrypt.hash(newPassword, 10);
    await userWithPassword.save();

    otpDoc.status = TOKEN_STATUS.USED;
    await otpDoc.save();
};
