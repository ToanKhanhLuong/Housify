// Nghiệp vụ cho module manager: tạo, xem, sửa, xóa, gửi lại link, khóa / mở khóa, phân công tòa (UC-08 bước 1–5, UC-09, UC-10, UC-11)
// Chỉ Admin dùng. Mail luôn gửi SAU khi transaction commit; gửi lỗi thì việc chính vẫn thành công, trả kèm warning.
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import {
    ROLE,
    USER_STATUS,
    TOKEN_STATUS,
    ACTIVATION_TYPE,
    CONTRACT_STATUS,
    NOTIFICATION_TYPE,
    AUDIT_ACTION,
} from '../../constants/enums.js';
import { AppError } from '../../utils/AppError.js';
import { paginate } from '../../utils/pagination.js';
import { sendMail } from '../../config/mail.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { notify } from '../../helpers/notify.js';
import { audit } from '../../helpers/audit.js';
import { generateActivationToken, ACTIVATION_TOKEN_TTL_MS } from '../../helpers/activationToken.js';
import { getSignedUrl } from '../upload/upload.service.js';
import User from '../../models/User.js';
import Manager from '../../models/Manager.js';
import Occupant from '../../models/Occupant.js';
import Building from '../../models/Building.js';
import Room from '../../models/Room.js';
import Contract from '../../models/Contract.js';
import ActivationToken from '../../models/ActivationToken.js';

const MANAGER_NOT_FOUND = 'Không tìm thấy Manager';
const BUILDING_NOT_FOUND = 'Không tìm thấy tòa nhà';
const MAIL_FAILED = 'Gửi email thất bại';

// Link chưa dùng: status trống (null hoặc không có field)
const UNUSED_TOKEN = { $in: [null] };

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[char]));

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ===== Mail (M1–M5) =====

const sendActivationMail = (email, name, token) => sendMail(
    email,
    '[Housify] Kích hoạt tài khoản Manager',
    `<p>Xin chào ${escapeHtml(name)},</p>
<p>Admin đã tạo tài khoản Manager cho bạn trên hệ thống Housify.</p>
<p>Email đăng nhập: <b>${escapeHtml(email)}</b></p>
<p><a href="${env.CLIENT_URL}/activate/manager/${token}">Kích hoạt tài khoản</a></p>
<p>Link có hiệu lực trong 24 giờ và chỉ dùng được 1 lần.</p>
<p>Nếu bạn không phải người nhận, vui lòng bỏ qua email này.</p>`,
);

const sendLockMail = (email, name, reason) => sendMail(
    email,
    '[Housify] Tài khoản của bạn đã bị khóa',
    `<p>Xin chào ${escapeHtml(name)},</p>
<p>Tài khoản Manager của bạn trên hệ thống Housify đã bị khóa.</p>
<p>Lý do: ${escapeHtml(reason)}</p>
<p>Nếu cần hỗ trợ, vui lòng liên hệ Admin.</p>`,
);

const sendUnlockMail = (email, name) => sendMail(
    email,
    '[Housify] Tài khoản của bạn đã được mở khóa',
    `<p>Xin chào ${escapeHtml(name)},</p>
<p>Tài khoản Manager của bạn trên hệ thống Housify đã được mở khóa.</p>
<p>Bạn có thể đăng nhập lại.</p>`,
);

const sendAssignMail = (email, name, building) => sendMail(
    email,
    `[Housify] Bạn được phân công phụ trách tòa ${building.name}`,
    `<p>Xin chào ${escapeHtml(name)},</p>
<p>Bạn được phân công phụ trách tòa <b>${escapeHtml(building.name)}</b>.</p>
<p>Địa chỉ: ${escapeHtml(building.address)}</p>`,
);

const sendUnassignMail = (email, name, building) => sendMail(
    email,
    `[Housify] Bạn không còn phụ trách tòa ${building.name}`,
    `<p>Xin chào ${escapeHtml(name)},</p>
<p>Bạn không còn phụ trách tòa <b>${escapeHtml(building.name)}</b>.</p>`,
);

// ===== Dùng chung =====

