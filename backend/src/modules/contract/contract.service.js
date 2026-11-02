// Nghiệp vụ cho module contract: tạo hợp đồng thuê, gửi lại lời mời (UC-24)
import { env } from '../../config/env.js';
import { sendMail } from '../../config/mail.js';
import {
    ROLE,
    USER_STATUS,
    ROOM_STATUS,
    CONTRACT_STATUS,
    CONTRACT_TYPE,
    OCCUPANT_STATUS,
    ACTIVATION_TYPE,
    TOKEN_STATUS,
    AUDIT_ACTION,
} from '../../constants/enums.js';
import { AppError } from '../../utils/AppError.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { audit } from '../../helpers/audit.js';
import { generateActivationToken, ACTIVATION_TOKEN_TTL_MS } from '../../helpers/activationToken.js';
import { startOfVietnamDay } from '../../helpers/date.js';
import Contract from '../../models/Contract.js';
import Room from '../../models/Room.js';
import RoomType from '../../models/RoomType.js';
import Building from '../../models/Building.js';
import Occupant from '../../models/Occupant.js';
import User from '../../models/User.js';
import Manager from '../../models/Manager.js';
import ActivationToken from '../../models/ActivationToken.js';

const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[char]));

/**
 * Tính ngày kết thúc: startDate + durationMonths - 1 ngày, lúc 23:59:59 (tròn chu kỳ thuê tháng)
 * VD: bắt đầu 01/09/2026, 12 tháng -> kết thúc 31/08/2027 23:59:59
 */
export const calculateEndDate = (startDate, durationMonths) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(durationMonths));
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return end;
};

const sendInviteEmail = (to, inviteUrl, roomNumber, buildingName) => sendMail(
    to,
    `[Housify] Lời mời ký hợp đồng thuê phòng ${roomNumber} - ${buildingName}`,
    `<p>Xin chào,</p>
<p>Bạn nhận được lời mời ký hợp đồng thuê phòng <b>${escapeHtml(roomNumber)}</b> tại <b>${escapeHtml(buildingName)}</b> trên hệ thống Housify.</p>
<p>Vui lòng bấm vào liên kết dưới đây để xem chi tiết hợp đồng và hoàn tất kích hoạt tài khoản:</p>
<p><a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Xem và xác nhận hợp đồng</a></p>
<p>Liên kết này có hiệu lực trong vòng <b>24 giờ</b> và chỉ sử dụng được 1 lần.</p>
<p>Nếu bạn không có ý định thuê phòng này, vui lòng bỏ qua email.</p>`,
);

/**
 * Tạo hợp đồng thuê phòng dạng nháp (UC-24)
 */
