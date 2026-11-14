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
        title: 'Ngưng hoạt động tài khoản người dùng',
        badgeText: 'Ngưng TK',
        badgeTone: 'gray',
    },
    [AUDIT_ACTION.REACTIVATE_USER]: {
        category: 'Tài khoản',
        title: 'Kích hoạt lại tài khoản người dùng',
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

// Thời điểm → "DD/MM/YY" và "YYYY-MM-DD" theo giờ Việt Nam
const vietnamDayLabel = (date) => {
    const vietnamTime = new Date(new Date(date).getTime() + VIETNAM_OFFSET_MS);
    const day = String(vietnamTime.getUTCDate()).padStart(2, '0');
    const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0');
    const year = String(vietnamTime.getUTCFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
};

const vietnamDateIso = (date) => {
    const vietnamTime = new Date(new Date(date).getTime() + VIETNAM_OFFSET_MS);
    const year = vietnamTime.getUTCFullYear();
    const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vietnamTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        .select('_id roomId status endDate activatedAt representativeEmail createdBy deposit depositRefundedAt createdAt')
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

// Tạo chuỗi thời gian theo số ngày (7 ngày, 28 ngày) hoặc theo số tháng (3, 6, 12 tháng)
const buildDailySeries = (now, daysCount, contracts, occupants, paidInvoices, incidents) => {
    const points = [];
    const totals = { revenue: 0, contracts: 0, residents: 0, incidents: 0 };

    for (let i = daysCount - 1; i >= 0; i -= 1) {
        const dayDate = new Date(now.getTime() - i * DAY_MS);
        const start = startOfVietnamDay(dayDate);
        const end = endOfVietnamDay(dayDate);
        const label = vietnamDayLabel(dayDate);

        let revenue = 0;
        paidInvoices.forEach((inv) => {
            if (inv.paidAt && new Date(inv.paidAt) >= start && new Date(inv.paidAt) <= end) {
                revenue += inv.totalAmount ?? 0;
            }
        });

        let contractsCount = 0;
        contracts.forEach((contract) => {
            const eventDate = contract.activatedAt; // chỉ đếm hợp đồng đã kích hoạt (nháp không tính)
            if (eventDate && new Date(eventDate) >= start && new Date(eventDate) <= end) {
                contractsCount += 1;
            }
        });

        let residentsCount = 0;
        occupants.forEach((occ) => {
            if (occ.joinDate && new Date(occ.joinDate) >= start && new Date(occ.joinDate) <= end) {
                residentsCount += 1;
            }
        });

        let incidentsCount = 0;
        incidents.forEach((inc) => {
            if (inc.createdAt && new Date(inc.createdAt) >= start && new Date(inc.createdAt) <= end) {
                incidentsCount += 1;
            }
        });

        totals.revenue += revenue;
        totals.contracts += contractsCount;
        totals.residents += residentsCount;
        totals.incidents += incidentsCount;

        points.push({
            date: vietnamDateIso(dayDate),
            name: label,
            revenue,
            contracts: contractsCount,
            residents: residentsCount,
            incidents: incidentsCount,
        });
    }

    return { totals, points };
};

const buildMonthlySeries = (now, monthsCount, contracts, occupants, paidInvoices, incidents) => {
    const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
    const currentYear = vietnamNow.getUTCFullYear();
    const currentMonth = vietnamNow.getUTCMonth();

    const points = [];
    const totals = { revenue: 0, contracts: 0, residents: 0, incidents: 0 };

    for (let i = monthsCount - 1; i >= 0; i -= 1) {
        const target = new Date(Date.UTC(currentYear, currentMonth - i, 1));
        const year = target.getUTCFullYear();
        const month = target.getUTCMonth();
        const start = new Date(Date.UTC(year, month, 1) - VIETNAM_OFFSET_MS);
        const end = new Date(Date.UTC(year, month + 1, 1) - VIETNAM_OFFSET_MS - 1);
        const label = `${String(month + 1).padStart(2, '0')}/${year}`;

        let revenue = 0;
        paidInvoices.forEach((inv) => {
            if (inv.paidAt && new Date(inv.paidAt) >= start && new Date(inv.paidAt) <= end) {
                revenue += inv.totalAmount ?? 0;
            }
        });

        let contractsCount = 0;
        contracts.forEach((contract) => {
            const eventDate = contract.activatedAt; // chỉ đếm hợp đồng đã kích hoạt (nháp không tính)
            if (eventDate && new Date(eventDate) >= start && new Date(eventDate) <= end) {
                contractsCount += 1;
            }
        });

        let residentsCount = 0;
        occupants.forEach((occ) => {
            if (occ.joinDate && new Date(occ.joinDate) >= start && new Date(occ.joinDate) <= end) {
                residentsCount += 1;
            }
        });

        let incidentsCount = 0;
        incidents.forEach((inc) => {
            if (inc.createdAt && new Date(inc.createdAt) >= start && new Date(inc.createdAt) <= end) {
                incidentsCount += 1;
            }
        });

        totals.revenue += revenue;
        totals.contracts += contractsCount;
        totals.residents += residentsCount;
        totals.incidents += incidentsCount;

        points.push({
            date: `${year}-${String(month + 1).padStart(2, '0')}`,
            name: label,
            revenue,
            contracts: contractsCount,
            residents: residentsCount,
            incidents: incidentsCount,
        });
    }

    return { totals, points };
};

// Tổng hợp thông tin tòa đang chọn, danh sách phòng kèm ảnh, hoạt động gần đây và chuỗi thời gian linh hoạt
const loadDashboardExtras = async (scope, isFilteredByBuilding) => {
    const now = new Date();
    const buildingById = new Map(scope.buildings.map((building) => [String(building._id), building]));
    const roomById = new Map(scope.rooms.map((room) => [String(room._id), room]));
    const contractById = new Map(scope.contracts.map((contract) => [String(contract._id), contract]));

    // 1. Chỉ trả buildingOverview khi đang xem 1 tòa cụ thể (Admin lọc 1 tòa hoặc Manager)
    const targetBuilding = isFilteredByBuilding ? (scope.buildings[0] ?? null) : null;

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

    // 2. Danh sách phòng kèm ảnh, loại phòng, sức chứa và dữ liệu lịch sử cho biểu đồ
    const roomTypeIds = [...new Set(scope.rooms.map((room) => String(room.roomTypeId)).filter(Boolean))];
    const [roomTypes, allOccupants, paidInvoices, allIncidents] = await Promise.all([
        RoomType.find({ _id: { $in: roomTypeIds } }).select('_id name capacity').lean(),
        Occupant.find({ contractId: { $in: scope.contractIds } })
            .select('_id contractId userId name isRepresentative status joinDate exitDate')
            .lean(),
        Invoice.find({
            contractId: { $in: scope.contractIds },
            status: INVOICE_STATUS.PAID,
        })
            .select('totalAmount paidAt')
            .lean(),
        Incident.find({ roomId: { $in: scope.roomIds } })
            .sort({ createdAt: -1 })
            .select('_id incidentCode roomId reportedBy title status createdAt')
            .lean(),
    ]);

    const activeContractIdSet = new Set(scope.activeContractIds.map(String));
    const roomTypeById = new Map(roomTypes.map((type) => [String(type._id), type]));
    const occupantCountByRoom = new Map();
    const repNameByContract = new Map();
    const roomByOccupantId = new Map();

    allOccupants.forEach((occupant) => {
        const contract = contractById.get(String(occupant.contractId));
        if (!contract) return;
        const roomKey = String(contract.roomId);
        const room = roomById.get(roomKey);
        if (room) {
            roomByOccupantId.set(String(occupant._id), room);
        }
        if (
            occupant.status === OCCUPANT_STATUS.STAYED &&
            activeContractIdSet.has(String(occupant.contractId))
        ) {
            occupantCountByRoom.set(roomKey, (occupantCountByRoom.get(roomKey) ?? 0) + 1);
        }
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

    const featuredRooms = sortedRooms.slice(0, 100).map((room) => {
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

    // 3. Hoạt động gần đây: lấy tối đa 20 bản ghi để cuộn dọc trên trang
    const managerIds = scope.buildings.map((building) => building.managerId).filter(Boolean);
    const buildingIds = scope.buildings.map((building) => building._id);
    const occupantIds = allOccupants.map((occupant) => occupant._id);

    const auditQuery = isFilteredByBuilding
        ? {
            $or: [
                { targetId: { $in: [...scope.contractIds, ...scope.roomIds, ...buildingIds, ...occupantIds] } },
                { actorId: { $in: managerIds } },
            ],
        }
        : {};

    const auditLogs = await AuditLog.find(auditQuery).sort({ createdAt: -1 }).limit(15).lean();
    const recentIncidents = allIncidents.slice(0, 10);

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
            const targetRoom =
                roomById.get(String(log.targetId)) ?? roomByOccupantId.get(String(log.targetId));
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
        .slice(0, 10)
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
        .slice(0, 20);

    // 4. Chuỗi dữ liệu linh hoạt theo kỳ (24 giờ, 7 ngày, 28 ngày, 3 tháng, 6 tháng, 12 tháng và chuỗi ngày/tháng)
    const daily90 = buildDailySeries(now, 90, scope.contracts, allOccupants, paidInvoices, allIncidents);
    const daily10 = daily90.points.slice(-10);

    const performanceByPeriod = {
        '24h': buildDailySeries(now, 2, scope.contracts, allOccupants, paidInvoices, allIncidents),
        '7d': buildDailySeries(now, 7, scope.contracts, allOccupants, paidInvoices, allIncidents),
        '28d': buildDailySeries(now, 28, scope.contracts, allOccupants, paidInvoices, allIncidents),
        '3m': {
            totals: daily90.totals,
            points: daily10,
            monthlyPoints: buildMonthlySeries(now, 3, scope.contracts, allOccupants, paidInvoices, allIncidents).points,
        },
        '6m': buildMonthlySeries(now, 6, scope.contracts, allOccupants, paidInvoices, allIncidents),
        '12m': buildMonthlySeries(now, 12, scope.contracts, allOccupants, paidInvoices, allIncidents),
        dailyPoints: daily90.points,
        monthlyPoints: buildMonthlySeries(now, 12, scope.contracts, allOccupants, paidInvoices, allIncidents).points,
    };

    return {
        buildingOverview,
        featuredRooms,
        recentActivities,
        performanceByPeriod,
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

    const pendingInvoices = await Invoice.find({
        contractId: { $in: scope.contractIds },
        status: INVOICE_STATUS.PENDING,
    })
        .select('totalAmount dueDate')
        .lean();
    const overdueInvoices = pendingInvoices.filter((inv) => inv.dueDate && new Date(inv.dueDate) < now);

    const in30Days = endOfVietnamDay(new Date(now.getTime() + 30 * DAY_MS));
    const expiringContracts = scope.contracts.filter(
        (contract) =>
            contract.status === CONTRACT_STATUS.ACTIVE &&
            new Date(contract.endDate) >= startOfVietnamDay(now) &&
            new Date(contract.endDate) <= in30Days,
    ).length;

    const buildingSummaries = scope.buildings.map((b) => {
        const bRooms = scope.rooms.filter((r) => String(r.buildingId) === String(b._id));
        const bOccupied = bRooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length;
        return {
            _id: b._id,
            name: b.name,
            address: b.address,
            floorCount: b.floorCount,
            images: b.images ?? [],
            totalRooms: bRooms.length,
            occupiedRooms: bOccupied,
            availableRooms: bRooms.filter((r) => r.status === ROOM_STATUS.AVAILABLE).length,
            occupancyRate: bRooms.length > 0 ? Math.round((bOccupied / bRooms.length) * 100) : 0,
        };
    });

    const [monthlyRevenue, openIncidents, users, residents, movedIn, movedOut, totalLeft, extras] = await Promise.all([
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
        Occupant.countDocuments({
            contractId: { $in: scope.contractIds },
            status: OCCUPANT_STATUS.LEFT,
        }),
        loadDashboardExtras(scope, Boolean(buildingId)),
    ]);

    const endedUnrefunded = scope.contracts.filter(
        (c) => c.status === CONTRACT_STATUS.ENDED && !c.depositRefundedAt,
    );
    const confirmedTermIds = endedUnrefunded.length > 0
        ? await TerminationRequest.distinct('contractId', {
            contractId: { $in: endedUnrefunded.map((c) => c._id) },
            status: TERMINATION_STATUS.CONFIRMED,
        })
        : [];
    const confirmedTermSet = new Set(confirmedTermIds.map(String));
    const pendingRefundContracts = endedUnrefunded.filter(
        (c) => !confirmedTermSet.has(String(c._id)),
    ).length;
    const draftContracts = scope.contracts.filter((c) => c.status === CONTRACT_STATUS.DRAFT).length;

    return {
        buildings: scope.buildings.length,
        buildingSummaries,
        rooms: roomStats(scope.rooms),
        monthlyRevenue,
        activeContracts: scope.activeContractIds.length,
        draftContracts,
        expiringContracts,
        pendingRefundContracts,
        pendingInvoices: {
            count: pendingInvoices.length,
            totalAmount: pendingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
            overdueCount: overdueInvoices.length,
            overdueAmount: overdueInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
        },
        openIncidents,
        users,
        residents,
        movedIn,
        movedOut,
        totalLeft,
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
    const overdueInvoices = pendingInvoices.filter((inv) => inv.dueDate && new Date(inv.dueDate) < now);

    const in30Days = endOfVietnamDay(new Date(now.getTime() + 30 * DAY_MS));
    const expiringContracts = scope.contracts.filter(
        (contract) =>
            contract.status === CONTRACT_STATUS.ACTIVE &&
            new Date(contract.endDate) >= startOfVietnamDay(now) &&
            new Date(contract.endDate) <= in30Days,
    ).length;

    const endedUnrefunded = scope.contracts.filter(
        (c) => c.status === CONTRACT_STATUS.ENDED && !c.depositRefundedAt,
    );
    const confirmedTermIds = endedUnrefunded.length > 0
        ? await TerminationRequest.distinct('contractId', {
            contractId: { $in: endedUnrefunded.map((c) => c._id) },
            status: TERMINATION_STATUS.CONFIRMED,
        })
        : [];
    const confirmedTermSet = new Set(confirmedTermIds.map(String));
    const pendingRefundContracts = endedUnrefunded.filter(
        (c) => !confirmedTermSet.has(String(c._id)),
    ).length;
    const draftContracts = scope.contracts.filter((c) => c.status === CONTRACT_STATUS.DRAFT).length;

    const [monthlyRevenue, openIncidents, residents, movedIn, movedOut, totalLeft, extras] = await Promise.all([
        sumRevenue(scope.contractIds, start, end),
        countOpenIncidents(scope.roomIds),
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
        Occupant.countDocuments({
            contractId: { $in: scope.contractIds },
            status: OCCUPANT_STATUS.LEFT,
        }),
        loadDashboardExtras(scope, true),
    ]);

    return {
        rooms: roomStats(scope.rooms),
        activeContracts: scope.activeContractIds.length,
        draftContracts,
        pendingRefundContracts,
        pendingInvoices: {
            count: pendingInvoices.length,
            totalAmount: pendingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
            overdueCount: overdueInvoices.length,
            overdueAmount: overdueInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
        },
        openIncidents,
        expiringContracts,
        monthlyRevenue,
        residents,
        movedIn,
        movedOut,
        totalLeft,
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
    const roomById = new Map(scope.rooms.map((room) => [String(room._id), room]));
    const buildingById = new Map(scope.buildings.map((building) => [String(building._id), building.name]));

    return invoices
        .map((invoice) => {
            const roomId = roomByContract.get(String(invoice.contractId));
            const room = roomId ? roomById.get(String(roomId)) : null;
            const buildingName = room ? (buildingById.get(String(room.buildingId)) ?? '') : '';
            return {
                _id: invoice._id,
                invoiceCode: invoice.invoiceCode,
                month: invoice.month,
                roomNumber: room?.roomNumber ?? '',
                buildingId: room?.buildingId ?? null,
                buildingName,
                amount: invoice.totalAmount,
                dueDate: invoice.dueDate,
                overdueDays: Math.ceil((now.getTime() - new Date(invoice.dueDate).getTime()) / DAY_MS),
            };
        })
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

    const [paidInvoices, periodOccupants, periodIncidents] = await Promise.all([
        Invoice.find({
            contractId: { $in: scope.contractIds },
            status: INVOICE_STATUS.PAID,
            paidAt: { $gte: start, $lte: end },
        })
            .select('totalAmount paidAt contractId')
            .lean(),
        Occupant.find({
            contractId: { $in: scope.contractIds },
            joinDate: { $gte: start, $lte: end },
        })
            .select('joinDate')
            .lean(),
        Incident.find({
            roomId: { $in: scope.roomIds },
            createdAt: { $gte: start, $lte: end },
        })
            .select('createdAt')
            .lean(),
    ]);

    const revenueMap = new Map();
    paidInvoices.forEach((invoice) => {
        const key = vietnamMonthKey(invoice.paidAt);
        revenueMap.set(key, (revenueMap.get(key) ?? 0) + invoice.totalAmount);
    });

    // Đủ mọi tháng trong kỳ, tháng không có doanh thu là 0, để biểu đồ không bị hụt cột
    const revenueByMonth = [];
    const performancePoints = [];
    const lastKey = vietnamMonthKey(end);
    const cursor = new Date(start.getTime() + VIETNAM_OFFSET_MS);
    cursor.setUTCDate(1);
    let key = vietnamMonthKey(start);
    while (key <= lastKey) {
        const mYear = cursor.getUTCFullYear();
        const mMonth = cursor.getUTCMonth();
        const mStart = new Date(Date.UTC(mYear, mMonth, 1) - VIETNAM_OFFSET_MS);
        const mEnd = new Date(Date.UTC(mYear, mMonth + 1, 1) - VIETNAM_OFFSET_MS - 1);
        const label = `${String(mMonth + 1).padStart(2, '0')}/${mYear}`;

        const rev = revenueMap.get(key) ?? 0;
        const contractsCount = scope.contracts.filter((c) => {
            const d = c.activatedAt; // chỉ hợp đồng đã kích hoạt, khớp contracts.new
            return d && new Date(d) >= mStart && new Date(d) <= mEnd;
        }).length;
        const residentsCount = periodOccupants.filter((occ) => {
            return occ.joinDate && new Date(occ.joinDate) >= mStart && new Date(occ.joinDate) <= mEnd;
        }).length;
        const incidentsCount = periodIncidents.filter((inc) => {
            return inc.createdAt && new Date(inc.createdAt) >= mStart && new Date(inc.createdAt) <= mEnd;
        }).length;

        revenueByMonth.push({ month: key, revenue: rev });
        performancePoints.push({
            date: key,
            name: label,
            revenue: rev,
            contracts: contractsCount,
            residents: residentsCount,
            incidents: incidentsCount,
        });

        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    const rooms = roomStats(scope.rooms);
    const newContracts = scope.contracts.filter(
        (contract) =>
            contract.activatedAt && new Date(contract.activatedAt) >= start && new Date(contract.activatedAt) <= end,
    ).length;

    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const performance = {
        totals: {
            revenue: totalRevenue,
            contracts: newContracts,
            residents: periodOccupants.length,
            incidents: periodIncidents.length,
        },
        points: performancePoints,
    };

    const latePayments = await loadLatePayments(scope, now);

    // Bảng chi tiết hiệu quả từng cơ sở (byBuilding) khi Admin xem toàn hệ thống
    let byBuilding = null;
    if (roleId === ROLE.ADMIN && !buildingId) {
        const endedContracts = scope.contracts.filter((c) => c.status === CONTRACT_STATUS.ENDED);
        const terminations = await TerminationRequest.find({
            contractId: { $in: endedContracts.map((c) => c._id) },
            status: TERMINATION_STATUS.CONFIRMED,
        })
            .select('contractId effectiveDate')
            .lean();
        const effectiveByContract = new Map(
            terminations.map((t) => [String(t.contractId), t.effectiveDate]),
        );

        const buildingByRoomId = new Map(scope.rooms.map((r) => [String(r._id), String(r.buildingId)]));
        const buildingByContractId = new Map();
        scope.contracts.forEach((c) => {
            const bId = buildingByRoomId.get(String(c.roomId));
            if (bId) buildingByContractId.set(String(c._id), bId);
        });

        const revenueByBuilding = new Map();
        paidInvoices.forEach((inv) => {
            const bId = buildingByContractId.get(String(inv.contractId));
            if (bId) {
                revenueByBuilding.set(bId, (revenueByBuilding.get(bId) ?? 0) + (inv.totalAmount ?? 0));
            }
        });

        const overdueByBuilding = new Map();
        latePayments.forEach((lp) => {
            if (lp.buildingId) {
                const bId = String(lp.buildingId);
                const cur = overdueByBuilding.get(bId) ?? { count: 0, amount: 0 };
                overdueByBuilding.set(bId, {
                    count: cur.count + 1,
                    amount: cur.amount + (lp.amount ?? 0),
                });
            }
        });

        const roomsByBuilding = new Map();
        scope.rooms.forEach((r) => {
            const bId = String(r.buildingId);
            const list = roomsByBuilding.get(bId) ?? [];
            list.push(r);
            roomsByBuilding.set(bId, list);
        });

        const newContractsByBuilding = new Map();
        const endedContractsByBuilding = new Map();
        scope.contracts.forEach((c) => {
            const bId = buildingByContractId.get(String(c._id));
            if (!bId) return;
            if (c.activatedAt && new Date(c.activatedAt) >= start && new Date(c.activatedAt) <= end) {
                newContractsByBuilding.set(bId, (newContractsByBuilding.get(bId) ?? 0) + 1);
            }
            if (c.status === CONTRACT_STATUS.ENDED) {
                const endedAt = new Date(effectiveByContract.get(String(c._id)) ?? c.endDate);
                if (endedAt >= start && endedAt <= end) {
                    endedContractsByBuilding.set(bId, (endedContractsByBuilding.get(bId) ?? 0) + 1);
                }
            }
        });

        byBuilding = scope.buildings
            .map((b) => {
                const bId = String(b._id);
                const bRooms = roomsByBuilding.get(bId) ?? [];
                const stats = roomStats(bRooms);
                const overdue = overdueByBuilding.get(bId) ?? { count: 0, amount: 0 };
                return {
                    _id: b._id,
                    name: b.name,
                    address: b.address,
                    totalRooms: stats.total,
                    occupiedRooms: stats.occupied,
                    availableRooms: stats.available,
                    occupancyRate: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0,
                    revenue: revenueByBuilding.get(bId) ?? 0,
                    newContracts: newContractsByBuilding.get(bId) ?? 0,
                    endedContracts: endedContractsByBuilding.get(bId) ?? 0,
                    overdueRoomsCount: overdue.count,
                    overdueAmount: overdue.amount,
                };
            })
            .sort((a, b) => b.revenue - a.revenue);
    }

    return {
        from: start,
        to: end,
        totalRevenue,
        revenueByMonth,
        performance,
        rooms: {
            ...rooms,
            occupancyRate: rooms.total > 0 ? Math.round((rooms.occupied / rooms.total) * 100) : 0,
        },
        contracts: {
            new: newContracts,
            ended: await countEndedContracts(scope.contracts, start, end),
        },
        latePayments,
        ...(byBuilding ? { byBuilding } : {}),
    };
};
