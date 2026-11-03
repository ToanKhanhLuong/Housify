// Nghiệp vụ cho module contract: tạo nháp, gửi lại lời mời, xem danh sách/chi tiết, sửa, gia hạn, hủy hợp đồng nháp (UC-24..27, UC-46)
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
    NOTIFICATION_TYPE,
    AUDIT_ACTION,
} from '../../constants/enums.js';
import { AppError } from '../../utils/AppError.js';
import { paginate } from '../../utils/pagination.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { notify } from '../../helpers/notify.js';
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

const formatDateVn = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

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

/**
 * Suy ra thời hạn thuê (số tháng) hiện tại từ startDate và endDate của hợp đồng
 */
const inferDurationMonths = (startDate, endDate) => {
    const start = new Date(startDate);
    const dayAfterEnd = new Date(endDate);
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
    const months = (dayAfterEnd.getFullYear() - start.getFullYear()) * 12 + (dayAfterEnd.getMonth() - start.getMonth());
    return months > 0 ? months : 12;
};

/**
 * Kiểm tra quyền Manager trên hợp đồng (phòng của hợp đồng phải thuộc tòa Manager đang quản lý)
 */
const verifyManagerContractScope = async (managerId, contract) => {
    const room = await Room.findById(contract.roomId);
    if (!room) {
        throw new AppError('Không tìm thấy phòng của hợp đồng', 404);
    }

    const building = await Building.findOne({ _id: room.buildingId, isDeleted: false });
    if (!building || String(building.managerId) !== String(managerId)) {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    return { room, building };
};

/**
 * Kiểm tra CCCD và Email của người đại diện khi tạo hoặc sửa hợp đồng nháp (UC-24, UC-26)
 */
const validateRepresentativeCccdAndEmail = async (cleanRepCccd, cleanRepEmail, excludeContractId = null) => {
    // 1. Chặn nếu CCCD đang ở phòng khác (STAYED)
    const stayedFilter = {
        cccd: cleanRepCccd,
        status: OCCUPANT_STATUS.STAYED,
    };
    if (excludeContractId) {
        stayedFilter.contractId = { $ne: excludeContractId };
    }

    const activeOccupant = await Occupant.findOne(stayedFilter);
    if (activeOccupant) {
        throw new AppError('Khách hàng này hiện đang thuê phòng khác', 400);
    }

    // 2. Chặn nếu tài khoản gắn với CCCD đã bị khóa do vi phạm (LOCKED)
    const occupantRep = await Occupant.findOne({ cccd: cleanRepCccd, isRepresentative: true });
    if (occupantRep?.userId) {
        const user = await User.findById(occupantRep.userId);
        if (user?.status === USER_STATUS.LOCKED) {
            throw new AppError('Tài khoản khách hàng này đã bị khóa do vi phạm, không thể tạo hợp đồng mới', 400);
        }
    }

    // 3. Kiểm tra Email người đại diện
    const existingUserByEmail = await User.findOne({ email: cleanRepEmail });
    if (existingUserByEmail) {
        if (existingUserByEmail.roleId !== ROLE.CUSTOMER) {
            throw new AppError('Email này thuộc về tài khoản quản trị/quản lý trong hệ thống', 400);
        }
        if (existingUserByEmail.status === USER_STATUS.LOCKED) {
            throw new AppError('Tài khoản gắn với email này đã bị khóa', 400);
        }
        // Nếu CCCD đã có tài khoản nhưng khác với tài khoản của email này
        if (occupantRep && String(occupantRep.userId) !== String(existingUserByEmail._id)) {
            throw new AppError('Email đã được đăng ký cho khách hàng khác trong hệ thống', 400);
        }
        // Nếu email đã gắn với một khách hàng đại diện khác có CCCD khác
        const occupantOfEmail = await Occupant.findOne({
            userId: existingUserByEmail._id,
            isRepresentative: true,
        });
        if (occupantOfEmail && occupantOfEmail.cccd !== cleanRepCccd) {
            throw new AppError('Email đã được đăng ký cho khách hàng khác trong hệ thống', 400);
        }
    }
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

const sendRenewalEmail = (to, roomNumber, buildingName, months, newEndDate) => sendMail(
    to,
    `[Housify] Thông báo gia hạn hợp đồng phòng ${roomNumber} - ${buildingName}`,
    `<p>Xin chào,</p>
<p>Hợp đồng thuê phòng <b>${escapeHtml(roomNumber)}</b> tại <b>${escapeHtml(buildingName)}</b> của bạn đã được gia hạn thêm <b>${months} tháng</b>.</p>
<p>Ngày kết thúc hợp đồng mới: <b>${formatDateVn(newEndDate)}</b>.</p>
<p>Bạn có thể đăng nhập vào hệ thống Housify để xem chi tiết hợp đồng.</p>`,
);

const sendCancelDraftEmail = (to, roomNumber, buildingName, reason) => sendMail(
    to,
    `[Housify] Lời mời ký hợp đồng phòng ${roomNumber} đã bị hủy`,
    `<p>Xin chào,</p>
<p>Lời mời ký hợp đồng phòng <b>${escapeHtml(roomNumber)}</b> tại <b>${escapeHtml(buildingName)}</b> đã bị hủy.</p>
${reason ? `<p>Lý do: ${escapeHtml(reason)}</p>` : ''}
<p>Liên kết kích hoạt trước đó không còn hiệu lực. Nếu có thắc mắc, vui lòng liên hệ quản lý tòa nhà.</p>`,
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
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
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

    // [chờ An duyệt] bỏ luật "Nhóm phải có người ở cùng" lúc tạo: người đại diện tự nhập khi kích hoạt (UC-06),
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

    // 3b & 3c. Kiểm tra CCCD và Email người đại diện
    await validateRepresentativeCccdAndEmail(cleanRepCccd, cleanRepEmail);

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

    const { room, building } = await verifyManagerContractScope(managerId, contract);

    if (contract.status !== CONTRACT_STATUS.DRAFT) {
        throw new AppError('Chỉ có thể gửi lại lời mời cho hợp đồng ở trạng thái nháp', 400);
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

/**
 * Xem danh sách hợp đồng (UC-25)
 * - Manager: danh sách hợp đồng thuộc tòa mình, lọc theo status và roomId, có phân trang
 * - Customer: xem hợp đồng hiện tại của chính mình
 */
export const getContracts = async ({ userId, roleId, query = {} }) => {
    const { status, roomId, page = 1, limit = 10 } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const statusList = Array.isArray(status)
        ? status
        : typeof status === 'string' && status.trim()
            ? status.split(',').map((s) => s.trim()).filter(Boolean)
            : null;

    const filter = {};

    if (roleId === ROLE.MANAGER) {
        const building = await Building.findOne({ managerId: userId, isDeleted: false }).lean();
        if (!building) {
            if (roomId) {
                throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
            }
            return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
        }

        const buildingRooms = await Room.find({ buildingId: building._id, isDeleted: false })
            .select('_id roomNumber floorNumber status')
            .lean();
        const buildingRoomIds = buildingRooms.map((r) => String(r._id));

        if (roomId) {
            const targetRoom = await Room.findOne({ _id: roomId, isDeleted: false }).lean();
            if (!targetRoom) {
                throw new AppError('Không tìm thấy phòng', 404);
            }
            if (!buildingRoomIds.includes(String(roomId))) {
                throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
            }
            filter.roomId = targetRoom._id;
        } else {
            filter.roomId = { $in: buildingRooms.map((r) => r._id) };
        }

        if (statusList && statusList.length > 0) {
            filter.status = { $in: statusList };
        }
    } else if (roleId === ROLE.CUSTOMER) {
        // Customer chỉ xem hợp đồng hiện tại của chính mình
        const repOccupants = await Occupant.find({
            userId,
            isRepresentative: true,
        })
            .select('contractId status')
            .lean();

        if (repOccupants.length === 0) {
            return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
        }

        const myContractIds = repOccupants.map((o) => o.contractId);
        filter._id = { $in: myContractIds };

        if (statusList && statusList.length > 0) {
            filter.status = { $in: statusList };
        } else {
            // Mặc định lấy hợp đồng đang hiệu lực (hợp đồng hiện tại của phòng mình)
            filter.status = CONTRACT_STATUS.ACTIVE;
        }

        if (roomId) {
            filter.roomId = roomId;
        }
    } else {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    const result = await paginate(Contract, filter, {
        page: pageNum,
        limit: limitNum,
        sort: { createdAt: -1 },
    });

    if (result.items.length === 0) {
        return {
            ...result,
            totalPages: 0,
        };
    }

    // Bổ sung thông tin phòng, người đại diện và số lượng cư dân cho từng hợp đồng
    const contractIds = result.items.map((c) => c._id);
    const roomIds = [...new Set(result.items.map((c) => String(c.roomId)))];

    const [rooms, occupants] = await Promise.all([
        Room.find({ _id: { $in: roomIds } }).select('_id roomNumber floorNumber status buildingId').lean(),
        Occupant.find({ contractId: { $in: contractIds } })
            .select('_id contractId isRepresentative name cccd phone status')
            .lean(),
    ]);

    const roomMap = new Map(rooms.map((r) => [String(r._id), r]));
    const occupantsByContract = new Map();
    for (const occ of occupants) {
        const key = String(occ.contractId);
        if (!occupantsByContract.has(key)) {
            occupantsByContract.set(key, []);
        }
        occupantsByContract.get(key).push(occ);
    }

    const enrichedItems = result.items.map((contract) => {
        const room = roomMap.get(String(contract.roomId)) || null;
        const contractOccupants = occupantsByContract.get(String(contract._id)) || [];
        const repOccupant = contractOccupants.find((o) => o.isRepresentative);
        const stayedCount = contractOccupants.filter((o) => o.status === OCCUPANT_STATUS.STAYED).length;

        const representative = repOccupant
            ? {
                _id: repOccupant._id,
                name: repOccupant.name,
                cccd: repOccupant.cccd,
                email: contract.representativeEmail,
                phone: repOccupant.phone,
            }
            : {
                cccd: contract.representativeCccd,
                email: contract.representativeEmail,
            };

        return {
            ...contract,
            room: room
                ? {
                    _id: room._id,
                    roomNumber: room.roomNumber,
                    floorNumber: room.floorNumber,
                    status: room.status,
                }
                : null,
            representative,
            occupantCount: stayedCount,
        };
    });

    return {
        items: enrichedItems,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit) || 0,
    };
};

/**
 * Xem chi tiết hợp đồng (UC-25)
 */
export const getContractById = async ({ userId, roleId, contractId }) => {
    const contract = await Contract.findById(contractId).lean();
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    const room = await Room.findById(contract.roomId).lean();
    const building = room ? await Building.findOne({ _id: room.buildingId, isDeleted: false }).lean() : null;

    if (roleId === ROLE.MANAGER) {
        if (!building || String(building.managerId) !== String(userId)) {
            throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
        }
    } else if (roleId === ROLE.CUSTOMER) {
        const isMyContract = await Occupant.exists({
            contractId: contract._id,
            userId,
            isRepresentative: true,
        });
        if (!isMyContract) {
            throw new AppError('Bạn không có quyền xem hợp đồng này', 403);
        }
    } else {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    const [roomType, occupants] = await Promise.all([
        room?.roomTypeId ? RoomType.findById(room.roomTypeId).select('_id name capacity').lean() : null,
        Occupant.find({ contractId: contract._id }).sort({ isRepresentative: -1, joinDate: 1 }).lean(),
    ]);

    const repOccupant = occupants.find((o) => o.isRepresentative);

    // Hợp đồng nháp thì người đại diện chỉ có CCCD và email
    const representative = repOccupant
        ? {
            _id: repOccupant._id,
            userId: repOccupant.userId || null,
            name: repOccupant.name,
            cccd: repOccupant.cccd,
            email: contract.representativeEmail,
            phone: repOccupant.phone,
            dateOfBirth: repOccupant.dateOfBirth,
            address: repOccupant.address || null,
        }
        : {
            cccd: contract.representativeCccd,
            email: contract.representativeEmail,
        };

    return {
        ...contract,
        room: room
            ? {
                _id: room._id,
                roomNumber: room.roomNumber,
                floorNumber: room.floorNumber,
                rentPrice: room.rentPrice,
                deposit: room.deposit,
                status: room.status,
                roomType: roomType
                    ? { _id: roomType._id, name: roomType.name, capacity: roomType.capacity }
                    : null,
                building: building
                    ? { _id: building._id, name: building.name, address: building.address }
                    : null,
            }
            : null,
        representative,
        occupants,
    };
};

/**
 * Cập nhật hợp đồng (UC-26)
 * - Khi DRAFT: sửa được representativeCccd, representativeEmail, startDate, durationMonths (tính lại endDate), notes.
 *   Đổi CCCD hoặc email -> vô hiệu hóa link mời cũ.
 * - Khi ACTIVE: chỉ sửa được notes. Gửi lên trường khác -> chặn.
 * - Khi ENDED hoặc CANCELLED -> chặn.
 */
export const updateContract = async ({ managerId, contractId, data }) => {
    const contract = await Contract.findById(contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    await verifyManagerContractScope(managerId, contract);

    if (contract.status === CONTRACT_STATUS.ENDED || contract.status === CONTRACT_STATUS.CANCELLED) {
        throw new AppError('Không thể chỉnh sửa hợp đồng đã kết thúc hoặc đã hủy', 400);
    }

    const sentKeys = Object.keys(data || {}).filter((key) => data[key] !== undefined);
    if (sentKeys.length === 0) {
        throw new AppError('Vui lòng cung cấp dữ liệu cần cập nhật', 422);
    }

    // Trường hợp 1: Hợp đồng đang hiệu lực (ACTIVE) -> chỉ sửa ghi chú
    if (contract.status === CONTRACT_STATUS.ACTIVE) {
        const disallowedKeys = sentKeys.filter((key) => key !== 'notes');
        if (disallowedKeys.length > 0) {
            throw new AppError('Hợp đồng đang hiệu lực chỉ được sửa ghi chú', 400);
        }

        const before = { notes: contract.notes ?? null };
        contract.notes = data.notes.trim() || undefined;
        const after = { notes: contract.notes ?? null };

        await withTransaction(async (session) => {
            await contract.save({ session });
            await audit(
                {
                    actorId: managerId,
                    action: AUDIT_ACTION.UPDATE_CONTRACT,
                    targetType: 'contracts',
                    targetId: contract._id,
                    reason: 'Cập nhật ghi chú hợp đồng đang hiệu lực',
                    metadata: { before, after },
                },
                session,
            );
        });

        return { contract };
    }

    // Trường hợp 2: Hợp đồng nháp (DRAFT)
    const allowedDraftKeys = ['representativeCccd', 'representativeEmail', 'startDate', 'durationMonths', 'notes'];
    const disallowedDraftKeys = sentKeys.filter((key) => !allowedDraftKeys.includes(key));
    if (disallowedDraftKeys.length > 0) {
        throw new AppError('Không được phép chỉnh sửa các trường bị khóa của hợp đồng', 400);
    }

    const before = {
        representativeCccd: contract.representativeCccd,
        representativeEmail: contract.representativeEmail,
        startDate: contract.startDate,
        endDate: contract.endDate,
        notes: contract.notes ?? null,
    };

    const nextRepCccd = data.representativeCccd !== undefined
        ? data.representativeCccd.trim()
        : contract.representativeCccd;
    const nextRepEmail = data.representativeEmail !== undefined
        ? data.representativeEmail.trim().toLowerCase()
        : contract.representativeEmail;

    // Kiểm tra trùng CCCD với người ở cùng trong chính hợp đồng nháp này
    if (data.representativeCccd !== undefined) {
        const dupCoOccupant = await Occupant.findOne({
            contractId: contract._id,
            isRepresentative: false,
            cccd: nextRepCccd,
        });
        if (dupCoOccupant) {
            throw new AppError(`Số CCCD ${nextRepCccd} bị trùng lặp trong hợp đồng`, 422);
        }
    }

    // Kiểm tra CCCD và Email đại diện như lúc tạo (UC-24)
    if (data.representativeCccd !== undefined || data.representativeEmail !== undefined) {
        await validateRepresentativeCccdAndEmail(nextRepCccd, nextRepEmail, contract._id);
    }

    const repChanged =
        nextRepCccd !== contract.representativeCccd ||
        nextRepEmail !== contract.representativeEmail;

    const currentDurationMonths = inferDurationMonths(contract.startDate, contract.endDate);
    const nextStartDate = data.startDate !== undefined ? new Date(data.startDate) : contract.startDate;
    const nextDurationMonths = data.durationMonths !== undefined ? Number(data.durationMonths) : currentDurationMonths;

    let nextEndDate = contract.endDate;
    if (data.startDate !== undefined || data.durationMonths !== undefined) {
        nextEndDate = calculateEndDate(nextStartDate, nextDurationMonths);
    }

    contract.representativeCccd = nextRepCccd;
    contract.representativeEmail = nextRepEmail;
    contract.startDate = nextStartDate;
    contract.endDate = nextEndDate;
    if (data.notes !== undefined) {
        contract.notes = data.notes.trim() || undefined;
    }

    const after = {
        representativeCccd: contract.representativeCccd,
        representativeEmail: contract.representativeEmail,
        startDate: contract.startDate,
        endDate: contract.endDate,
        notes: contract.notes ?? null,
    };

    await withTransaction(async (session) => {
        await contract.save({ session });

        // Nếu đổi ngày bắt đầu, đồng bộ lại joinDate của người ở cùng trong HĐ nháp
        if (data.startDate !== undefined) {
            await Occupant.updateMany(
                { contractId: contract._id, isRepresentative: false },
                { joinDate: nextStartDate },
                { session },
            );
        }

        // Đổi CCCD hoặc email -> link mời cũ hết hiệu lực
        if (repChanged) {
            await ActivationToken.updateMany(
                {
                    contractId: contract._id,
                    type: ACTIVATION_TYPE.CUSTOMER_INVITE,
                    status: { $in: [null] },
                },
                { status: TOKEN_STATUS.EXPIRED },
                { session },
            );
        }

        await audit(
            {
                actorId: managerId,
                action: AUDIT_ACTION.UPDATE_CONTRACT,
                targetType: 'contracts',
                targetId: contract._id,
                reason: 'Cập nhật hợp đồng nháp',
                metadata: { before, after, inviteInvalidated: repChanged },
            },
            session,
        );
    });

    return {
        contract,
        inviteInvalidated: repChanged,
    };
};

/**
 * Gia hạn hợp đồng (UC-27)
 * - Chỉ hợp đồng ACTIVE
 * - Số tháng nguyên > 0, mặc định 12. Chỉ dời ngày kết thúc. Giá thuê, cư dân, điều khoản giữ nguyên.
 * - Báo chuông CONTRACT_RENEWED + gửi mail cho người đại diện.
 * - Ghi log UPDATE_CONTRACT kèm ngày kết thúc cũ/mới.
 */
export const renewContract = async ({ managerId, contractId, data = {} }) => {
    const contract = await Contract.findById(contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    const { room, building } = await verifyManagerContractScope(managerId, contract);

    if (contract.status !== CONTRACT_STATUS.ACTIVE) {
        throw new AppError('Chỉ gia hạn được hợp đồng đang hiệu lực', 400);
    }

    const months = data.months !== undefined ? Number(data.months) : 12;
    if (!Number.isInteger(months) || months <= 0) {
        throw new AppError('Số tháng gia hạn phải là số nguyên lớn hơn 0', 422);
    }

    const oldEndDate = new Date(contract.endDate);
    // Chu kỳ mới bắt đầu ngay ngày kế tiếp của ngày kết thúc cũ
    const nextCycleStart = new Date(oldEndDate);
    nextCycleStart.setDate(nextCycleStart.getDate() + 1);
    nextCycleStart.setHours(0, 0, 0, 0);

    const newEndDate = calculateEndDate(nextCycleStart, months);

    const repOccupant = await Occupant.findOne({
        contractId: contract._id,
        isRepresentative: true,
    });

    await withTransaction(async (session) => {
        contract.endDate = newEndDate;
        await contract.save({ session });

        if (repOccupant?.userId) {
            await notify(
                {
                    userIds: repOccupant.userId,
                    type: NOTIFICATION_TYPE.CONTRACT_RENEWED,
                    title: 'Hợp đồng thuê phòng đã được gia hạn',
                    message: `Hợp đồng phòng ${room.roomNumber} tại ${building.name} đã được gia hạn thêm ${months} tháng (đến ngày ${formatDateVn(newEndDate)}).`,
                    refId: contract._id,
                    createdBy: managerId,
                },
                session,
            );
        }

        await audit(
            {
                actorId: managerId,
                action: AUDIT_ACTION.UPDATE_CONTRACT,
                targetType: 'contracts',
                targetId: contract._id,
                reason: data.notes?.trim() || `Gia hạn hợp đồng thêm ${months} tháng`,
                metadata: {
                    months,
                    before: { endDate: oldEndDate },
                    after: { endDate: newEndDate },
                },
            },
            session,
        );
    });

    const mailSent = await sendRenewalEmail(
        contract.representativeEmail,
        room.roomNumber,
        building.name,
        months,
        newEndDate,
    );

    return {
        contract,
        warning: mailSent ? undefined : 'Gửi email thông báo gia hạn thất bại',
    };
};

/**
 * Hủy hợp đồng nháp (UC-46)
 * - Chỉ hợp đồng DRAFT
 * - Trong 1 transaction: hợp đồng -> CANCELLED, link mời còn hiệu lực -> EXPIRED,
 *   người ở cùng đã nhập kèm -> LEFT (giữ bản ghi, không xóa). Phòng giữ nguyên AVAILABLE.
 * - Gửi mail tới email đại diện: "Lời mời ký hợp đồng phòng [X] đã bị hủy"
 * - Ghi log UPDATE_CONTRACT kèm lý do
 */
export const cancelDraftContract = async ({ managerId, contractId, data = {} }) => {
    const contract = await Contract.findById(contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    const { room, building } = await verifyManagerContractScope(managerId, contract);

    if (contract.status !== CONTRACT_STATUS.DRAFT) {
        throw new AppError('Chỉ hủy được hợp đồng nháp. Hợp đồng đang hiệu lực phải chấm dứt qua đơn chấm dứt', 400);
    }

    const cleanReason = data.reason?.trim() || undefined;

    await withTransaction(async (session) => {
        contract.status = CONTRACT_STATUS.CANCELLED;
        await contract.save({ session });

        // Link mời còn hiệu lực -> EXPIRED
        await ActivationToken.updateMany(
            {
                contractId: contract._id,
                type: ACTIVATION_TYPE.CUSTOMER_INVITE,
                status: { $in: [null] },
            },
            { status: TOKEN_STATUS.EXPIRED },
            { session },
        );

        // Người ở cùng đã nhập kèm -> LEFT (giữ bản ghi, không xóa)
        await Occupant.updateMany(
            {
                contractId: contract._id,
                status: OCCUPANT_STATUS.STAYED,
            },
            {
                status: OCCUPANT_STATUS.LEFT,
                exitDate: new Date(),
            },
            { session },
        );

        // Ghi nhật ký kèm lý do
        await audit(
            {
                actorId: managerId,
                action: AUDIT_ACTION.UPDATE_CONTRACT,
                targetType: 'contracts',
                targetId: contract._id,
                reason: cleanReason || 'Hủy hợp đồng nháp',
                metadata: {
                    before: { status: CONTRACT_STATUS.DRAFT },
                    after: { status: CONTRACT_STATUS.CANCELLED },
                    reason: cleanReason || null,
                },
            },
            session,
        );
    });

    const mailSent = await sendCancelDraftEmail(
        contract.representativeEmail,
        room.roomNumber,
        building.name,
        cleanReason,
    );

    return {
        contract,
        warning: mailSent ? undefined : 'Gửi email thông báo hủy hợp đồng thất bại',
    };
};
