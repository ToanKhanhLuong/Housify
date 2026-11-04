// Nghiệp vụ cho module dashboard: tổng quan Admin (UC-07), tổng quan Manager (UC-47), báo cáo (UC-48). Chỉ đọc, không ghi dữ liệu
import {
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
import Building from '../../models/Building.js';
import Contract from '../../models/Contract.js';
import Incident from '../../models/Incident.js';
import Invoice from '../../models/Invoice.js';
import Occupant from '../../models/Occupant.js';
import Room from '../../models/Room.js';
import TerminationRequest from '../../models/TerminationRequest.js';
import User from '../../models/User.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_INCIDENT_STATUSES = [INCIDENT_STATUS.PENDING, INCIDENT_STATUS.IN_PROGRESS];

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
        .select('_id managerId')
        .lean();

    const rooms = await Room.find({
        buildingId: { $in: buildings.map((building) => building._id) },
        isDeleted: false,
    })
        .select('_id roomNumber status')
        .lean();

    const contracts = await Contract.find({ roomId: { $in: rooms.map((room) => room._id) } })
        .select('_id roomId status endDate activatedAt')
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

    const [monthlyRevenue, openIncidents, users, residents, movedIn, movedOut] = await Promise.all([
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

    const [monthlyRevenue, openIncidents] = await Promise.all([
        sumRevenue(scope.contractIds, start, end),
        countOpenIncidents(scope.roomIds),
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
