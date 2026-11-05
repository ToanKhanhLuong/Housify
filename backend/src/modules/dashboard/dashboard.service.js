// Nghiệp vụ cho module dashboard: tổng quan Admin (UC-07), tổng quan Manager (UC-47), báo cáo (UC-48). Chỉ đọc, không ghi dữ liệu
import {
    AUDIT_ACTION,
    CONTRACT_STATUS,
    INCIDENT_STATUS,
    INVOICE_STATUS,
    OCCUPANT_STATUS,
    ROLE,
    ROOM_STATUS,
    TERMINATION_STATUS,
    USER_STATUS,
} from '../../constants/enums.js';
import { endOfVietnamDay, startOfVietnamDay, VIETNAM_OFFSET_MS } from '../../helpers/date.js';
import { AppError } from '../../utils/AppError.js';
import AuditLog from '../../models/AuditLog.js';
import Building from '../../models/Building.js';
import Contract from '../../models/Contract.js';
import Incident from '../../models/Incident.js';
import Invoice from '../../models/Invoice.js';
import Manager from '../../models/Manager.js';
import Occupant from '../../models/Occupant.js';
import Room from '../../models/Room.js';
import RoomType from '../../models/RoomType.js';
import TerminationRequest from '../../models/TerminationRequest.js';
import User from '../../models/User.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_INCIDENT_STATUSES = [INCIDENT_STATUS.PENDING, INCIDENT_STATUS.IN_PROGRESS];

const AUDIT_ACTION_META = {
    [AUDIT_ACTION.ADD_OCCUPANT]: {
        category: 'Cư dân',
        title: 'Thêm người ở cùng vào phòng',
        badgeText: 'Thêm cư dân',
        badgeTone: 'ok',
    },
    [AUDIT_ACTION.UPDATE_OCCUPANT]: {
        category: 'Cư dân',
        title: 'Cập nhật hồ sơ cư dân',
        badgeText: 'Cập nhật',
        badgeTone: 'info',
    },
    [AUDIT_ACTION.REMOVE_OCCUPANT]: {
        category: 'Cư dân',
        title: 'Rút tên người ở cùng khỏi phòng',
        badgeText: 'Rời phòng',
        badgeTone: 'warn',
    },
    [AUDIT_ACTION.UPDATE_CONTRACT]: {
        category: 'Hợp đồng',
        title: 'Cập nhật thông tin hợp đồng',
        badgeText: 'Hợp đồng',
        badgeTone: 'plum',
    },
    [AUDIT_ACTION.ASSIGN_MANAGER]: {
        category: 'Quản lý tòa',
        title: 'Phân công Manager phụ trách tòa nhà',
        badgeText: 'Phân công',
        badgeTone: 'ok',
    },
    [AUDIT_ACTION.UNASSIGN_MANAGER]: {
        category: 'Quản lý tòa',
        title: 'Gỡ phân công Manager khỏi tòa nhà',
        badgeText: 'Gỡ quản lý',
        badgeTone: 'warn',
    },
    [AUDIT_ACTION.LOCK_USER]: {
        category: 'Tài khoản',
        title: 'Khóa tài khoản người dùng',
        badgeText: 'Đã khóa',
        badgeTone: 'red',
    },
    [AUDIT_ACTION.UNLOCK_USER]: {
        category: 'Tài khoản',
        title: 'Mở khóa tài khoản người dùng',
        badgeText: 'Mở khóa',
        badgeTone: 'ok',
    },
    [AUDIT_ACTION.UPDATE_MANAGER]: {
        category: 'Nhân sự',
        title: 'Cập nhật hồ sơ Manager',
        badgeText: 'Cập nhật',
        badgeTone: 'info',
    },
    [AUDIT_ACTION.RESEND_ACTIVATION]: {
        category: 'Tài khoản',
        title: 'Gửi lại liên kết kích hoạt tài khoản',
        badgeText: 'Kích hoạt',
        badgeTone: 'plum',
    },
    [AUDIT_ACTION.DEACTIVATE_USER]: {
        category: 'Tài khoản',
        title: 'Ngưng hoạt động tài khoản sau trả phòng',
        badgeText: 'Ngưng TK',
        badgeTone: 'gray',
    },
    [AUDIT_ACTION.REACTIVATE_USER]: {
        category: 'Tài khoản',
        title: 'Kích hoạt lại tài khoản khách thuê lại',
        badgeText: 'Mở lại TK',
        badgeTone: 'ok',
    },
};

