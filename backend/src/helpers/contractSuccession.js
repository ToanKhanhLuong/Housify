// Đặt thuê nối tiếp: ngày rời đi, kiểm phòng nhận hợp đồng mới, chuyển UPCOMING -> ACTIVE / CANCELLED (UC-06, UC-24, UC-26, UC-27, UC-28, UC-29, UC-45)
import {
    CONTRACT_STATUS,
    NOTIFICATION_TYPE,
    OCCUPANT_STATUS,
    ROOM_STATUS,
    TERMINATION_STATUS,
} from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { notify } from './notify.js';
import { startOfVietnamDay } from './date.js';
import Contract from '../models/Contract.js';
import Occupant from '../models/Occupant.js';
import Room from '../models/Room.js';
import TerminationRequest from '../models/TerminationRequest.js';

const withOptionalSession = (query, session) => (session ? query.session(session) : query);

export const formatDateVn = (date) => {
    const vietnamTime = new Date(startOfVietnamDay(date).getTime() + 7 * 60 * 60 * 1000);
    const day = String(vietnamTime.getUTCDate()).padStart(2, '0');
    const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${vietnamTime.getUTCFullYear()}`;
};

// Cộng / lùi số tháng, giữ ngày không vượt quá cuối tháng (31/03 lùi 1 tháng -> 28 hoặc 29/02)
const shiftMonths = (date, months) => {
    const result = new Date(date);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
    return result;
};
const subtractMonths = (date, months) => shiftMonths(date, -months);
const nextDay = (date) => new Date(startOfVietnamDay(date).getTime() + 24 * 60 * 60 * 1000);

/**
 * Ngày rời đi của hợp đồng ACTIVE: ngày hiệu lực đơn chấm dứt CONFIRMED nếu có, không thì endDate
 */
export const getLeaveDate = async (contract, session = null) => {
    const confirmedTermination = await withOptionalSession(
        TerminationRequest.findOne({
            contractId: contract._id,
            status: TERMINATION_STATUS.CONFIRMED,
        }).select('effectiveDate'),
        session,
    ).lean();
    return confirmedTermination ? new Date(confirmedTermination.effectiveDate) : new Date(contract.endDate);
};

/**
 * Phòng có nhận thêm hợp đồng bắt đầu từ startDate không (UC-24, UC-26):
 * tối đa 1 ACTIVE + 1 hợp đồng chờ (DRAFT / UPCOMING); phòng đang thuê chỉ nhận khi còn ≤ 1 tháng tới ngày rời đi
 */
export const assertRoomAcceptsNewContract = async ({ room, startDate, excludeContractId = null, now = new Date() }) => {
    if (room.status === ROOM_STATUS.MAINTENANCE) {
        throw new AppError('Phòng đang bảo trì, chưa nhận hợp đồng mới', 400);
    }

    const excludeFilter = excludeContractId ? { _id: { $ne: excludeContractId } } : {};
    const [activeContract, waitingContract] = await Promise.all([
        Contract.findOne({ roomId: room._id, status: CONTRACT_STATUS.ACTIVE, ...excludeFilter }).lean(),
        Contract.findOne({
            roomId: room._id,
            status: { $in: [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.UPCOMING] },
            ...excludeFilter,
        }).lean(),
    ]);

    if (waitingContract) {
        throw new AppError(
            activeContract
                ? `Phòng đã có hợp đồng nối tiếp từ ngày ${formatDateVn(waitingContract.startDate)}`
                : 'Phòng đã có hợp đồng nháp hoặc hợp đồng sắp hiệu lực',
            400,
        );
    }

    if (!activeContract) return;

    const leaveDate = await getLeaveDate(activeContract);
    if (startOfVietnamDay(now) < startOfVietnamDay(subtractMonths(leaveDate, 1))) {
        throw new AppError(
            `Phòng chưa nhận hợp đồng mới. Chỉ được đặt thuê nối tiếp khi hợp đồng hiện tại còn không quá 1 tháng (trả phòng ngày ${formatDateVn(leaveDate)})`,
            400,
        );
    }

    if (startOfVietnamDay(startDate) <= startOfVietnamDay(leaveDate)) {
        throw new AppError(
            `Ngày bắt đầu phải sau ngày ${formatDateVn(leaveDate)} (ngày trả phòng của hợp đồng hiện tại)`,
            400,
            [{ field: 'startDate', message: `Ngày bắt đầu phải sau ngày ${formatDateVn(leaveDate)}` }],
        );
    }
};

/**
 * Khung ngày bắt đầu hợp lệ (UC-24, UC-26), chống giữ chỗ lâu:
 * - Khách đang ở phòng khác chỉ ký hợp đồng mới trong tháng cuối của hợp đồng hiện tại
 * - Ngày bắt đầu không quá 1 tháng sau mốc vào ở = muộn nhất (hôm nay, ngày sau trả phòng của người trước, ngày sau trả phòng cũ của khách)
 */
export const assertStartDateWithinSigningWindow = async ({
    room,
    representativeCccd,
    startDate,
    excludeContractId = null,
    now = new Date(),
}) => {
    let moveInFrom = startOfVietnamDay(now);

    const roomActive = await Contract.findOne({
        roomId: room._id,
        status: CONTRACT_STATUS.ACTIVE,
        ...(excludeContractId ? { _id: { $ne: excludeContractId } } : {}),
    }).lean();
    if (roomActive) {
        const roomFree = nextDay(await getLeaveDate(roomActive));
        if (roomFree > moveInFrom) moveInFrom = roomFree;
    }

    // hợp đồng ACTIVE khách đang ở (đại diện hoặc ở cùng) ở phòng khác
    const stays = await Occupant.find({
        cccd: representativeCccd,
        status: OCCUPANT_STATUS.STAYED,
        ...(excludeContractId ? { contractId: { $ne: excludeContractId } } : {}),
    }).select('contractId').lean();
    const ownActive = stays.length > 0
        ? await Contract.findOne({
            _id: { $in: stays.map((item) => item.contractId) },
            roomId: { $ne: room._id },
            status: CONTRACT_STATUS.ACTIVE,
        }).lean()
        : null;
    if (ownActive) {
        const ownLeave = await getLeaveDate(ownActive);
        const canSignFrom = startOfVietnamDay(subtractMonths(ownLeave, 1));
        if (startOfVietnamDay(now) < canSignFrom) {
            const message = `Khách đang thuê phòng khác đến ngày ${formatDateVn(ownLeave)}, chỉ ký được hợp đồng mới từ ngày ${formatDateVn(canSignFrom)} (tháng cuối của hợp đồng hiện tại)`;
            throw new AppError(message, 400, [{ field: 'representativeCccd', message }]);
        }
        const ownFree = nextDay(ownLeave);
        if (ownFree > moveInFrom) moveInFrom = ownFree;
    }

    const latestStart = shiftMonths(moveInFrom, 1);
    if (startOfVietnamDay(startDate) > startOfVietnamDay(latestStart)) {
        const message = `Ngày bắt đầu không được quá 1 tháng sau ngày ${formatDateVn(moveInFrom)} (chọn từ ${formatDateVn(moveInFrom)} đến ${formatDateVn(latestStart)})`;
        throw new AppError(message, 400, [{ field: 'startDate', message }]);
    }
};

/**
 * Hợp đồng đã được giữ phòng chưa: phòng không còn ACTIVE khác và không cư dân nào của hợp đồng còn ở ACTIVE khác
 */
export const isContractReadyToActivate = async (contract, session = null) => {
    const roomTaken = await withOptionalSession(
        Contract.exists({ _id: { $ne: contract._id }, roomId: contract.roomId, status: CONTRACT_STATUS.ACTIVE }),
        session,
    );
    if (roomTaken) return false;

    const ownOccupants = await withOptionalSession(
        Occupant.find({ contractId: contract._id, status: OCCUPANT_STATUS.STAYED }).select('cccd'),
        session,
    ).lean();
    const cccds = [...new Set([contract.representativeCccd, ...ownOccupants.map((item) => item.cccd)].filter(Boolean))];

    const otherStays = await withOptionalSession(
        Occupant.find({ cccd: { $in: cccds }, status: OCCUPANT_STATUS.STAYED, contractId: { $ne: contract._id } }).select('contractId'),
        session,
    ).lean();
    if (otherStays.length === 0) return true;

    const stillActive = await withOptionalSession(
        Contract.exists({ _id: { $in: otherStays.map((item) => item.contractId) }, status: CONTRACT_STATUS.ACTIVE }),
        session,
    );
    return !stillActive;
};

const notifyRepresentative = async (contractId, { type, title, message }, session) => {
    const rep = await Occupant.findOne({ contractId, isRepresentative: true }).select('userId').session(session).lean();
    if (!rep?.userId) return;
    await notify({ userIds: rep.userId, type, title, message, refId: contractId }, session);
};

/**
 * Chuyển các hợp đồng UPCOMING đủ điều kiện sang ACTIVE (gọi trong transaction kết thúc hợp đồng).
 * Ứng viên: UPCOMING của các phòng vừa trả, và UPCOMING có cư dân trùng CCCD với cư dân vừa rời đi
 */
export const promoteReadyUpcomingContracts = async ({ roomIds = [], cccds = [] }, session) => {
    const contractIdsByCccd = cccds.length > 0
        ? (await Occupant.find({ cccd: { $in: cccds }, status: OCCUPANT_STATUS.STAYED })
            .select('contractId').session(session).lean()).map((item) => item.contractId)
        : [];

    const candidates = await Contract.find({
        status: CONTRACT_STATUS.UPCOMING,
        $or: [
            { roomId: { $in: roomIds } },
            { _id: { $in: contractIdsByCccd } },
            { representativeCccd: { $in: cccds } },
        ],
    }).session(session);

    const promoted = [];
    for (const contract of candidates) {
        if (!(await isContractReadyToActivate(contract, session))) continue;

        const room = await Room.findOneAndUpdate(
            { _id: contract.roomId, status: ROOM_STATUS.AVAILABLE },
            { status: ROOM_STATUS.OCCUPIED },
            { session, new: true },
        );
        if (!room) continue;

        contract.status = CONTRACT_STATUS.ACTIVE;
        await contract.save({ session });

        await notifyRepresentative(contract._id, {
            type: NOTIFICATION_TYPE.CONTRACT_RENEWED,
            title: 'Hợp đồng đã có hiệu lực',
            message: `Hợp đồng thuê phòng ${room.roomNumber} đã chuyển sang Đang hiệu lực. Ngày bắt đầu ở: ${formatDateVn(contract.startDate)}.`,
        }, session);
        promoted.push(contract);
    }
    return promoted;
};

/**
 * Quét dự phòng mọi hợp đồng UPCOMING (chạy cuối job hết hạn hằng ngày):
 * bắt trường hợp người ở cùng rời phòng cũ qua UC-33 mà không có hợp đồng nào kết thúc
 */
export const promoteAllReadyUpcomingContracts = async (runInTransaction) => {
    const upcomingContracts = await Contract.find({ status: CONTRACT_STATUS.UPCOMING }).select('_id roomId').lean();
    let promotedCount = 0;
    for (const contract of upcomingContracts) {
        const promoted = await runInTransaction((session) => promoteReadyUpcomingContracts({ roomIds: [contract.roomId] }, session));
        promotedCount += promoted.length;
    }
    return promotedCount;
};

/**
 * Lấy phòng và CCCD cư dân của hợp đồng sắp kết thúc, để truyền cho promoteReadyUpcomingContracts
 */
export const collectSuccessionKeys = async (contract, session) => {
    const occupants = await Occupant.find({ contractId: contract._id }).select('cccd').session(session).lean();
    return {
        roomIds: [contract.roomId],
        cccds: [...new Set([contract.representativeCccd, ...occupants.map((item) => item.cccd)].filter(Boolean))],
    };
};

/**
 * Hủy một hợp đồng UPCOMING: CANCELLED, cư dân lưu sẵn -> LEFT. Phòng và hợp đồng người trước không đổi
 */
export const cancelUpcomingContract = async (contract, session) => {
    contract.status = CONTRACT_STATUS.CANCELLED;
    await contract.save({ session });
    await Occupant.updateMany(
        { contractId: contract._id, status: OCCUPANT_STATUS.STAYED },
        { status: OCCUPANT_STATUS.LEFT, exitDate: new Date() },
        { session },
    );
};

/**
 * Khách bị chấm dứt đơn phương: hủy mọi hợp đồng UPCOMING khách đứng tên đại diện (được hoàn cọc tiền mặt)
 */
export const cancelUpcomingOfRepresentative = async (representativeCccd, session) => {
    const upcomingContracts = await Contract.find({
        status: CONTRACT_STATUS.UPCOMING,
        representativeCccd,
    }).session(session);

    for (const contract of upcomingContracts) {
        await cancelUpcomingContract(contract, session);
        const room = await Room.findById(contract.roomId).select('roomNumber').session(session).lean();
        await notifyRepresentative(contract._id, {
            type: NOTIFICATION_TYPE.CONTRACT_ENDED,
            title: 'Hợp đồng sắp hiệu lực đã bị hủy',
            message: `Hợp đồng thuê phòng ${room?.roomNumber || ''} (sắp hiệu lực) đã bị hủy do hợp đồng hiện tại của bạn bị chấm dứt đơn phương. Vui lòng liên hệ quản lý tòa nhà để nhận lại tiền cọc.`,
        }, session);
    }
    return upcomingContracts;
};
