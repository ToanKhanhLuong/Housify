// Nghiệp vụ cho module incident: Customer gửi báo cáo sự cố, Manager tiếp nhận / giải quyết / từ chối (UC-43, UC-44)
import {
    CONTRACT_STATUS,
    INCIDENT_STATUS,
    NOTIFICATION_TYPE,
    OCCUPANT_STATUS,
    ROLE,
} from '../../constants/enums.js';
import { sendMail } from '../../config/mail.js';
import { endOfVietnamDay, startOfVietnamDay, VIETNAM_OFFSET_MS } from '../../helpers/date.js';
import { notify } from '../../helpers/notify.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { AppError } from '../../utils/AppError.js';
import { paginate } from '../../utils/pagination.js';
import Building from '../../models/Building.js';
import Contract from '../../models/Contract.js';
import Incident from '../../models/Incident.js';
import Manager from '../../models/Manager.js';
import Notification from '../../models/Notification.js';
import Occupant from '../../models/Occupant.js';
import Room from '../../models/Room.js';
import User from '../../models/User.js';

const FORBIDDEN_MESSAGE = 'Bạn không có quyền thực hiện thao tác này';
const CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Mã đơn: SC + năm tháng (giờ Việt Nam) + 4 ký tự ngẫu nhiên, thử lại nếu trùng
const generateIncidentCode = async () => {
    const vietnamNow = new Date(Date.now() + VIETNAM_OFFSET_MS);
    const yymm = `${String(vietnamNow.getUTCFullYear()).slice(2)}${String(vietnamNow.getUTCMonth() + 1).padStart(2, '0')}`;

    while (true) {
        let randomPart = '';
        for (let index = 0; index < 4; index += 1) {
            randomPart += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
        }
        const code = `SC${yymm}${randomPart}`;
        const exists = await Incident.exists({ incidentCode: code });
        if (!exists) return code;
    }
};

// status, type sau validate là mảng (commaSeparatedEnum); vẫn nhận chuỗi khi gọi không qua validate
const toList = (value) => {
    if (Array.isArray(value)) return value;
    return typeof value === 'string' && value.trim()
        ? value.split(',').map((item) => item.trim()).filter(Boolean)
        : [];
};

// Hợp đồng đang hiệu lực mà Customer đang là người đại diện
const findActiveContractOfCustomer = async (customerId) => {
    const representatives = await Occupant.find({
        userId: customerId,
        isRepresentative: true,
        status: OCCUPANT_STATUS.STAYED,
    })
        .select('contractId')
        .lean();

    return Contract.findOne({
        _id: { $in: representatives.map((occupant) => occupant.contractId) },
        status: CONTRACT_STATUS.ACTIVE,
    }).lean();
};

// Manager chỉ thao tác trên đơn thuộc phòng của tòa mình phụ trách
const verifyManagerScope = async (managerId, roomId) => {
    const room = await Room.findById(roomId).select('buildingId').lean();
    const building = room
        ? await Building.findOne({ _id: room.buildingId, managerId, isDeleted: false }).select('_id').lean()
        : null;
    if (!building) {
        throw new AppError(FORBIDDEN_MESSAGE, 403);
    }
};

/**
 * Ghép thông tin phòng và người gửi vào đơn: room { _id, roomNumber, floorNumber }, reporter { name, phone }
 */
const attachRoomAndReporter = async (incidents) => {
    const [rooms, representatives] = await Promise.all([
        Room.find({ _id: { $in: incidents.map((incident) => incident.roomId) } })
            .select('_id roomNumber floorNumber')
            .lean(),
        Occupant.find({
            contractId: { $in: incidents.map((incident) => incident.contractId) },
            isRepresentative: true,
        })
            .select('contractId name phone')
            .lean(),
    ]);
    const roomMap = new Map(rooms.map((room) => [String(room._id), room]));
    const representativeMap = new Map(
        representatives.map((occupant) => [String(occupant.contractId), occupant]),
    );

    return incidents.map((incident) => {
        const representative = representativeMap.get(String(incident.contractId));
        return {
            ...incident,
            room: roomMap.get(String(incident.roomId)) ?? null,
            reporter: representative
                ? { name: representative.name, phone: representative.phone }
                : null,
        };
    });
};