// Id sai định dạng, không có, hoặc không phải Manager đều là 404
const findManager = async (id) => {
    if (!mongoose.isObjectIdOrHexString(id)) {
        throw new AppError(MANAGER_NOT_FOUND, 404);
    }

    const user = await User.findOne({ _id: id, roleId: ROLE.MANAGER });
    const profile = user ? await Manager.findOne({ userId: user._id }) : null;
    if (!user || !profile) {
        throw new AppError(MANAGER_NOT_FOUND, 404);
    }
    return { user, profile };
};

// BR-019: email duy nhất toàn hệ thống
const ensureEmailAvailable = async (email, exceptUserId) => {
    const filter = { email };
    if (exceptUserId) {
        filter._id = { $ne: exceptUserId };
    }
    if (await User.exists(filter)) {
        throw new AppError('Email đã tồn tại trong hệ thống', 409);
    }
};

// BR-010: 1 số chỉ thuộc 1 người – kiểm chéo managers và occupants, Manager so theo userId
const ensurePhoneAvailable = async (phone, exceptUserId) => {
    const managerFilter = { phone };
    if (exceptUserId) {
        managerFilter.userId = { $ne: exceptUserId };
    }
    const phoneUsed = await Manager.exists(managerFilter) || await Occupant.exists({ phone });
    if (phoneUsed) {
        throw new AppError('Số điện thoại đã tồn tại trong hệ thống', 409);
    }
};

const toListItem = (user, profile, building) => ({
    _id: user._id,
    name: profile?.name ?? null,
    email: user.email,
    phone: profile?.phone ?? null,
    status: user.status,
    building: building ? { _id: building._id, name: building.name } : null,
    createdAt: user.createdAt,
});

const countActiveContracts = async (buildingId) => {
    const roomIds = await Room.find({ buildingId }).distinct('_id');
    return Contract.countDocuments({ roomId: { $in: roomIds }, status: CONTRACT_STATUS.ACTIVE });
};

const buildDetail = async (user, profile) => {
    const building = await Building.findOne({ managerId: user._id, isDeleted: false })
        .select('name address')
        .lean();

    return {
        _id: user._id,
        name: profile.name,
        email: user.email,
        phone: profile.phone,
        status: user.status,
        dateOfBirth: profile.dateOfBirth || null,
        address: profile.address || null,
        cccdFrontImage: profile.cccdFrontImage || null,
        cccdBackImage: profile.cccdBackImage || null,
        cccdFrontUrl: getSignedUrl(profile.cccdFrontImage),
        cccdBackUrl: getSignedUrl(profile.cccdBackImage),
        createdAt: user.createdAt,
        // Số hợp đồng ACTIVE để Admin cân nhắc trước khi khóa (manager.md – UC-09)
        building: building
            ? {
                _id: building._id,
                name: building.name,
                address: building.address,
                activeContractCount: await countActiveContracts(building._id),
            }
            : null,
    };
};

const createActivationToken = (userId, email, adminId, tokenHash, session) => ActivationToken.create(
    [
        {
            type: ACTIVATION_TYPE.MANAGER_ACTIVATION,
            userId,
            token: tokenHash,
            sentTo: email,
            expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
            createdBy: adminId,
        },
    ],
    { session },
);

// ===== UC-08: tạo tài khoản =====

export const createManager = async (adminId, { name, email, phone }) => {
    await ensureEmailAvailable(email);
    await ensurePhoneAvailable(phone);

    const { token, tokenHash } = generateActivationToken();

    // PENDING, chưa có mật khẩu (BR-020, BR-021); không ghi field cccd
    const { user, profile } = await withTransaction(async (session) => {
        const [createdUser] = await User.create(
            [
                {
                    email,
                    roleId: ROLE.MANAGER,
                    status: USER_STATUS.PENDING,
                },
            ],
            { session },
        );
        const [createdProfile] = await Manager.create(
            [
                {
                    userId: createdUser._id,
                    name,
                    phone,
                },
            ],
            { session },
        );
        await createActivationToken(createdUser._id, email, adminId, tokenHash, session);
        return { user: createdUser, profile: createdProfile };
    });

    const sent = await sendActivationMail(user.email, profile.name, token);

    const data = toListItem(user, profile, null);
    if (!sent) {
        data.warning = 'Gửi email thất bại — vui lòng gửi lại tại danh sách Manager';
    }
    return data;
};

// ===== UC-09: danh sách, chi tiết, sửa, xóa, gửi lại link =====

