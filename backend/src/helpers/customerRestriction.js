// Kiểm tra danh sách đen, xung đột hợp đồng nháp, cư trú ACTIVE và sức chứa phòng cần giữ chỗ (UC-05, UC-06, UC-17, UC-20, UC-24, UC-26, UC-31, UC-32)
import {
    CONTRACT_STATUS,
    CONTRACT_TYPE,
    OCCUPANT_STATUS,
    TERMINATION_STATUS,
    TERMINATION_TYPE,
    USER_STATUS,
} from '../constants/enums.js';
import Contract from '../models/Contract.js';
import Occupant from '../models/Occupant.js';
import TerminationRequest from '../models/TerminationRequest.js';
import User from '../models/User.js';

const withOptionalSession = (query, session) => (session ? query.session(session) : query);

/**
 * Tìm tập số CCCD đang nằm trong danh sách đen: tài khoản đại diện đã LOCKED hoặc từng có đơn đơn phương CONFIRMED
 */
export const findBlacklistedCccds = async (cccds = [], session = null) => {
    const uniqueCccds = [...new Set(cccds.map((item) => String(item || '').trim()).filter(Boolean))];
    if (uniqueCccds.length === 0) return new Set();

    const matchedRepOccupants = await withOptionalSession(
        Occupant.find({ cccd: { $in: uniqueCccds }, isRepresentative: true }).select('cccd userId contractId'),
        session,
    ).lean();

    if (matchedRepOccupants.length === 0) return new Set();

    const userIds = [...new Set(matchedRepOccupants.map((item) => item.userId).filter(Boolean).map(String))];
    const extraUserOccupants = userIds.length > 0
        ? await withOptionalSession(
            Occupant.find({ userId: { $in: userIds }, isRepresentative: true }).select('userId contractId'),
            session,
        ).lean()
        : [];

    const allContractIds = [
        ...new Set(
            [...matchedRepOccupants, ...extraUserOccupants]
                .map((item) => item.contractId)
                .filter(Boolean)
                .map(String),
        ),
    ];

    const [lockedUsers, unilateralTerminations] = await Promise.all([
        userIds.length > 0
            ? withOptionalSession(
                User.find({ _id: { $in: userIds }, status: USER_STATUS.LOCKED }).select('_id'),
                session,
            ).lean()
            : [],
        allContractIds.length > 0
            ? withOptionalSession(
                TerminationRequest.find({
                    contractId: { $in: allContractIds },
                    type: TERMINATION_TYPE.UNILATERAL,
                    status: TERMINATION_STATUS.CONFIRMED,
                }).select('contractId'),
                session,
            ).lean()
            : [],
    ]);

    const lockedUserIdSet = new Set(lockedUsers.map((item) => String(item._id)));
    const unilateralContractIdSet = new Set(unilateralTerminations.map((item) => String(item.contractId)));

    // Nếu một hợp đồng của user bị UNILATERAL CONFIRMED thì toàn bộ userId đó nằm trong danh sách đen
    for (const occ of [...matchedRepOccupants, ...extraUserOccupants]) {
        if (occ.userId && occ.contractId && unilateralContractIdSet.has(String(occ.contractId))) {
            lockedUserIdSet.add(String(occ.userId));
        }
    }

    const blacklisted = new Set();
    for (const occ of matchedRepOccupants) {
        const isLockedUser = occ.userId && lockedUserIdSet.has(String(occ.userId));
        const isUnilateralContract = occ.contractId && unilateralContractIdSet.has(String(occ.contractId));
        if (isLockedUser || isUnilateralContract) {
            blacklisted.add(occ.cccd);
        }
    }

    return blacklisted;
};

/**
 * Kiểm tra email có đang được giữ bởi một hợp đồng nháp (DRAFT) khác hay không
 */
export const findDraftEmailConflict = async (email, excludeContractId = null, session = null) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    const filter = {
        status: CONTRACT_STATUS.DRAFT,
        representativeEmail: cleanEmail,
    };
    if (excludeContractId) {
        filter._id = { $ne: excludeContractId };
    }

    return withOptionalSession(
        Contract.findOne(filter).select('_id representativeCccd representativeEmail'),
        session,
    ).lean();
};

