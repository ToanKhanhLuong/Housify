// Nghiệp vụ cho module announcement: Manager gửi thông báo chung cho khách trong tòa mình (UC-40)
import {
    CONTRACT_STATUS,
    NOTIFICATION_TYPE,
    OCCUPANT_STATUS,
    ROLE,
    USER_STATUS,
} from '../../constants/enums.js';
import { sendMail } from '../../config/mail.js';
import { notify } from '../../helpers/notify.js';
import { AppError } from '../../utils/AppError.js';
import Building from '../../models/Building.js';
import Contract from '../../models/Contract.js';
import Occupant from '../../models/Occupant.js';
import Room from '../../models/Room.js';
import User from '../../models/User.js';

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

    await notify({
        userIds: recipients.map((user) => user._id),
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: data.title,
        message: data.message,
        createdBy: managerId,
    });

    const html = announcementEmailHtml(building.name, data.title, data.message);
    const mailResults = await Promise.all(
        recipients.map((user) => sendMail(user.email, `[Housify] ${data.title}`, html)),
    );
    const failedCount = mailResults.filter((sent) => !sent).length;

    return {
        sentCount: recipients.length,
        ...(failedCount > 0 && { warning: `Có ${failedCount} email gửi thất bại` }),
    };
};
