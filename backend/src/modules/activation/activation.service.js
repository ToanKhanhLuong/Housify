// Nghiệp vụ kích hoạt tài khoản Manager (UC-08 bước 6–8) và kích hoạt hợp đồng Customer (UC-06)
import bcrypt from 'bcryptjs';
import { AppError } from '../../utils/AppError.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { audit } from '../../helpers/audit.js';
import { notify } from '../../helpers/notify.js';
import { sendMail } from '../../config/mail.js';
import { hashActivationToken } from '../../helpers/activationToken.js';
import {
    ROLE,
    ACTIVATION_TYPE,
    TOKEN_STATUS,
    USER_STATUS,
    CONTRACT_STATUS,
    CONTRACT_TYPE,
    ROOM_STATUS,
    OCCUPANT_STATUS,
    AUDIT_ACTION,
    NOTIFICATION_TYPE,
} from '../../constants/enums.js';
import User from '../../models/User.js';
import Manager from '../../models/Manager.js';
import ActivationToken from '../../models/ActivationToken.js';
import Contract from '../../models/Contract.js';
import Room from '../../models/Room.js';
import RoomType from '../../models/RoomType.js';
import Building from '../../models/Building.js';
import Occupant from '../../models/Occupant.js';

const LINK_NOT_FOUND = 'Link kích hoạt không tồn tại';
const LINK_EXPIRED_OR_USED = 'Link kích hoạt đã hết hạn hoặc đã được sử dụng';

const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[char]));

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
 */
