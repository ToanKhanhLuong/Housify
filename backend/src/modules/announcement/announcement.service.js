// Nghiệp vụ cho module announcement: Manager gửi thông báo chung và xem lịch sử thông báo đã gửi (UC-40)
import mongoose from 'mongoose';
import {
    CONTRACT_STATUS,
    NOTIFICATION_TYPE,
    OCCUPANT_STATUS,
    ROLE,
    USER_STATUS,
} from '../../constants/enums.js';
import { sendMail } from '../../config/mail.js';
import { endOfVietnamDay, startOfVietnamDay } from '../../helpers/date.js';
import { escapeRegex } from '../../helpers/filter.js';
import { notify } from '../../helpers/notify.js';
import { AppError } from '../../utils/AppError.js';
import Building from '../../models/Building.js';
import Contract from '../../models/Contract.js';
import Notification from '../../models/Notification.js';
import Occupant from '../../models/Occupant.js';
import Room from '../../models/Room.js';
import User from '../../models/User.js';

/**
 * Phân loại mẫu thông báo tự động dựa trên tiêu đề và nội dung
 */
export const detectAnnouncementCategory = (title = '', message = '') => {
    const combined = `${title} ${message}`.toLowerCase();
    if (/bảo trì|sửa chữa|thang máy|cắt điện|cắt nước|khử trùng|pccc|hệ thống điện|hệ thống nước/i.test(combined)) {
        return 'MAINTENANCE';
    }
    if (/nội quy|quy định|giờ giấc|an ninh|vệ sinh|để xe|ra vào/i.test(combined)) {
        return 'RULE';
    }
    if (/nhắc nhở|quá hạn|thanh toán|đóng tiền|hóa đơn|tiền phòng/i.test(combined)) {
        return 'REMINDER';
    }
    return 'GENERAL';
};

// Tiêu đề, nội dung do Manager nhập nên phải thoát ký tự HTML trước khi đưa vào email
const escapeHtml = (text) =>
    String(text).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char]));

const announcementEmailHtml = (buildingName, title, message) => `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="color: #714b67;">${escapeHtml(title)}</h2>
        <p style="white-space: pre-line;">${escapeHtml(message)}</p>
        <p style="color: #6b7280;">Thông báo từ quản lý ${escapeHtml(buildingName)}.</p>
    </div>
`;

/**
 * Lấy roomId cần gửi: 'ALL' = mọi phòng của tòa; mảng phòng thì mọi phòng phải thuộc tòa của Manager
 */
const resolveTargetRoomIds = async (buildingId, target) => {
    const rooms = await Room.find({ buildingId, isDeleted: false }).select('_id').lean();
    const buildingRoomIds = rooms.map((room) => String(room._id));

    if (target === 'ALL') return buildingRoomIds;

    const outsideBuilding = target.some((roomId) => !buildingRoomIds.includes(String(roomId)));
    if (outsideBuilding) {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }
    return target;
};

/**
 * Người nhận: tài khoản Customer đang hoạt động của người đại diện, thuộc hợp đồng đang hiệu lực ở các phòng được chọn.
 * Người ở cùng không có tài khoản nên không nhận.
 */
const findRecipients = async (roomIds) => {
    const contracts = await Contract.find({
        roomId: { $in: roomIds },
        status: CONTRACT_STATUS.ACTIVE,
    })
        .select('_id')
        .lean();

    const representatives = await Occupant.find({
        contractId: { $in: contracts.map((contract) => contract._id) },
        isRepresentative: true,
        status: OCCUPANT_STATUS.STAYED,
    })
        .select('userId')
        .lean();

    return User.find({
        _id: { $in: representatives.map((occupant) => occupant.userId).filter(Boolean) },
        roleId: ROLE.CUSTOMER,
        status: USER_STATUS.ACTIVE,
    })
        .select('_id email')
        .lean();
};

/**
 * Gửi thông báo chung (UC-40): mỗi người nhận một bản ghi thông báo (hiện trong chuông) và một email.
 * Gửi email lỗi thì thông báo vẫn được tạo, trả kèm cảnh báo.
 */