/**
 * Customer gửi báo cáo sự cố (UC-43): đơn ở trạng thái Chờ xử lý, báo Manager của tòa qua chuông + email.
 * Gửi email lỗi thì đơn và thông báo vẫn được lưu, trả kèm cảnh báo.
 */
export const createIncident = async ({ customerId, data }) => {
    const contract = await findActiveContractOfCustomer(customerId);
    if (!contract) {
        throw new AppError('Chỉ khách có hợp đồng đang hiệu lực mới gửi được báo cáo sự cố', 400);
    }

    const room = await Room.findById(contract.roomId).select('roomNumber buildingId').lean();
    const building = room
        ? await Building.findOne({ _id: room.buildingId, isDeleted: false }).select('managerId').lean()
        : null;
    const incidentCode = await generateIncidentCode();
    const notifyMessage = `Có đơn báo cáo mới từ Phòng ${room?.roomNumber ?? ''}`;

    const incident = await withTransaction(async (session) => {
        const [created] = await Incident.create(
            [
                {
                    incidentCode,
                    contractId: contract._id,
                    roomId: contract.roomId,
                    reportedBy: customerId,
                    type: data.type,
                    title: data.title,
                    description: data.description,
                    images: data.images ?? [],
                },
            ],
            { session },
        );

        if (building?.managerId) {
            await notify(
                {
                    userIds: building.managerId,
                    type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
                    title: 'Báo cáo sự cố mới',
                    message: notifyMessage,
                    refId: created._id,
                    createdBy: customerId,
                },
                session,
            );
        }
        return created;
    });

    let warning;
    if (building?.managerId) {
        const manager = await User.findById(building.managerId).select('email').lean();
        const sent = manager?.email
            ? await sendMail(
                manager.email,
                `[Housify] ${notifyMessage}`,
                `<p>${notifyMessage}. Mã đơn: <b>${incidentCode}</b>. Vui lòng đăng nhập để xử lý.</p>`,
            )
            : false;
        if (!sent) warning = 'Gửi email cho quản lý tòa thất bại';
    }

    return { ...incident.toObject(), ...(warning && { warning }) };
};

/**
 * Danh sách đơn (UC-43, UC-44). Customer: đơn mình đã gửi. Manager: đơn thuộc tòa mình phụ trách.
 * Lọc theo trạng thái, loại, phòng, thời gian gửi; mới nhất trước.
 */
export const getIncidents = async ({ userId, roleId, query = {} }) => {
    const { status, type, roomId, from, to, page = 1, limit = 10 } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const filter = {};

    if (roleId === ROLE.CUSTOMER) {
        filter.reportedBy = userId;
    } else {
        const building = await Building.findOne({ managerId: userId, isDeleted: false }).select('_id').lean();
        if (!building) {
            if (roomId) throw new AppError(FORBIDDEN_MESSAGE, 403);
            return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
        }
        const rooms = await Room.find({ buildingId: building._id }).select('_id').lean();
        const buildingRoomIds = rooms.map((room) => String(room._id));

        if (roomId) {
            const targetRoom = await Room.findOne({ _id: roomId, isDeleted: false }).select('_id').lean();
            if (!targetRoom) throw new AppError('Không tìm thấy phòng', 404);
            if (!buildingRoomIds.includes(String(roomId))) throw new AppError(FORBIDDEN_MESSAGE, 403);
            filter.roomId = roomId;
        } else {
            filter.roomId = { $in: buildingRoomIds };
        }
    }

    const statusList = toList(status);
    const typeList = toList(type);
    if (statusList.length > 0) filter.status = { $in: statusList };
    if (typeList.length > 0) filter.type = { $in: typeList };
    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = startOfVietnamDay(from);
        if (to) filter.createdAt.$lte = endOfVietnamDay(to);
    }

    const result = await paginate(Incident, filter, {
        page: pageNum,
        limit: limitNum,
        sort: { createdAt: -1 },
    });

    return {
        items: await attachRoomAndReporter(result.items),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit) || 0,
    };
};

/**
 * Chi tiết đơn (UC-43, UC-44): kèm phòng, người gửi, tên Manager xử lý và lịch sử trạng thái.
 * Lịch sử chính là chuỗi thông báo "Cập nhật sự cố" đã gửi cho khách, gắn với đơn này.
 */