export const listManagers = async ({ status, q, unassigned, page, limit }) => {
    const filter = { roleId: ROLE.MANAGER };
    if (status) {
        filter.status = status;
    }

    // Tìm theo họ tên (manager.md – UC-09)
    if (q) {
        const userIds = await Manager.find({ name: { $regex: escapeRegex(q), $options: 'i' } }).distinct('userId');
        filter._id = { $in: userIds };
    }

    // Chưa phụ trách tòa nào (chỉ tính tòa chưa xóa mềm) – danh sách chọn ở UC-11
    if (unassigned) {
        const assignedIds = await Building.find({ isDeleted: false, managerId: { $type: 'objectId' } }).distinct('managerId');
        filter._id = { ...filter._id, $nin: assignedIds };
    }

    const result = await paginate(User, filter, {
        page,
        limit,
        sort: { createdAt: -1 },
        select: 'email status createdAt',
    });

    const userIds = result.items.map((user) => user._id);
    const [profiles, buildings] = await Promise.all([
        Manager.find({ userId: { $in: userIds } }).select('userId name phone').lean(),
        Building.find({ managerId: { $in: userIds }, isDeleted: false }).select('name managerId').lean(),
    ]);
    const profileByUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
    const buildingByUser = new Map(buildings.map((building) => [String(building.managerId), building]));

    return {
        ...result,
        items: result.items.map((user) => toListItem(
            user,
            profileByUser.get(String(user._id)),
            buildingByUser.get(String(user._id)),
        )),
    };
};

export const getManager = async (id) => {
    const { user, profile } = await findManager(id);
    return buildDetail(user, profile);
};

// Các ô lưu ở managers
const PROFILE_FIELDS = ['name', 'phone', 'dateOfBirth', 'address', 'cccdFrontImage', 'cccdBackImage'];

const isSameValue = (field, newValue, oldValue) => {
    if (field === 'dateOfBirth') {
        return Boolean(oldValue) && new Date(newValue).getTime() === new Date(oldValue).getTime();
    }
    return newValue === oldValue;
};

export const updateManager = async (adminId, id, body) => {
    const { user, profile } = await findManager(id);

    // BR-026: tài khoản chưa kích hoạt thì xóa đi tạo lại, không sửa
    if (user.status === USER_STATUS.PENDING) {
        throw new AppError('Tài khoản chưa kích hoạt không được chỉnh sửa. Vui lòng xóa và tạo lại', 400);
    }

    // Giá trị gửi lên giống giá trị đang lưu thì coi như không đổi
    const changes = {};
    for (const field of PROFILE_FIELDS) {
        if (body[field] !== undefined && !isSameValue(field, body[field], profile[field])) {
            changes[field] = body[field];
        }
    }
    const emailChanged = body.email !== undefined && body.email !== user.email;

    if (!emailChanged && Object.keys(changes).length === 0) {
        return {
            changed: false,
            manager: await buildDetail(user, profile),
        };
    }

    if (emailChanged) {
        await ensureEmailAvailable(body.email, user._id);
    }
    if (changes.phone !== undefined) {
        await ensurePhoneAvailable(changes.phone, user._id);
    }

    // Email ở users, các ô còn lại ở managers; log chỉ ghi tên trường, không ghi giá trị ảnh
    const changedFields = [...(emailChanged ? ['email'] : []), ...Object.keys(changes)];
    await withTransaction(async (session) => {
        if (emailChanged) {
            user.email = body.email;
            await user.save({ session });
        }
        if (Object.keys(changes).length > 0) {
            Object.assign(profile, changes);
            await profile.save({ session });
        }
        await audit({
            actorId: adminId,
            action: AUDIT_ACTION.UPDATE_MANAGER,
            targetType: 'users',
            targetId: user._id,
            metadata: { fields: changedFields },
        }, session);
    });

    return {
        changed: true,
        manager: await buildDetail(user, profile),
    };
};