/**
 * Kiểm tra CCCD có đang là người đại diện của một hợp đồng nháp (DRAFT) chờ kích hoạt hay không
 */
export const findDraftCccdConflict = async (cccd, excludeContractId = null, session = null) => {
    const cleanCccd = String(cccd || '').trim();
    if (!cleanCccd) return null;

    const filter = {
        status: CONTRACT_STATUS.DRAFT,
        representativeCccd: cleanCccd,
    };
    if (excludeContractId) {
        filter._id = { $ne: excludeContractId };
    }

    return withOptionalSession(
        Contract.findOne(filter).select('_id representativeCccd representativeEmail'),
        session,
    ).lean();
};

/**
 * Tổng hợp quyền tự chỉnh sửa hồ sơ / cư dân / email của Customer dựa trên hợp đồng ACTIVE và đơn chấm dứt
 */
export const getCustomerContractAccessState = async (userId) => {
    const repOccupants = await Occupant.find({ userId, isRepresentative: true })
        .select('contractId status')
        .lean();

    if (repOccupants.length === 0) {
        return {
            hasActiveContract: false,
            hasConfirmedUnilateral: false,
            canChangeEmail: false,
            emailDisabledReason: null,
        };
    }

    const allContractIds = repOccupants.map((item) => item.contractId).filter(Boolean);
    const stayedContractIds = repOccupants
        .filter((item) => item.status === OCCUPANT_STATUS.STAYED)
        .map((item) => item.contractId)
        .filter(Boolean);

    const [activeContracts, hasConfirmedUnilateral] = await Promise.all([
        stayedContractIds.length > 0
            ? Contract.find({ _id: { $in: stayedContractIds }, status: CONTRACT_STATUS.ACTIVE })
                  .select('_id')
                  .lean()
            : [],
        allContractIds.length > 0
            ? TerminationRequest.exists({
                  contractId: { $in: allContractIds },
                  type: TERMINATION_TYPE.UNILATERAL,
                  status: TERMINATION_STATUS.CONFIRMED,
              })
            : false,
    ]);

    const activeContractIds = activeContracts.map((contract) => contract._id);
    const hasActiveContract = activeContractIds.length > 0;
    const confirmedUnilateral = Boolean(hasConfirmedUnilateral);

    let emailLockedTermination = null;
    if (hasActiveContract && !confirmedUnilateral) {
        emailLockedTermination = await TerminationRequest.findOne({
            contractId: { $in: activeContractIds },
            $or: [
                { type: TERMINATION_TYPE.UNILATERAL, status: TERMINATION_STATUS.PENDING },
                { type: TERMINATION_TYPE.MUTUAL, status: TERMINATION_STATUS.CONFIRMED },
            ],
        })
            .select('type status')
            .lean();
    }

    const emailDisabledReason = emailLockedTermination
        ? emailLockedTermination.type === TERMINATION_TYPE.UNILATERAL
            ? 'Hợp đồng đang có đơn chấm dứt đơn phương chờ duyệt — không thể thay đổi email.'
            : 'Hợp đồng đã xác nhận chấm dứt thỏa thuận — không thể thay đổi email.'
        : null;

    return {
        hasActiveContract,
        hasConfirmedUnilateral: confirmedUnilateral,
        canChangeEmail: hasActiveContract && !confirmedUnilateral && !emailLockedTermination,
        emailDisabledReason,
    };
};

/**
 * Kiểm tra số CCCD có đang cư trú (STAYED) trong một hợp đồng ACTIVE hay không (bỏ qua người ở cùng trên hợp đồng DRAFT)
 */
export const hasActiveStayingCccd = async (cccd, excludeContractId = null, session = null) => {
    const cleanCccd = String(cccd || '').trim();
    if (!cleanCccd) return false;

    const filter = {
        cccd: cleanCccd,
        status: OCCUPANT_STATUS.STAYED,
    };
    if (excludeContractId) {
        filter.contractId = { $ne: excludeContractId };
    }

    const stayedOccupants = await withOptionalSession(
        Occupant.find(filter).select('contractId'),
        session,
    ).lean();
    if (stayedOccupants.length === 0) return false;

    // Người ở cùng trên hợp đồng DRAFT cũng mang status STAYED, nên phải đối chiếu thêm Contract.status === ACTIVE để không khóa oan
    const activeContract = await withOptionalSession(
        Contract.exists({
            _id: { $in: stayedOccupants.map((item) => item.contractId) },
            status: CONTRACT_STATUS.ACTIVE,
        }),
        session,
    );

    return Boolean(activeContract);
};