export const getIncidentById = async ({ userId, roleId, incidentId }) => {
    const incident = await Incident.findById(incidentId).lean();
    if (!incident) {
        throw new AppError('Không tìm thấy đơn sự cố', 404);
    }

    if (roleId === ROLE.CUSTOMER) {
        if (String(incident.reportedBy) !== String(userId)) {
            throw new AppError(FORBIDDEN_MESSAGE, 403);
        }
    } else {
        await verifyManagerScope(userId, incident.roomId);
    }

    const [[withRoom], handler, history] = await Promise.all([
        attachRoomAndReporter([incident]),
        incident.handledBy
            ? Manager.findOne({ userId: incident.handledBy }).select('name').lean()
            : null,
        Notification.find({
            type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
            refId: incident._id,
            userId: incident.reportedBy,
        })
            .select('title message createdAt')
            .sort({ createdAt: 1 })
            .lean(),
    ]);

    return { ...withRoom, handledByName: handler?.name ?? null, history };
};

/**
 * Đổi trạng thái đơn trong 1 transaction và báo khách.
 * Điều kiện status nằm trong câu lệnh cập nhật để 2 thao tác cùng lúc không ghi đè nhau.
 */
const changeStatus = async ({ managerId, incidentId, allowedFrom, update, notifyMessage, blockedMessage }) => {
    const incident = await Incident.findById(incidentId).select('roomId status reportedBy').lean();
    if (!incident) {
        throw new AppError('Không tìm thấy đơn sự cố', 404);
    }
    await verifyManagerScope(managerId, incident.roomId);

    if ([INCIDENT_STATUS.RESOLVED, INCIDENT_STATUS.REJECTED].includes(incident.status)) {
        throw new AppError('Đơn đã được xử lý', 400);
    }
    if (!allowedFrom.includes(incident.status)) {
        throw new AppError(blockedMessage, 400);
    }

    return withTransaction(async (session) => {
        const updated = await Incident.findOneAndUpdate(
            { _id: incidentId, status: { $in: allowedFrom } },
            { $set: { ...update, handledBy: managerId } },
            { new: true, session },
        );
        if (!updated) {
            throw new AppError('Đơn đã được xử lý', 400);
        }

        await notify(
            {
                userIds: incident.reportedBy,
                type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
                title: 'Cập nhật sự cố',
                message: notifyMessage(updated),
                refId: updated._id,
                createdBy: managerId,
            },
            session,
        );
        return updated;
    });
};

// UC-44: Chờ xử lý → Đang xử lý
export const acceptIncident = ({ managerId, incidentId }) =>
    changeStatus({
        managerId,
        incidentId,
        allowedFrom: [INCIDENT_STATUS.PENDING],
        update: { status: INCIDENT_STATUS.IN_PROGRESS },
        notifyMessage: (incident) => `Đơn ${incident.incidentCode} của bạn đang được xử lý`,
        blockedMessage: 'Đơn đang được xử lý',
    });

// UC-44: Đang xử lý → Đã giải quyết, lưu ghi chú kết quả và thời điểm giải quyết
export const resolveIncident = ({ managerId, incidentId, data }) =>
    changeStatus({
        managerId,
        incidentId,
        allowedFrom: [INCIDENT_STATUS.IN_PROGRESS],
        update: {
            status: INCIDENT_STATUS.RESOLVED,
            resultNote: data.resultNote,
            resolvedAt: new Date(),
        },
        notifyMessage: (incident) =>
            `Đơn ${incident.incidentCode} của bạn đã được giải quyết. Kết quả: ${incident.resultNote}`,
        blockedMessage: 'Vui lòng tiếp nhận đơn trước khi đánh dấu đã giải quyết',
    });

// UC-44: Chờ xử lý / Đang xử lý → Bị từ chối, kèm lý do
export const rejectIncident = ({ managerId, incidentId, data }) =>
    changeStatus({
        managerId,
        incidentId,
        allowedFrom: [INCIDENT_STATUS.PENDING, INCIDENT_STATUS.IN_PROGRESS],
        update: { status: INCIDENT_STATUS.REJECTED, resultNote: data.resultNote },
        notifyMessage: (incident) =>
            `Đơn ${incident.incidentCode} của bạn bị từ chối. Lý do: ${incident.resultNote}`,
        blockedMessage: 'Đơn đã được xử lý',
    });
