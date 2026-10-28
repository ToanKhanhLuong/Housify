// Nghiệp vụ kích hoạt tài khoản Manager (UC-08 bước 6–8)
import bcrypt from 'bcryptjs';
import { AppError } from '../../utils/AppError.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { hashActivationToken } from '../../helpers/activationToken.js';
import { ACTIVATION_TYPE, TOKEN_STATUS, USER_STATUS } from '../../constants/enums.js';
import User from '../../models/User.js';
import Manager from '../../models/Manager.js';
import ActivationToken from '../../models/ActivationToken.js';

const LINK_NOT_FOUND = 'Link kích hoạt không tồn tại';
const LINK_EXPIRED_OR_USED = 'Link kích hoạt đã hết hạn hoặc đã được sử dụng';

/**
 * Kiểm tra tính hợp lệ của link kích hoạt Manager
 * @param {string} token - Mã token gốc nhận được từ link
 * @returns {Promise<{ activationToken: Object, user: Object }>}
 */
const validateActivationToken = async (token) => {
    if (!token || typeof token !== 'string') {
        throw new AppError(LINK_NOT_FOUND, 404);
    }

    const tokenHash = hashActivationToken(token);
    const activationToken = await ActivationToken.findOne({
        type: ACTIVATION_TYPE.MANAGER_ACTIVATION,
        token: tokenHash,
    });

    if (!activationToken) {
        throw new AppError(LINK_NOT_FOUND, 404);
    }

    const user = await User.findById(activationToken.userId);
    if (!user) {
        throw new AppError(LINK_NOT_FOUND, 404);
    }

    const isInvalid =
        activationToken.status === TOKEN_STATUS.USED ||
        activationToken.status === TOKEN_STATUS.EXPIRED ||
        activationToken.expiresAt <= new Date() ||
        user.status !== USER_STATUS.PENDING;

    if (isInvalid) {
        throw new AppError(LINK_EXPIRED_OR_USED, 400);
    }

    return { activationToken, user };
};

/**
 * Lấy thông tin cơ bản của Manager từ link kích hoạt (chỉ name, email)
 * @param {string} token
 * @returns {Promise<{ name: string, email: string }>}
 */
export const getManagerActivationInfo = async (token) => {
    const { user } = await validateActivationToken(token);
    const manager = await Manager.findOne({ userId: user._id });

    return {
        name: manager?.name || '',
        email: user.email,
    };
};

/**
 * Kích hoạt tài khoản Manager: đổi trạng thái sang ACTIVE, cập nhật mật khẩu, đánh dấu token USED
 * @param {Object} param0
 * @param {string} param0.token
 * @param {string} param0.password
 */
export const activateManager = async ({ token, password }) => {
    const { activationToken, user } = await validateActivationToken(token);

    await withTransaction(async (session) => {
        // Cập nhật token sang USED có điều kiện để chống race condition
        const tokenUpdateResult = await ActivationToken.updateOne(
            {
                _id: activationToken._id,
                status: { $in: [null] },
                expiresAt: { $gt: new Date() },
            },
            { status: TOKEN_STATUS.USED },
            { session },
        );

        if (tokenUpdateResult.matchedCount === 0) {
            throw new AppError(LINK_EXPIRED_OR_USED, 400);
        }

        // Cập nhật mật khẩu và chuyển trạng thái user PENDING -> ACTIVE
        const hashedPassword = await bcrypt.hash(password, 10);
        const userUpdateResult = await User.updateOne(
            {
                _id: user._id,
                status: USER_STATUS.PENDING,
            },
            {
                password: hashedPassword,
                status: USER_STATUS.ACTIVE,
            },
            { session },
        );

        if (userUpdateResult.matchedCount === 0) {
            throw new AppError(LINK_EXPIRED_OR_USED, 400);
        }
    });
};