export const deleteManager = async (adminId, id) => {
    const { user, profile } = await findManager(id);

    // BR-026: chỉ xóa cứng tài khoản chưa kích hoạt
    if (user.status !== USER_STATUS.PENDING) {
        throw new AppError('Chỉ xóa được tài khoản chưa kích hoạt', 400);
    }

    await withTransaction(async (session) => {
        await ActivationToken.deleteMany({ userId: user._id }, { session });
        await Manager.deleteOne({ userId: user._id }, { session });
        await User.deleteOne({ _id: user._id }, { session });
        // Không xóa kéo theo tòa: chỉ bỏ phân công nếu có (business_rule.md – Xóa Manager PENDING)
        await Building.updateMany({ managerId: user._id }, { $unset: { managerId: 1 } }, { session });
        // User đã mất nên lưu lại tên và email
        await audit({
            actorId: adminId,
            action: AUDIT_ACTION.DELETE_MANAGER,
            targetType: 'users',
            targetId: user._id,
            metadata: { name: profile.name, email: user.email },
        }, session);
    });
};

export const resendActivation = async (adminId, id) => {
    const { user, profile } = await findManager(id);
    if (user.status !== USER_STATUS.PENDING) {
        throw new AppError('Tài khoản đã được kích hoạt', 400);
    }

    const { token, tokenHash } = generateActivationToken();

    // Link cũ chưa dùng hết hiệu lực ngay, sinh link mới 24h
    await withTransaction(async (session) => {
        await ActivationToken.updateMany(
            { userId: user._id, type: ACTIVATION_TYPE.MANAGER_ACTIVATION, status: UNUSED_TOKEN },
            { status: TOKEN_STATUS.EXPIRED },
            { session },
        );
        await createActivationToken(user._id, user.email, adminId, tokenHash, session);
        await audit({
            actorId: adminId,
            action: AUDIT_ACTION.RESEND_ACTIVATION,
            targetType: 'users',
            targetId: user._id,
        }, session);
    });

    const sent = await sendActivationMail(user.email, profile.name, token);
    return sent ? null : { warning: 'Gửi email thất bại — thử lại sau' };
};

// ===== UC-10: khóa / mở khóa =====

export const lockManager = async (adminId, id, { reason }) => {
    const { user, profile } = await findManager(id);
    if (user.status !== USER_STATUS.ACTIVE) {
        throw new AppError('Chỉ khóa được tài khoản đang hoạt động', 400);
    }

    // BR-028: giữ nguyên phân công tòa và dữ liệu của tòa. Phiên bị đẩy ra nhờ middleware auth đọc lại status (BR-027)
    await withTransaction(async (session) => {
        user.status = USER_STATUS.LOCKED;
        await user.save({ session });
        await audit({
            actorId: adminId,
            action: AUDIT_ACTION.LOCK_USER,
            targetType: 'users',
            targetId: user._id,
            reason,
        }, session);
    });

    const sent = await sendLockMail(user.email, profile.name, reason);

    const data = await buildDetail(user, profile);
    if (!sent) {
        data.warning = MAIL_FAILED;
    }
    return data;
};

export const unlockManager = async (adminId, id) => {
    const { user, profile } = await findManager(id);
    if (user.status !== USER_STATUS.LOCKED) {
        throw new AppError('Tài khoản không ở trạng thái bị khóa', 400);
    }

    await withTransaction(async (session) => {
        user.status = USER_STATUS.ACTIVE;
        await user.save({ session });
        await audit({
            actorId: adminId,
            action: AUDIT_ACTION.UNLOCK_USER,
            targetType: 'users',
            targetId: user._id,
        }, session);
    });

    const sent = await sendUnlockMail(user.email, profile.name);

    const data = await buildDetail(user, profile);
    if (!sent) {
        data.warning = MAIL_FAILED;
    }
    return data;
};

// ===== UC-11: phân công / thay / gỡ Manager =====

// Manager đang gắn với tòa; user đã mất thì trả null
const findAssignedManager = async (userId) => {
    const user = await User.findById(userId);
    const profile = user ? await Manager.findOne({ userId: user._id }) : null;
    return user ? { user, profile } : null;
};

const notifyAssigned = (adminId, managerId, building, session) => notify({
    userIds: managerId,
    type: NOTIFICATION_TYPE.MANAGER_ASSIGNED,
    title: 'Phân công tòa nhà',
    message: `Bạn được phân công phụ trách tòa ${building.name}.`,
    refId: building._id,
    createdBy: adminId,
}, session);

const notifyUnassigned = (adminId, managerId, building, session) => notify({
    userIds: managerId,
    type: NOTIFICATION_TYPE.MANAGER_UNASSIGNED,
    title: 'Gỡ phân công tòa nhà',
    message: `Bạn không còn phụ trách tòa ${building.name}.`,
    refId: building._id,
    createdBy: adminId,
}, session);