// Đầu và cuối tháng chứa thời điểm now, theo giờ Việt Nam
const currentMonthRange = (now) => {
    const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
    const year = vietnamNow.getUTCFullYear();
    const month = vietnamNow.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1) - VIETNAM_OFFSET_MS);
    const end = new Date(Date.UTC(year, month + 1, 1) - VIETNAM_OFFSET_MS - 1);
    return { start, end };
};

// Thời điểm → "YYYY-MM" theo giờ Việt Nam
const vietnamMonthKey = (date) => {
    const vietnamTime = new Date(new Date(date).getTime() + VIETNAM_OFFSET_MS);
    return `${vietnamTime.getUTCFullYear()}-${String(vietnamTime.getUTCMonth() + 1).padStart(2, '0')}`;
};

/**
 * Phạm vi dữ liệu của một tòa (buildingId) hoặc toàn hệ thống (không truyền).
 * Phòng và tòa đã xóa không tính vào bất kỳ con số nào.
 */
const loadScope = async (buildingId) => {
    const buildings = await Building.find({
        isDeleted: false,
        ...(buildingId && { _id: buildingId }),
    })
        .select('_id name address floorCount images managerId')
        .lean();

    const rooms = await Room.find({
        buildingId: { $in: buildings.map((building) => building._id) },
        isDeleted: false,
    })
        .select('_id buildingId floorNumber roomTypeId roomNumber area images rentPrice deposit status')
        .lean();

    const contracts = await Contract.find({ roomId: { $in: rooms.map((room) => room._id) } })
        .select('_id roomId status endDate activatedAt representativeEmail createdBy createdAt')
        .lean();

    return {
        buildings,
        rooms,
        contracts,
        roomIds: rooms.map((room) => room._id),
        contractIds: contracts.map((contract) => contract._id),
        activeContractIds: contracts
            .filter((contract) => contract.status === CONTRACT_STATUS.ACTIVE)
            .map((contract) => contract._id),
    };
};

const roomStats = (rooms) => ({
    total: rooms.length,
    available: rooms.filter((room) => room.status === ROOM_STATUS.AVAILABLE).length,
    occupied: rooms.filter((room) => room.status === ROOM_STATUS.OCCUPIED).length,
    maintenance: rooms.filter((room) => room.status === ROOM_STATUS.MAINTENANCE).length,
});