export const createContract = async ({ managerId, data }) => {
    const {
        roomId,
        startDate,
        durationMonths,
        representativeCccd,
        representativeEmail,
        contractType,
        notes,
        coOccupants = [],
    } = data;

    // 1. Kiểm tra phòng và quyền của Manager
    const room = await Room.findOne({ _id: roomId, isDeleted: false });
    if (!room) {
        throw new AppError('Không tìm thấy phòng', 404);
    }

    const building = await Building.findOne({ _id: room.buildingId, isDeleted: false });
    if (!building) {
        throw new AppError('Không tìm thấy tòa nhà của phòng này', 404);
    }

    if (String(building.managerId) !== String(managerId)) {
        throw new AppError('Bạn không quản lý tòa nhà này', 403);
    }

    if (room.status !== ROOM_STATUS.AVAILABLE) {
        throw new AppError('Phòng không còn trống để tạo hợp đồng', 400);
    }

    // Mỗi phòng tại một thời điểm chỉ có tối đa một hợp đồng Nháp hoặc Đang hiệu lực (BR-061)
    const existingContract = await Contract.findOne({
        roomId: room._id,
        status: { $in: [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE] },
    });
    if (existingContract) {
        throw new AppError('Phòng đã có hợp đồng nháp hoặc đang có hợp đồng hiệu lực', 400);
    }

    // 2. Kiểm tra sức chứa theo loại phòng (BR-087)
    const roomType = await RoomType.findOne({ _id: room.roomTypeId, isDeleted: false });
    if (!roomType) {
        throw new AppError('Loại phòng không hợp lệ', 400);
    }

    if (contractType === CONTRACT_TYPE.SINGLE && coOccupants.length > 0) {
        throw new AppError('Hợp đồng đơn không được có người ở cùng', 422);
    }

    // [NHÁNH THỬ test_activatecustomer] bỏ luật "Nhóm phải có người ở cùng" lúc tạo: người đại diện tự nhập khi kích hoạt (UC-06),
    // kiểm "ít nhất 1 người ở cùng" chuyển sang activateCustomerContract. Manager vẫn có thể gửi kèm nếu muốn

    const totalOccupants = 1 + coOccupants.length;
    if (totalOccupants > roomType.capacity) {
        throw new AppError(`Số người (${totalOccupants}) vượt quá sức chứa tối đa của phòng (${roomType.capacity} người)`, 400);
    }

    // 3. Kiểm tra tính duy nhất (CCCD, SĐT, Email) trong toàn hệ thống
    const cleanRepCccd = representativeCccd.trim();
    const cleanRepEmail = representativeEmail.trim().toLowerCase();

    // 3a. Kiểm tra trùng lặp trong chính danh sách gửi lên
    const cccdSet = new Set([cleanRepCccd]);
    const phoneSet = new Set();

    for (const co of coOccupants) {
        const coCccd = co.cccd.trim();
        const coPhone = co.phone.trim();
        if (cccdSet.has(coCccd)) {
            throw new AppError(`Số CCCD ${coCccd} bị trùng lặp trong hợp đồng`, 422);
        }
        cccdSet.add(coCccd);

        if (phoneSet.has(coPhone)) {
            throw new AppError(`Số điện thoại ${coPhone} bị trùng lặp trong hợp đồng`, 422);
        }
        phoneSet.add(coPhone);
    }

    // 3b. Kiểm tra CCCD người đại diện trong toàn hệ thống
    // Chặn nếu đang ở phòng khác (ACTIVE)
    const activeOccupant = await Occupant.findOne({ cccd: cleanRepCccd, status: OCCUPANT_STATUS.STAYED });
    if (activeOccupant) {
        throw new AppError('Khách hàng này hiện đang thuê phòng khác', 400);
    }

    // Chặn nếu tài khoản bị khóa (LOCKED)
    const occupantRep = await Occupant.findOne({ cccd: cleanRepCccd, isRepresentative: true });
    if (occupantRep?.userId) {
        const user = await User.findById(occupantRep.userId);
        if (user?.status === USER_STATUS.LOCKED) {
            throw new AppError('Tài khoản khách hàng này đã bị khóa do vi phạm, không thể tạo hợp đồng mới', 400);
        }
    }

    // 3c. Kiểm tra Email người đại diện
    const existingUserByEmail = await User.findOne({ email: cleanRepEmail });
    if (existingUserByEmail) {
        if (existingUserByEmail.roleId !== ROLE.CUSTOMER) {
            throw new AppError('Email này thuộc về tài khoản quản trị/quản lý trong hệ thống', 400);
        }
        if (existingUserByEmail.status === USER_STATUS.LOCKED) {
            throw new AppError('Tài khoản gắn với email này đã bị khóa', 400);
        }
        // Nếu đã có user khách hàng nhưng CCCD không khớp
        if (occupantRep && String(occupantRep.userId) !== String(existingUserByEmail._id)) {
            throw new AppError('Email đã được đăng ký cho khách hàng khác trong hệ thống', 400);
        }
    }

    // 3d. Kiểm tra người ở cùng trên toàn hệ thống
    for (const co of coOccupants) {
        const coCccd = co.cccd.trim();
        const coPhone = co.phone.trim();

        const stayedOther = await Occupant.findOne({ cccd: coCccd, status: OCCUPANT_STATUS.STAYED });
        if (stayedOther) {
            throw new AppError(`Người ở cùng mang CCCD ${coCccd} hiện đang ở phòng khác`, 400);
        }

        const phoneInManager = await Manager.findOne({ phone: coPhone });
        if (phoneInManager) {
            throw new AppError(`Số điện thoại ${coPhone} đã thuộc tài khoản quản lý`, 409);
        }

        const phoneInOccupant = await Occupant.findOne({ phone: coPhone, cccd: { $ne: coCccd } });
        if (phoneInOccupant) {
            throw new AppError(`Số điện thoại ${coPhone} đã tồn tại trong hệ thống`, 409);
        }
    }

    // 4. Tạo hợp đồng trong Transaction
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = calculateEndDate(parsedStartDate, durationMonths);
    const { token, tokenHash } = generateActivationToken();

    let createdContractDoc = null;

    await withTransaction(async (session) => {
        const [newContract] = await Contract.create(
            [
                {
                    roomId: room._id,
                    contractType,
                    representativeCccd: cleanRepCccd,
                    representativeEmail: cleanRepEmail,
                    startDate: parsedStartDate,
                    endDate: parsedEndDate,
                    rentPrice: room.rentPrice, // Snapshot
                    deposit: room.deposit,     // Snapshot
                    status: CONTRACT_STATUS.DRAFT,
                    notes: notes || undefined,
                    createdBy: managerId,
                },
            ],
            { session },
        );

        createdContractDoc = newContract;

        // Lưu người ở cùng nếu là hợp đồng nhóm (trạng thái STAYED theo database.md)
        if (contractType === CONTRACT_TYPE.GROUP && coOccupants.length > 0) {
            const occupantDocs = coOccupants.map((co) => ({
                contractId: newContract._id,
                isRepresentative: false,
                name: co.name.trim(),
                phone: co.phone.trim(),
                dateOfBirth: new Date(co.dateOfBirth),
                address: co.address?.trim() || undefined,
                cccd: co.cccd.trim(),
                relationship: co.relationship?.trim() || undefined,
                status: OCCUPANT_STATUS.STAYED,
                joinDate: parsedStartDate,
            }));

            await Occupant.insertMany(occupantDocs, { session });
        }

        // Tạo token kích hoạt 24h
        await ActivationToken.create(
            [
                {
                    type: ACTIVATION_TYPE.CUSTOMER_INVITE,
                    contractId: newContract._id,
                    token: tokenHash,
                    sentTo: cleanRepEmail,
                    expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
                    createdBy: managerId,
                },
            ],
            { session },
        );
    });

    // 5. Gửi email mời khách (sau khi transaction thành công)
    const inviteUrl = `${env.CLIENT_URL}/activate/contract/${token}`;
    const mailSent = await sendInviteEmail(cleanRepEmail, inviteUrl, room.roomNumber, building.name);

    // 6. Cảnh báo (hồi tố hoặc gửi email thất bại)
    const isRetroactive = parsedStartDate < startOfVietnamDay(new Date());
    const warnings = [];
    if (isRetroactive) {
        warnings.push('Ngày bắt đầu đã ở quá khứ (hợp đồng hồi tố)');
    }
    if (!mailSent) {
        warnings.push('Gửi email thất bại – vui lòng gửi lại lời mời');
    }

    return {
        contract: createdContractDoc,
        rawToken: token, // Dùng để test khi không có email thật
        warning: warnings.length > 0 ? warnings.join(' · ') : undefined,
    };
};