const auditAssignment = (adminId, action, managerId, building, session) => audit({
    actorId: adminId,
    action,
    targetType: 'users',
    targetId: managerId,
    metadata: { buildingId: building._id, buildingName: building.name },
}, session);

const toAssignmentResult = (building, manager) => ({
    _id: building._id,
    name: building.name,
    manager: manager ? { _id: manager._id, name: manager.name } : null,
});

const unassignManager = async (adminId, building) => {
    if (!building.managerId) {
        throw new AppError('Tòa nhà chưa có Manager phụ trách', 400);
    }

    const oldManagerId = building.managerId;
    const oldManager = await findAssignedManager(oldManagerId);

    // $unset chứ không gán null vì managerId là unique khi có giá trị
    await withTransaction(async (session) => {
        await Building.updateOne({ _id: building._id }, { $unset: { managerId: 1 } }, { session });
        if (oldManager) {
            await notifyUnassigned(adminId, oldManagerId, building, session);
        }
        await auditAssignment(adminId, AUDIT_ACTION.UNASSIGN_MANAGER, oldManagerId, building, session);
    });

    const sent = oldManager
        ? await sendUnassignMail(oldManager.user.email, oldManager.profile?.name, building)
        : true;

    return {
        ...toAssignmentResult(building, null),
        warning: sent
            ? 'Tòa nhà hiện không có Manager phụ trách'
            : 'Tòa nhà hiện không có Manager phụ trách. Gửi email thất bại.',
    };
};

export const assignManager = async (adminId, buildingId, { managerId, confirmReplace }) => {
    if (!mongoose.isObjectIdOrHexString(buildingId)) {
        throw new AppError(BUILDING_NOT_FOUND, 404);
    }
    const building = await Building.findOne({ _id: buildingId, isDeleted: false });
    if (!building) {
        throw new AppError(BUILDING_NOT_FOUND, 404);
    }

    if (managerId === null) {
        return unassignManager(adminId, building);
    }

    const { user, profile } = await findManager(managerId);
    if (user.status === USER_STATUS.LOCKED) {
        throw new AppError('Manager đang bị khóa, không thể phân công', 400);
    }
    // Chỉ Manager ACTIVE được gán tòa (docs/database.md – Chỉ mục)
    if (user.status !== USER_STATUS.ACTIVE) {
        throw new AppError('Manager chưa kích hoạt tài khoản, không thể phân công', 400);
    }
    if (building.managerId && building.managerId.equals(user._id)) {
        throw new AppError('Manager này đang phụ trách tòa nhà', 400);
    }
    // BR-031: mỗi Manager tối đa 1 tòa
    const otherBuilding = await Building.exists({ managerId: user._id, isDeleted: false, _id: { $ne: building._id } });
    if (otherBuilding) {
        throw new AppError('Manager đang phụ trách tòa nhà khác', 400);
    }

    // UC-11 A1: tòa đã có người thì hỏi xác nhận thay
    const oldManager = building.managerId ? await findAssignedManager(building.managerId) : null;
    if (oldManager && confirmReplace !== true) {
        throw new AppError(`Tòa đang do ${oldManager.profile?.name ?? 'Manager khác'} phụ trách — xác nhận để thay thế?`, 409);
    }

    // BR-032: gỡ người cũ và gán người mới cùng lúc
    await withTransaction(async (session) => {
        await Building.updateOne({ _id: building._id }, { managerId: user._id }, { session });
        if (oldManager) {
            await notifyUnassigned(adminId, oldManager.user._id, building, session);
            await auditAssignment(adminId, AUDIT_ACTION.UNASSIGN_MANAGER, oldManager.user._id, building, session);
        }
        await notifyAssigned(adminId, user._id, building, session);
        await auditAssignment(adminId, AUDIT_ACTION.ASSIGN_MANAGER, user._id, building, session);
    });

    const assignSent = await sendAssignMail(user.email, profile.name, building);
    const unassignSent = oldManager
        ? await sendUnassignMail(oldManager.user.email, oldManager.profile?.name, building)
        : true;

    const data = toAssignmentResult(building, { _id: user._id, name: profile.name });
    if (!assignSent || !unassignSent) {
        data.warning = MAIL_FAILED;
    }
    return data;
};