// Doanh thu: tổng tiền các hóa đơn đã thanh toán có ngày thanh toán trong khoảng, tức tiền thực về
const sumRevenue = async (contractIds, start, end) => {
    const [row] = await Invoice.aggregate([
        {
            $match: {
                contractId: { $in: contractIds },
                status: INVOICE_STATUS.PAID,
                paidAt: { $gte: start, $lte: end },
            },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    return row?.total ?? 0;
};

const countOpenIncidents = (roomIds) =>
    Incident.countDocuments({ roomId: { $in: roomIds }, status: { $in: OPEN_INCIDENT_STATUSES } });

// Số người dùng: tài khoản Manager và Customer đang hoạt động. Lọc theo tòa: Manager của tòa + người đại diện đang thuê
const countUsers = async (scope, buildingId) => {
    if (!buildingId) {
        return User.countDocuments({
            roleId: { $in: [ROLE.MANAGER, ROLE.CUSTOMER] },
            status: USER_STATUS.ACTIVE,
        });
    }

    const representativeIds = await Occupant.distinct('userId', {
        contractId: { $in: scope.activeContractIds },
        isRepresentative: true,
        status: OCCUPANT_STATUS.STAYED,
    });
    const managerIds = scope.buildings.map((building) => building.managerId).filter(Boolean);
    return User.countDocuments({
        _id: { $in: [...representativeIds, ...managerIds] },
        status: USER_STATUS.ACTIVE,
    });
};

// Tổng hợp thông tin tòa tiêu điểm, danh sách phòng kèm ảnh và hoạt động gần đây trong phạm vi
const loadDashboardExtras = async (scope, isFilteredByBuilding) => {
    const buildingById = new Map(scope.buildings.map((building) => [String(building._id), building]));
    const roomById = new Map(scope.rooms.map((room) => [String(room._id), room]));
    const contractById = new Map(scope.contracts.map((contract) => [String(contract._id), contract]));

    // 1. Thông tin tòa nhà tiêu điểm và Manager phụ trách
    const targetBuilding =
        scope.buildings.find((building) => Array.isArray(building.images) && building.images.length > 0) ??
        scope.buildings[0] ??
        null;

    let managerInfo = null;
    if (targetBuilding?.managerId) {
        const [managerDoc, managerUser] = await Promise.all([
            Manager.findOne({ userId: targetBuilding.managerId }).select('name phone').lean(),
            User.findById(targetBuilding.managerId).select('email status').lean(),
        ]);
        if (managerDoc || managerUser) {
            managerInfo = {
                _id: targetBuilding.managerId,
                name: managerDoc?.name ?? '',
                phone: managerDoc?.phone ?? '',
                email: managerUser?.email ?? '',
                status: managerUser?.status ?? '',
            };
        }
    }

    const buildingOverview = targetBuilding
        ? {
              _id: targetBuilding._id,
              name: targetBuilding.name,
              address: targetBuilding.address,
              floorCount: targetBuilding.floorCount,
              images: targetBuilding.images ?? [],
              manager: managerInfo,
          }
        : null;

    // 2. Danh sách phòng kèm ảnh, loại phòng, sức chứa và số người đang ở
    const roomTypeIds = [...new Set(scope.rooms.map((room) => String(room.roomTypeId)).filter(Boolean))];
    const [roomTypes, activeOccupants] = await Promise.all([
        RoomType.find({ _id: { $in: roomTypeIds } }).select('_id name capacity').lean(),
        Occupant.find({
            contractId: { $in: scope.activeContractIds },
            status: OCCUPANT_STATUS.STAYED,
        })
            .select('_id contractId userId name isRepresentative')
            .lean(),
    ]);

    const roomTypeById = new Map(roomTypes.map((type) => [String(type._id), type]));
    const occupantCountByRoom = new Map();
    const repNameByContract = new Map();

    activeOccupants.forEach((occupant) => {
        const contract = contractById.get(String(occupant.contractId));
        if (!contract) return;
        const roomKey = String(contract.roomId);
        occupantCountByRoom.set(roomKey, (occupantCountByRoom.get(roomKey) ?? 0) + 1);
        if (occupant.isRepresentative && occupant.name) {
            repNameByContract.set(String(contract._id), occupant.name);
        }
    });

    const sortedRooms = [...scope.rooms].sort((a, b) => {
        const aHasImg = Array.isArray(a.images) && a.images.length > 0 ? 1 : 0;
        const bHasImg = Array.isArray(b.images) && b.images.length > 0 ? 1 : 0;
        if (bHasImg !== aHasImg) return bHasImg - aHasImg;
        if (a.floorNumber !== b.floorNumber) return a.floorNumber - b.floorNumber;
        return String(a.roomNumber).localeCompare(String(b.roomNumber), 'vi', { numeric: true });
    });

    const featuredRooms = sortedRooms.slice(0, 24).map((room) => {
        const roomType = roomTypeById.get(String(room.roomTypeId));
        const building = buildingById.get(String(room.buildingId));
        return {
            _id: room._id,
            roomNumber: room.roomNumber,
            floorNumber: room.floorNumber,
            area: room.area,
            rentPrice: room.rentPrice,
            deposit: room.deposit,
            status: room.status,
            images: room.images ?? [],
            buildingName: building?.name ?? '',
            roomTypeName: roomType?.name ?? '',
            capacity: roomType?.capacity ?? 0,
            occupantCount: occupantCountByRoom.get(String(room._id)) ?? 0,
        };
    });

    // 3. Hoạt động gần đây: gộp từ audit_logs, hợp đồng vừa kích hoạt và sự cố phòng
    const managerIds = scope.buildings.map((building) => building.managerId).filter(Boolean);
    const buildingIds = scope.buildings.map((building) => building._id);
    const occupantIds = activeOccupants.map((occupant) => occupant._id);

    const auditQuery = isFilteredByBuilding
        ? {
              $or: [
                  { targetId: { $in: [...scope.contractIds, ...scope.roomIds, ...buildingIds, ...occupantIds] } },
                  { actorId: { $in: managerIds } },
              ],
          }
        : {};

    const [auditLogs, recentIncidents] = await Promise.all([
        AuditLog.find(auditQuery).sort({ createdAt: -1 }).limit(8).lean(),
        Incident.find({ roomId: { $in: scope.roomIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('_id incidentCode roomId reportedBy title status createdAt')
            .lean(),
    ]);

    const actorIds = [
        ...new Set(
            [
                ...auditLogs.map((log) => log.actorId),
                ...recentIncidents.map((incident) => incident.reportedBy),
            ]
                .filter(Boolean)
                .map(String),
        ),
    ];

    const [actorManagers, actorOccupants, actorUsers] = await Promise.all([
        Manager.find({ userId: { $in: actorIds } }).select('userId name').lean(),
        Occupant.find({ userId: { $in: actorIds } }).select('userId name').lean(),
        User.find({ _id: { $in: actorIds } }).select('_id email roleId').lean(),
    ]);

    const actorNameById = new Map();
    actorUsers.forEach((user) => {
        actorNameById.set(String(user._id), user.roleId === ROLE.ADMIN ? 'Admin' : user.email);
    });
    actorOccupants.forEach((occupant) => {
        if (occupant.userId && occupant.name) actorNameById.set(String(occupant.userId), occupant.name);
    });
    actorManagers.forEach((manager) => {
        if (manager.userId && manager.name) actorNameById.set(String(manager.userId), `QL ${manager.name}`);
    });

    const auditItems = auditLogs.map((log) => {
        const meta = AUDIT_ACTION_META[log.action] ?? {
            category: 'Nhật ký',
            title: `Thao tác ${log.action}`,
            badgeText: 'Hệ thống',
            badgeTone: 'gray',
        };
        let code = 'Hệ thống';
        const targetContract = contractById.get(String(log.targetId));
        if (targetContract) {
            const room = roomById.get(String(targetContract.roomId));
            if (room) code = `P.${room.roomNumber}`;
        } else {
            const targetRoom = roomById.get(String(log.targetId));
            if (targetRoom) code = `P.${targetRoom.roomNumber}`;
            const targetBuildingDoc = buildingById.get(String(log.targetId));
            if (targetBuildingDoc) code = targetBuildingDoc.name;
        }

        const actorName = log.actorId ? (actorNameById.get(String(log.actorId)) ?? 'Người dùng') : 'Hệ thống';

        return {
            _id: `audit-${log._id}`,
            code,
            category: meta.category,
            title: meta.title,
            actorName,
            badgeText: meta.badgeText,
            badgeTone: meta.badgeTone,
            detail: log.reason ? `Lý do: ${log.reason}` : `Thực hiện bởi ${actorName}.`,
            createdAt: log.createdAt,
        };
    });

    const activatedContractItems = scope.contracts
        .filter((contract) => Boolean(contract.activatedAt))
        .sort((a, b) => new Date(b.activatedAt) - new Date(a.activatedAt))
        .slice(0, 5)
        .map((contract) => {
            const room = roomById.get(String(contract.roomId));
            const building = room ? buildingById.get(String(room.buildingId)) : null;
            const repName = repNameByContract.get(String(contract._id)) || contract.representativeEmail || 'Khách thuê';
            return {
                _id: `contract-${contract._id}`,
                code: room ? `P.${room.roomNumber}` : 'Hợp đồng',
                category: 'Ký hợp đồng',
                title: `Đã kích hoạt hợp đồng thuê phòng ${room?.roomNumber ?? ''}`,
                actorName: repName,
                badgeText: 'Đã ký HĐ',
                badgeTone: 'ok',
                detail: `${repName} đã kích hoạt hợp đồng tại ${building?.name ?? 'tòa nhà'}.`,
                createdAt: contract.activatedAt,
            };
        });

    const incidentItems = recentIncidents.map((incident) => {
        const room = roomById.get(String(incident.roomId));
        const reporterName = incident.reportedBy
            ? (actorNameById.get(String(incident.reportedBy)) ?? 'Cư dân')
            : 'Cư dân';
        const isResolved = incident.status === INCIDENT_STATUS.RESOLVED;
        const isInProgress = incident.status === INCIDENT_STATUS.IN_PROGRESS;
        return {
            _id: `incident-${incident._id}`,
            code: room ? `P.${room.roomNumber}` : incident.incidentCode,
            category: 'Sự cố phòng',
            title: `${incident.title} (${incident.incidentCode})`,
            actorName: reporterName,
            badgeText: isResolved ? 'Đã xử lý' : isInProgress ? 'Đang xử lý' : 'Chờ xử lý',
            badgeTone: isResolved ? 'ok' : isInProgress ? 'info' : 'warn',
            detail: `Sự cố mã ${incident.incidentCode} tại phòng ${room?.roomNumber ?? ''} do ${reporterName} gửi.`,
            createdAt: incident.createdAt,
        };
    });

    const recentActivities = [...auditItems, ...activatedContractItems, ...incidentItems]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);

    return {
        buildingOverview,
        featuredRooms,
        recentActivities,
    };
};

/**
 * UC-07: tổng quan toàn hệ thống hoặc theo một tòa.
 */
export const getAdminDashboard = async ({ query = {} }) => {
    const { buildingId } = query;
    if (buildingId) {
        const exists = await Building.exists({ _id: buildingId, isDeleted: false });
        if (!exists) throw new AppError('Tòa nhà không tồn tại', 404);
    }

    const now = new Date();
    const { start, end } = currentMonthRange(now);
    const scope = await loadScope(buildingId);

    const [monthlyRevenue, openIncidents, users, residents, movedIn, movedOut, extras] = await Promise.all([
        sumRevenue(scope.contractIds, start, end),
        countOpenIncidents(scope.roomIds),
        countUsers(scope, buildingId),
        Occupant.countDocuments({
            contractId: { $in: scope.activeContractIds },
            status: OCCUPANT_STATUS.STAYED,
        }),
        Occupant.countDocuments({
            contractId: { $in: scope.contractIds },
            joinDate: { $gte: start, $lte: end },
        }),
        Occupant.countDocuments({
            contractId: { $in: scope.contractIds },
            status: OCCUPANT_STATUS.LEFT,
            exitDate: { $gte: start, $lte: end },
        }),
        loadDashboardExtras(scope, Boolean(buildingId)),
    ]);

    return {
        buildings: scope.buildings.length,
        rooms: roomStats(scope.rooms),
        monthlyRevenue,
        activeContracts: scope.activeContractIds.length,
        openIncidents,
        users,
        residents,
        movedIn,
        movedOut,
        ...extras,
    };
};

/**
 * UC-47: tổng quan tòa Manager phụ trách.
 */
export const getManagerDashboard = async ({ managerId }) => {
    const building = await Building.findOne({ managerId, isDeleted: false }).select('_id').lean();
    if (!building) {
        throw new AppError('Bạn chưa được cấp quyền quản lý tòa nhà', 403);
    }

    const now = new Date();
    const { start, end } = currentMonthRange(now);
    const scope = await loadScope(building._id);

    const pendingInvoices = await Invoice.find({
        contractId: { $in: scope.contractIds },
        status: INVOICE_STATUS.PENDING,
    })
        .select('totalAmount dueDate')
        .lean();

    const in30Days = endOfVietnamDay(new Date(now.getTime() + 30 * DAY_MS));
    const expiringContracts = scope.contracts.filter(
        (contract) =>
            contract.status === CONTRACT_STATUS.ACTIVE &&
            new Date(contract.endDate) >= startOfVietnamDay(now) &&
            new Date(contract.endDate) <= in30Days,
    ).length;

    const [monthlyRevenue, openIncidents, extras] = await Promise.all([
        sumRevenue(scope.contractIds, start, end),
        countOpenIncidents(scope.roomIds),
        loadDashboardExtras(scope, true),
    ]);

    return {
        rooms: roomStats(scope.rooms),
        pendingInvoices: {
            count: pendingInvoices.length,
            totalAmount: pendingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
            overdueCount: pendingInvoices.filter(
                (invoice) => invoice.dueDate && new Date(invoice.dueDate) < now,
            ).length,
        },
        openIncidents,
        expiringContracts,
        monthlyRevenue,
        ...extras,
    };
};

/**
 * Hợp đồng kết thúc trong kỳ: ngày kết thúc thực tế là ngày hiệu lực của đơn chấm dứt đã xác nhận, không có đơn thì là endDate.
 */
const countEndedContracts = async (contracts, start, end) => {
    const ended = contracts.filter((contract) => contract.status === CONTRACT_STATUS.ENDED);
    const terminations = await TerminationRequest.find({
        contractId: { $in: ended.map((contract) => contract._id) },
        status: TERMINATION_STATUS.CONFIRMED,
    })
        .select('contractId effectiveDate')
        .lean();
    const effectiveByContract = new Map(
        terminations.map((termination) => [String(termination.contractId), termination.effectiveDate]),
    );

    return ended.filter((contract) => {
        const endedAt = new Date(effectiveByContract.get(String(contract._id)) ?? contract.endDate);
        return endedAt >= start && endedAt <= end;
    }).length;
};

/**
 * Phòng chậm thanh toán: hóa đơn Chờ thanh toán đã qua hạn, quá hạn lâu nhất trước.
 * Tính theo hiện tại, không phụ thuộc kỳ báo cáo.
 */
const loadLatePayments = async (scope, now) => {
    const invoices = await Invoice.find({
        contractId: { $in: scope.contractIds },
        status: INVOICE_STATUS.PENDING,
        dueDate: { $lt: now },
    })
        .select('_id invoiceCode contractId month totalAmount dueDate')
        .lean();

    const roomByContract = new Map(scope.contracts.map((contract) => [String(contract._id), contract.roomId]));
    const roomNumberById = new Map(scope.rooms.map((room) => [String(room._id), room.roomNumber]));

    return invoices
        .map((invoice) => ({
            _id: invoice._id,
            invoiceCode: invoice.invoiceCode,
            month: invoice.month,
            roomNumber: roomNumberById.get(String(roomByContract.get(String(invoice.contractId)))) ?? '',
            amount: invoice.totalAmount,
            dueDate: invoice.dueDate,
            overdueDays: Math.ceil((now.getTime() - new Date(invoice.dueDate).getTime()) / DAY_MS),
        }))
        .sort((a, b) => b.overdueDays - a.overdueDays);
};

/**
 * UC-48: báo cáo theo kỳ. Admin xem toàn hệ thống hoặc lọc theo tòa, Manager chỉ xem tòa mình.
 */
export const getReport = async ({ userId, roleId, query = {} }) => {
    let { buildingId } = query;

    if (roleId === ROLE.MANAGER) {
        const building = await Building.findOne({ managerId: userId, isDeleted: false }).select('_id').lean();
        if (!building) {
            throw new AppError('Bạn chưa được cấp quyền quản lý tòa nhà', 403);
        }
        buildingId = building._id;
    } else if (buildingId) {
        const exists = await Building.exists({ _id: buildingId, isDeleted: false });
        if (!exists) throw new AppError('Tòa nhà không tồn tại', 404);
    }

    const now = new Date();
    const defaultRange = currentMonthRange(now);
    const start = query.from ? startOfVietnamDay(query.from) : defaultRange.start;
    const end = query.to ? endOfVietnamDay(query.to) : defaultRange.end;
    const scope = await loadScope(buildingId);

    const paidInvoices = await Invoice.find({
        contractId: { $in: scope.contractIds },
        status: INVOICE_STATUS.PAID,
        paidAt: { $gte: start, $lte: end },
    })
        .select('totalAmount paidAt')
        .lean();

    const revenueMap = new Map();
    paidInvoices.forEach((invoice) => {
        const key = vietnamMonthKey(invoice.paidAt);
        revenueMap.set(key, (revenueMap.get(key) ?? 0) + invoice.totalAmount);
    });

    // Đủ mọi tháng trong kỳ, tháng không có doanh thu là 0, để biểu đồ không bị hụt cột
    const revenueByMonth = [];
    const lastKey = vietnamMonthKey(end);
    const cursor = new Date(start.getTime() + VIETNAM_OFFSET_MS);
    cursor.setUTCDate(1);
    let key = vietnamMonthKey(start);
    while (key <= lastKey) {
        revenueByMonth.push({ month: key, revenue: revenueMap.get(key) ?? 0 });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    const rooms = roomStats(scope.rooms);
    const newContracts = scope.contracts.filter(
        (contract) =>
            contract.activatedAt && new Date(contract.activatedAt) >= start && new Date(contract.activatedAt) <= end,
    ).length;

    return {
        from: start,
        to: end,
        totalRevenue: paidInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
        revenueByMonth,
        rooms: {
            ...rooms,
            occupancyRate: rooms.total > 0 ? Math.round((rooms.occupied / rooms.total) * 100) : 0,
        },
        contracts: {
            new: newContracts,
            ended: await countEndedContracts(scope.contracts, start, end),
        },
        latePayments: await loadLatePayments(scope, now),
    };
};