/**
 * Kiểm tra số điện thoại có đang được sử dụng bởi cư dân STAYED thuộc một hợp đồng ACTIVE khác hay không
 */
export const hasActiveStayingPhone = async (
    phone,
    { excludeCccds = [], excludeOccupantId = null, excludeContractId = null } = {},
    session = null,
) => {
    const cleanPhone = String(phone || '').trim();
    if (!cleanPhone) return false;

    const filter = {
        phone: cleanPhone,
        status: OCCUPANT_STATUS.STAYED,
    };

    // Cùng số CCCD (khách cũ thuê lại phòng mới) thì được giữ lại SĐT cũ của chính mình
    const cleanExcludeCccds = [...new Set(excludeCccds.map((item) => String(item || '').trim()).filter(Boolean))];
    if (cleanExcludeCccds.length === 1) {
        filter.cccd = { $ne: cleanExcludeCccds[0] };
    } else if (cleanExcludeCccds.length > 1) {
        filter.cccd = { $nin: cleanExcludeCccds };
    }

    if (excludeOccupantId) {
        filter._id = { $ne: excludeOccupantId };
    }
    if (excludeContractId) {
        filter.contractId = { $ne: excludeContractId };
    }

    const matchedOccupants = await withOptionalSession(
        Occupant.find(filter).select('contractId'),
        session,
    ).lean();
    if (matchedOccupants.length === 0) return false;

    // Chỉ chặn SĐT khi cư dân giữ số đó thuộc hợp đồng đã kích hoạt (ACTIVE), bỏ qua bản nháp (DRAFT)
    const activeContract = await withOptionalSession(
        Contract.exists({
            _id: { $in: matchedOccupants.map((item) => item.contractId) },
            status: CONTRACT_STATUS.ACTIVE,
        }),
        session,
    );

    return Boolean(activeContract);
};

/**
 * Tính sức chứa tối thiểu cần đảm bảo của từng phòng theo hợp đồng đang mở (ACTIVE hoặc DRAFT)
 * - ACTIVE: số cư dân đang STAYED thực tế
 * - DRAFT: SINGLE = 1; GROUP = max(2, 1 + số người ở cùng đã nhập sẵn trên bản nháp)
 */
export const getRequiredCapacityByRoom = async (roomIds = []) => {
    const result = new Map();
    if (!Array.isArray(roomIds) || roomIds.length === 0) return result;

    const openContracts = await Contract.find({
        roomId: { $in: roomIds },
        status: { $in: [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE] },
    })
        .select('_id roomId status contractType')
        .lean();

    if (openContracts.length === 0) return result;

    const occupantStats = await Occupant.aggregate([
        {
            $match: {
                contractId: { $in: openContracts.map((contract) => contract._id) },
                status: OCCUPANT_STATUS.STAYED,
            },
        },
        {
            $group: {
                _id: '$contractId',
                stayedCount: { $sum: 1 },
                coOccupantCount: {
                    $sum: { $cond: [{ $eq: ['$isRepresentative', false] }, 1, 0] },
                },
            },
        },
    ]);

    const statsByContractId = new Map(
        occupantStats.map((row) => [
            String(row._id),
            { stayedCount: row.stayedCount, coOccupantCount: row.coOccupantCount },
        ]),
    );

    for (const contract of openContracts) {
        const stats = statsByContractId.get(String(contract._id)) || {
            stayedCount: 0,
            coOccupantCount: 0,
        };
        const required =
            contract.status === CONTRACT_STATUS.ACTIVE
                ? stats.stayedCount
                : contract.contractType === CONTRACT_TYPE.GROUP
                  ? Math.max(2, 1 + stats.coOccupantCount)
                  : 1;

        const roomKey = String(contract.roomId);
        const current = result.get(roomKey);
        if (!current || required > current.required) {
            result.set(roomKey, {
                required,
                contractStatus: contract.status,
            });
        }
    }

    return result;
};