export const activateManager = async ({ token, password }) => {
    const { activationToken, user } = await validateActivationToken(token);

    await withTransaction(async (session) => {
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

// ==========================================
// CUSTOMER CONTRACT ACTIVATION (UC-06)
// ==========================================

/**
 * Kiểm tra tính hợp lệ của link mời ký hợp đồng cho Customer
 */
const validateCustomerContractActivationToken = async (token) => {
    if (!token || typeof token !== 'string') {
        throw new AppError('Link không còn hiệu lực', 404);
    }

    const tokenHash = hashActivationToken(token);
    const activationToken = await ActivationToken.findOne({
        type: ACTIVATION_TYPE.CUSTOMER_INVITE,
        token: tokenHash,
    });

    if (!activationToken) {
        throw new AppError('Link không còn hiệu lực', 404);
    }

    // Đã dùng hoặc hết hạn
    if (activationToken.status === TOKEN_STATUS.USED) {
        throw new AppError('Hợp đồng đã được kích hoạt. Vui lòng đăng nhập', 400);
    }

    if (activationToken.status === TOKEN_STATUS.EXPIRED) {
        throw new AppError('Link không còn hiệu lực', 404);
    }

    if (activationToken.expiresAt <= new Date()) {
        throw new AppError('Link đã hết hạn. Vui lòng liên hệ quản lý để gửi lại', 400);
    }

    const contract = await Contract.findById(activationToken.contractId);
    if (!contract || contract.status === CONTRACT_STATUS.CANCELLED) {
        throw new AppError('Link không còn hiệu lực', 404);
    }

    if (contract.status === CONTRACT_STATUS.ACTIVE) {
        throw new AppError('Hợp đồng đã được kích hoạt. Vui lòng đăng nhập', 400);
    }

    if (contract.status !== CONTRACT_STATUS.DRAFT) {
        throw new AppError('Hợp đồng không ở trạng thái chờ kích hoạt', 400);
    }

    return { activationToken, contract };
};

/**
 * Lấy thông tin hợp đồng ở chế độ chỉ xem khi khách mở link mời (UC-06)
 */
export const getContractActivationInfo = async (token) => {
    const { contract } = await validateCustomerContractActivationToken(token);

    const room = await Room.findById(contract.roomId).populate('roomTypeId');
    if (!room) {
        throw new AppError('Không tìm thấy thông tin phòng', 404);
    }

    const building = await Building.findById(room.buildingId);
    const coOccupants = await Occupant.find({
        contractId: contract._id,
        isRepresentative: false,
    }).sort({ createdAt: 1 });

    // [NHÁNH THỬ test_activatecustomer] Bên A của hợp đồng = Manager tạo hợp đồng (createdBy, cũng là người nhận cọc)
    const manager = await Manager.findOne({ userId: contract.createdBy })
        .select('name phone address dateOfBirth')
        .lean();

    return {
        building: {
            name: building?.name || '',
            address: building?.address || '',
            rules: building?.rules || '',
        },
        room: {
            roomNumber: room.roomNumber,
            floorNumber: room.floorNumber,
            roomTypeName: room.roomTypeId?.name || '',
            area: room.area,
            capacity: room.roomTypeId?.capacity ?? null, // [NHÁNH THỬ] số người tối đa theo loại phòng
        },
        // [NHÁNH THỬ] null khi không tìm thấy hồ sơ Manager
        manager: manager
            ? {
                  name: manager.name,
                  phone: manager.phone,
                  address: manager.address || '',
                  dateOfBirth: manager.dateOfBirth || null,
              }
            : null,
        contractType: contract.contractType,
        createdAt: contract.createdAt, // [NHÁNH THỬ] lúc Manager tạo và gửi hợp đồng = lúc Bên A xác nhận điện tử
        startDate: contract.startDate,
        endDate: contract.endDate,
        rentPrice: contract.rentPrice,
        deposit: contract.deposit,
        notes: contract.notes || '',
        representativeEmail: contract.representativeEmail,
        representativeCccd: contract.representativeCccd,
        coOccupants: coOccupants.map((co) => ({
            name: co.name,
            cccd: co.cccd,
            phone: co.phone,
            dateOfBirth: co.dateOfBirth,
            relationship: co.relationship || '',
        })),
    };
};

/**
 * Khách hàng kích hoạt tài khoản và xác nhận hợp đồng (UC-06)
 */
export const activateCustomerContract = async ({
    token,
    name,
    phone,
    dateOfBirth,
    address,
    password,
    agreed,
    cccdFrontImage,
    cccdBackImage,
    coOccupants = [],
}) => {
    const { activationToken, contract } = await validateCustomerContractActivationToken(token);
    // thời điểm xác nhận điện tử: lưu vào activatedAt và trả về để FE in đúng giờ lên hợp đồng
    const activatedAt = new Date();

    // 1. Kiểm tra phòng còn trống
    const room = await Room.findById(contract.roomId);
    if (!room || room.status !== ROOM_STATUS.AVAILABLE) {
        throw new AppError('Phòng không còn trống, vui lòng liên hệ quản lý', 400);
    }

    const building = await Building.findById(room.buildingId);

    // 2. Kiểm tra tính duy nhất của SĐT trên toàn hệ thống
    const cleanPhone = phone.trim();
    const phoneInManager = await Manager.findOne({ phone: cleanPhone });
    if (phoneInManager) {
        throw new AppError('Số điện thoại đã tồn tại trong hệ thống', 409);
    }

    const phoneInOccupant = await Occupant.findOne({
        phone: cleanPhone,
        cccd: { $ne: contract.representativeCccd },
    });
    if (phoneInOccupant) {
        throw new AppError('Số điện thoại đã tồn tại trong hệ thống', 409);
    }

    // [NHÁNH THỬ test_activatecustomer] 2b. Người ở cùng do người đại diện nhập (luật và câu lỗi giống createContract của An)
    const newCoOccupants = coOccupants.map((co) => ({
        name: co.name.trim(),
        cccd: co.cccd.trim(),
        phone: co.phone.trim(),
        dateOfBirth: co.dateOfBirth,
        address: co.address?.trim() || undefined,
    }));
    // người Manager đã nhập sẵn lúc tạo nháp (hợp đồng tạo theo luồng cũ) vẫn được tính
    const existingCoOccupants = await Occupant.find({
        contractId: contract._id,
        isRepresentative: false,
        status: OCCUPANT_STATUS.STAYED,
    }).lean();
    const roomType = await RoomType.findById(room.roomTypeId).lean();

    if (contract.contractType === CONTRACT_TYPE.SINGLE && newCoOccupants.length > 0) {
        throw new AppError('Hợp đồng đơn không được có người ở cùng', 422);
    }
    const coOccupantCount = existingCoOccupants.length + newCoOccupants.length;
    if (contract.contractType === CONTRACT_TYPE.GROUP && coOccupantCount === 0) {
        throw new AppError('Hợp đồng nhóm phải có ít nhất 1 người ở cùng', 422);
    }
    const totalOccupants = 1 + coOccupantCount;
    if (roomType && totalOccupants > roomType.capacity) {
        throw new AppError(
            `Số người (${totalOccupants}) vượt quá sức chứa tối đa của phòng (${roomType.capacity} người)`,
            400,
        );
    }

    // trùng trong chính hợp đồng: so với người đại diện, người đã có và nhau
    const cccdSet = new Set([contract.representativeCccd, ...existingCoOccupants.map((co) => co.cccd)]);
    const phoneSet = new Set([cleanPhone, ...existingCoOccupants.map((co) => co.phone)]);
    for (const co of newCoOccupants) {
        if (cccdSet.has(co.cccd)) {
            throw new AppError(`Số CCCD ${co.cccd} bị trùng lặp trong hợp đồng`, 422);
        }
        cccdSet.add(co.cccd);
        if (phoneSet.has(co.phone)) {
            throw new AppError(`Số điện thoại ${co.phone} bị trùng lặp trong hợp đồng`, 422);
        }
        phoneSet.add(co.phone);
    }

    // trên toàn hệ thống: không đang ở phòng khác, SĐT không thuộc Manager hay người mang CCCD khác
    for (const co of newCoOccupants) {
        const stayedOther = await Occupant.findOne({ cccd: co.cccd, status: OCCUPANT_STATUS.STAYED });
        if (stayedOther) {
            throw new AppError(`Người ở cùng mang CCCD ${co.cccd} hiện đang ở phòng khác`, 400);
        }
        if (await Manager.findOne({ phone: co.phone })) {
            throw new AppError(`Số điện thoại ${co.phone} đã thuộc tài khoản quản lý`, 409);
        }
        if (await Occupant.findOne({ phone: co.phone, cccd: { $ne: co.cccd } })) {
            throw new AppError(`Số điện thoại ${co.phone} đã tồn tại trong hệ thống`, 409);
        }
    }

    let customerUserId = null;

    // 3. Thực hiện trong 1 MongoDB Transaction duy nhất (BR-015)
    await withTransaction(async (session) => {
        // Tìm xem khách đã có tài khoản trước đó hay chưa (theo email hoặc CCCD cũ)
        let user = await User.findOne({ email: contract.representativeEmail }).session(session);

        if (!user) {
            // Tra theo CCCD đại diện cũ nếu email khác
            const oldOccupant = await Occupant.findOne({
                cccd: contract.representativeCccd,
                isRepresentative: true,
            }).session(session);

            if (oldOccupant?.userId) {
                user = await User.findById(oldOccupant.userId).session(session);
            }
        }

        if (user) {
            if (user.status === USER_STATUS.LOCKED) {
                throw new AppError('Tài khoản của bạn đã bị khóa do vi phạm trước đó, không thể kích hoạt hợp đồng', 403);
            }
            if (user.status === USER_STATUS.ACTIVE) {
                throw new AppError('Tài khoản của bạn đang hoạt động ở phòng khác', 400);
            }

            // Khách cũ INACTIVE thuê lại: mở lại tài khoản và đặt mật khẩu mới
            if (user.status === USER_STATUS.INACTIVE) {
                user.password = await bcrypt.hash(password, 10);
                user.status = USER_STATUS.ACTIVE;
                user.email = contract.representativeEmail;
                await user.save({ session });

                await audit(
                    {
                        actorId: user._id,
                        action: AUDIT_ACTION.REACTIVATE_USER,
                        targetType: 'users',
                        targetId: user._id,
                        reason: 'Khách cũ thuê lại phòng và kích hoạt hợp đồng mới',
                    },
                    session,
                );
            }
        } else {
            // Tạo tài khoản mới cho khách
            const hashedPassword = await bcrypt.hash(password, 10);
            const [newUser] = await User.create(
                [
                    {
                        email: contract.representativeEmail,
                        password: hashedPassword,
                        roleId: ROLE.CUSTOMER,
                        status: USER_STATUS.ACTIVE,
                    },
                ],
                { session },
            );
            user = newUser;
        }

        customerUserId = user._id;

        // Tạo hồ sơ cư dân đại diện
        await Occupant.create(
            [
                {
                    contractId: contract._id,
                    userId: user._id,
                    isRepresentative: true,
                    name: name.trim(),
                    phone: cleanPhone,
                    dateOfBirth: new Date(dateOfBirth),
                    address: address?.trim() || undefined,
                    cccd: contract.representativeCccd,
                    cccdFrontImage,
                    cccdBackImage,
                    status: OCCUPANT_STATUS.STAYED,
                    joinDate: contract.startDate,
                },
            ],
            { session },
        );

        // [NHÁNH THỬ] người ở cùng người đại diện vừa nhập: không có tài khoản, vào ở từ ngày bắt đầu hợp đồng
        if (newCoOccupants.length > 0) {
            await Occupant.insertMany(
                newCoOccupants.map((co) => ({
                    contractId: contract._id,
                    isRepresentative: false,
                    name: co.name,
                    phone: co.phone,
                    dateOfBirth: new Date(co.dateOfBirth),
                    address: co.address,
                    cccd: co.cccd,
                    status: OCCUPANT_STATUS.STAYED,
                    joinDate: contract.startDate,
                })),
                { session },
            );
        }

        // Chuyển hợp đồng sang ACTIVE và lưu thời điểm activatedAt (bằng chứng xác nhận điện tử BR-014)
        const contractUpdate = await Contract.updateOne(
            { _id: contract._id, status: CONTRACT_STATUS.DRAFT },
            {
                status: CONTRACT_STATUS.ACTIVE,
                activatedAt,
                depositReceiverId: contract.createdBy,
            },
            { session },
        );

        if (contractUpdate.matchedCount === 0) {
            throw new AppError('Hợp đồng đã được kích hoạt hoặc không còn ở trạng thái nháp', 400);
        }

        // Chuyển trạng thái phòng sang OCCUPIED (BR-052)
        const roomUpdate = await Room.updateOne(
            { _id: room._id, status: ROOM_STATUS.AVAILABLE },
            { status: ROOM_STATUS.OCCUPIED },
            { session },
        );

        if (roomUpdate.matchedCount === 0) {
            throw new AppError('Phòng không còn ở trạng thái sẵn sàng để thuê', 400);
        }

        // Đánh dấu token đã dùng (USED)
        const tokenUpdate = await ActivationToken.updateOne(
            {
                _id: activationToken._id,
                status: { $in: [null] },
                expiresAt: { $gt: new Date() },
            },
            { status: TOKEN_STATUS.USED },
            { session },
        );

        if (tokenUpdate.matchedCount === 0) {
            throw new AppError('Link kích hoạt đã hết hạn hoặc đã được sử dụng', 400);
        }
    });

    // 4. Gửi mail xác nhận và thông báo chuông cho Manager
    const mailSent = await sendMail(
        contract.representativeEmail,
        `[Housify] Xác nhận kích hoạt hợp đồng phòng ${room.roomNumber} thành công`,
        `<p>Xin chào ${escapeHtml(name)},</p>
<p>Bạn đã xác nhận hợp đồng điện tử và kích hoạt tài khoản thành công cho phòng <b>${escapeHtml(room.roomNumber)}</b> tại <b>${escapeHtml(building?.name || '')}</b>.</p>
<p>Từ bây giờ bạn có thể đăng nhập vào hệ thống bằng <b>Số CCCD (${escapeHtml(contract.representativeCccd)})</b> và mật khẩu bạn vừa đặt.</p>
<p>Chúc bạn có trải nghiệm lưu trú tuyệt vời tại Housify!</p>`,
    );

    // Thông báo chuông cho Manager
    await notify({
        userIds: contract.createdBy,
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: 'Khách hàng đã kích hoạt hợp đồng',
        message: `Khách hàng ${name} đã kích hoạt hợp đồng thuê phòng ${room.roomNumber}.`,
        refId: contract._id,
        createdBy: customerUserId,
    });

    return {
        activatedAt,
        warning: mailSent ? undefined : 'Gửi email xác nhận thất bại',
    };
};