/**
 * Gửi lại lời mời ký hợp đồng cho khách (UC-24 A2)
 */
export const resendInvite = async ({ managerId, contractId }) => {
    const contract = await Contract.findById(contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    if (contract.status !== CONTRACT_STATUS.DRAFT) {
        throw new AppError('Chỉ có thể gửi lại lời mời cho hợp đồng ở trạng thái nháp', 400);
    }

    const room = await Room.findById(contract.roomId);
    const building = await Building.findById(room?.buildingId);
    if (!building || String(building.managerId) !== String(managerId)) {
        throw new AppError('Bạn không quản lý tòa nhà của hợp đồng này', 403);
    }

    const { token, tokenHash } = generateActivationToken();

    await withTransaction(async (session) => {
        // Vô hiệu hóa mọi token chưa dùng của hợp đồng này
        await ActivationToken.updateMany(
            {
                contractId: contract._id,
                type: ACTIVATION_TYPE.CUSTOMER_INVITE,
                status: { $in: [null] },
            },
            { status: TOKEN_STATUS.EXPIRED },
            { session },
        );

        // Tạo token mới
        await ActivationToken.create(
            [
                {
                    type: ACTIVATION_TYPE.CUSTOMER_INVITE,
                    contractId: contract._id,
                    token: tokenHash,
                    sentTo: contract.representativeEmail,
                    expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
                    createdBy: managerId,
                },
            ],
            { session },
        );

        await audit(
            {
                actorId: managerId,
                action: AUDIT_ACTION.RESEND_ACTIVATION,
                targetType: 'contracts',
                targetId: contract._id,
                reason: 'Gửi lại lời mời ký hợp đồng cho khách hàng',
            },
            session,
        );
    });

    const inviteUrl = `${env.CLIENT_URL}/activate/contract/${token}`;
    const mailSent = await sendInviteEmail(contract.representativeEmail, inviteUrl, room.roomNumber, building.name);

    return {
        rawToken: token,
        warning: mailSent ? undefined : 'Gửi email thất bại – vui lòng thử lại sau',
    };
};