export const sendAnnouncement = async ({ managerId, data }) => {
    const building = await Building.findOne({ managerId, isDeleted: false }).select('_id name').lean();
    if (!building) {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    const roomIds = await resolveTargetRoomIds(building._id, data.target);
    const recipients = await findRecipients(roomIds);
    if (recipients.length === 0) {
        throw new AppError('Không có tài khoản Customer nào để gửi thông báo', 400);
    }

    const batchId = new mongoose.Types.ObjectId();

    await notify({
        userIds: recipients.map((user) => user._id),
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: data.title,
        message: data.message,
        refId: batchId,
        createdBy: managerId,
    });

    const html = announcementEmailHtml(building.name, data.title, data.message);
    const mailResults = await Promise.all(
        recipients.map((user) => sendMail(user.email, `[Housify] ${data.title}`, html)),
    );
    const failedCount = mailResults.filter((sent) => !sent).length;

    return {
        batchId,
        sentCount: recipients.length,
        ...(failedCount > 0 && { warning: `Có ${failedCount} email gửi thất bại` }),
    };
};

/**
 * Lấy lịch sử các đợt thông báo chung mà Manager đã gửi (UC-40)
 * Hỗ trợ lọc theo từ khóa (q), phân loại mẫu (category), khoảng ngày (from, to) và phân trang.
 */
export const listAnnouncements = async ({ managerId, query = {} }) => {
    const building = await Building.findOne({ managerId, isDeleted: false }).select('_id name').lean();
    if (!building) {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    const { q, category = 'ALL', from, to, page = 1, limit = 10 } = query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));

    const filter = {
        createdBy: managerId,
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
    };

    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = startOfVietnamDay(from);
        if (to) filter.createdAt.$lte = endOfVietnamDay(to);
    }

    if (q && String(q).trim()) {
        const regex = new RegExp(escapeRegex(String(q).trim()), 'i');
        filter.$or = [{ title: regex }, { message: regex }];
    }

    const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .select('_id userId title message refId isRead createdAt')
        .lean();

    // Map userId -> danh sách phòng của tòa mà người đại diện từng/đang ở
    const rooms = await Room.find({ buildingId: building._id, isDeleted: false })
        .select('_id roomNumber')
        .lean();
    const roomNumberById = new Map(rooms.map((r) => [String(r._id), r.roomNumber]));
    const contracts = await Contract.find({ roomId: { $in: rooms.map((r) => r._id) } })
        .select('_id roomId status')
        .lean();
    const contractById = new Map(contracts.map((c) => [String(c._id), c]));

    const recipientUserIds = [...new Set(notifications.map((n) => String(n.userId)).filter(Boolean))];
    const repOccupants = recipientUserIds.length > 0
        ? await Occupant.find({
              userId: { $in: recipientUserIds },
              isRepresentative: true,
              contractId: { $in: contracts.map((c) => c._id) },
          })
              .sort({ createdAt: -1 })
              .select('userId contractId status')
              .lean()
        : [];

    const roomNumberByUserId = new Map();
    repOccupants.forEach((occ) => {
        const uid = String(occ.userId);
        if (roomNumberByUserId.has(uid)) return;
        const contract = contractById.get(String(occ.contractId));
        const roomNumber = contract ? roomNumberById.get(String(contract.roomId)) : null;
        if (roomNumber) {
            roomNumberByUserId.set(uid, roomNumber);
        }
    });

    // Gom nhóm các bản ghi notification thuộc cùng 1 đợt gửi (theo refId hoặc theo tiêu đề + nội dung + cửa sổ 5 giây)
    const batchMap = new Map();
    notifications.forEach((item) => {
        const timeBucket = Math.floor(new Date(item.createdAt).getTime() / 5000);
        const batchKey = item.refId
            ? String(item.refId)
            : `${item.title}||${item.message}||${timeBucket}`;

        if (!batchMap.has(batchKey)) {
            batchMap.set(batchKey, {
                _id: item.refId ? String(item.refId) : String(item._id),
                title: item.title,
                message: item.message,
                category: detectAnnouncementCategory(item.title, item.message),
                createdAt: item.createdAt,
                recipientCount: 0,
                readCount: 0,
                roomSet: new Set(),
            });
        }

        const group = batchMap.get(batchKey);
        group.recipientCount += 1;
        if (item.isRead) group.readCount += 1;
        const roomNumber = roomNumberByUserId.get(String(item.userId));
        if (roomNumber) group.roomSet.add(roomNumber);
    });

    let groupedList = Array.from(batchMap.values()).map(({ roomSet, ...rest }) => ({
        ...rest,
        roomNumbers: Array.from(roomSet).sort((a, b) =>
            String(a).localeCompare(String(b), 'vi', { numeric: true }),
        ),
    }));

    if (category && category !== 'ALL') {
        groupedList = groupedList.filter((item) => item.category === category);
    }

    const total = groupedList.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const startIndex = (pageNum - 1) * limitNum;
    const items = groupedList.slice(startIndex, startIndex + limitNum);

    return {
        items,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
    };
};

