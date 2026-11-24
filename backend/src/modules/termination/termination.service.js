// Nghiệp vụ module termination: chấm dứt thỏa thuận (UC-28), đơn phương (UC-29) và các job tự động liên quan
import crypto from 'crypto';
import { sendMail } from '../../config/mail.js';
import {
    ROLE,
    USER_STATUS,
    ROOM_STATUS,
    CONTRACT_STATUS,
    OCCUPANT_STATUS,
    TERMINATION_TYPE,
    TERMINATION_STATUS,
    NOTIFICATION_TYPE,
} from '../../constants/enums.js';
import { AppError } from '../../utils/AppError.js';
import { paginate } from '../../utils/pagination.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { notify } from '../../helpers/notify.js';
import { startOfVietnamDay } from '../../helpers/date.js';
import { getRepresentativeRecipientEmail } from '../../helpers/representativeEmail.js';
import TerminationRequest from '../../models/TerminationRequest.js';
import Contract from '../../models/Contract.js';
import Room from '../../models/Room.js';
import Building from '../../models/Building.js';
import Occupant from '../../models/Occupant.js';
import User from '../../models/User.js';
import Manager from '../../models/Manager.js';
import Notification from '../../models/Notification.js';

const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, (char) => ({
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

// Tra cứu hàng loạt tên hiển thị theo userId để tránh N+1 query khi liệt kê đơn
const resolveUserDisplayNames = async (userIds = []) => {
    const result = new Map();
    const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
    if (uniqueIds.length === 0) return result;

    const [occupants, managers, users] = await Promise.all([
        Occupant.find({ userId: { $in: uniqueIds }, isRepresentative: true })
            .sort({ createdAt: -1 })
            .select('userId name')
            .lean(),
        Manager.find({ userId: { $in: uniqueIds } }).select('userId name').lean(),
        User.find({ _id: { $in: uniqueIds } }).select('_id email roleId').lean(),
    ]);

    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const managerMap = new Map(managers.map((m) => [String(m.userId), m.name]));
    const occupantMap = new Map();
    for (const occ of occupants) {
        const key = String(occ.userId);
        if (occ.name && !occupantMap.has(key)) {
            occupantMap.set(key, occ.name);
        }
    }

    for (const id of uniqueIds) {
        if (occupantMap.has(id)) {
            result.set(id, occupantMap.get(id));
        } else if (managerMap.has(id)) {
            result.set(id, managerMap.get(id));
        } else {
            const user = userMap.get(id);
            if (user?.roleId === ROLE.ADMIN) result.set(id, 'Admin');
            else result.set(id, user?.email || 'Không xác định');
        }
    }

    return result;
};

const resolveUserDisplayName = async (userId) => {
    if (!userId) return 'Hệ thống';
    const names = await resolveUserDisplayNames([userId]);
    return names.get(String(userId)) || 'Không xác định';
};

/**
 * Tính mã xác thực điện tử = sha256(nội dung đơn + người xác nhận + thời điểm xác nhận)
 */
export const computeTerminationHash = ({
    contractId,
    type,
    reason,
    effectiveDate,
    note,
    handledBy,
    handledAt,
}) => {
    const payload = [
        String(contractId),
        String(type),
        String(reason || '').trim(),
        new Date(effectiveDate).toISOString(),
        String(note || '').trim(),
        String(handledBy),
        new Date(handledAt).toISOString(),
    ].join('|');

    return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Kiểm tra quyền Manager trên hợp đồng (phòng thuộc tòa Manager đang quản lý)
 */
const verifyManagerContractScope = async (managerId, contract) => {
    const room = await Room.findById(contract.roomId).lean();
    if (!room) {
        throw new AppError('Không tìm thấy phòng của hợp đồng', 404);
    }

    const building = await Building.findOne({ _id: room.buildingId, isDeleted: false }).lean();
    if (!building || String(building.managerId) !== String(managerId)) {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    return { room, building };
};

/**
 * Thực hiện kết thúc hợp đồng trong cùng một session giao dịch:
 * hợp đồng -> ENDED, phòng -> AVAILABLE, toàn bộ cư dân STAYED -> LEFT
 * Nếu duyệt/xác nhận muộn sau ngày hiệu lực thì ghi exitDate theo thời điểm thực tế kết thúc (không lùi ngày)
 */
const endContractByTerminationInSession = async ({
    contractId,
    effectiveDate,
    endedAt = new Date(),
    session,
}) => {
    const contract = await Contract.findById(contractId).session(session);
    if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
        return false;
    }

    contract.status = CONTRACT_STATUS.ENDED;
    await contract.save({ session });

    await Room.findByIdAndUpdate(
        contract.roomId,
        { status: ROOM_STATUS.AVAILABLE },
        { session },
    );

    const effective = new Date(effectiveDate);
    const actualEnd = new Date(endedAt);
    const exitDate = startOfVietnamDay(effective) < startOfVietnamDay(actualEnd)
        ? actualEnd
        : effective;

    await Occupant.updateMany(
        { contractId: contract._id, status: OCCUPANT_STATUS.STAYED },
        {
            status: OCCUPANT_STATUS.LEFT,
            exitDate,
        },
        { session },
    );

    return true;
};

// ===== Email Helpers =====

const sendMutualRequestEmail = (to, roomNumber, buildingName, effectiveDate, reason, note) => sendMail(
    to,
    `[Housify] Yêu cầu xác nhận chấm dứt hợp đồng phòng ${roomNumber} - ${buildingName}`,
    `<p>Xin chào,</p>
<p>Quản lý tòa nhà <b>${escapeHtml(buildingName)}</b> vừa gửi đơn chấm dứt hợp đồng hai bên thỏa thuận cho phòng <b>${escapeHtml(roomNumber)}</b>.</p>
<ul>
  <li>Lý do chấm dứt: <b>${escapeHtml(reason)}</b></li>
  <li>Ngày chấm dứt hiệu lực: <b>${formatDateVn(effectiveDate)}</b></li>
  ${note ? `<li>Ghi chú bàn giao: ${escapeHtml(note)}</li>` : ''}
</ul>
<p>Vui lòng đăng nhập vào hệ thống Housify để xem chi tiết và xác nhận đơn chấm dứt trong vòng <b>07 ngày</b>.</p>`,
);

const sendMutualConfirmedEmail = (to, roomNumber, buildingName, effectiveDate, autoConfirmed = false) => sendMail(
    to,
    `[Housify] Đã xác nhận chấm dứt hợp đồng phòng ${roomNumber} - ${buildingName}`,
    `<p>Xin chào,</p>
<p>Đơn chấm dứt hợp đồng phòng <b>${escapeHtml(roomNumber)}</b> tại <b>${escapeHtml(buildingName)}</b> ${
    autoConfirmed
        ? 'đã được hệ thống tự động xác nhận sau 7 ngày kể từ ngày gửi'
        : 'đã được bạn xác nhận điện tử thành công'
}.</p>
<p>Hợp đồng sẽ kết thúc hiệu lực vào ngày <b>${formatDateVn(effectiveDate)}</b>.</p>`,
);

const sendUnilateralApprovedEmail = (to, roomNumber, buildingName, effectiveDate, reason) => sendMail(
    to,
    `[Housify] Thông báo chấm dứt hợp đồng đơn phương phòng ${roomNumber} - ${buildingName}`,
    `<p>Xin chào,</p>
<p>Hợp đồng thuê phòng <b>${escapeHtml(roomNumber)}</b> tại <b>${escapeHtml(buildingName)}</b> đã bị chấm dứt đơn phương.</p>
<ul>
  <li>Lý do vi phạm: <b>${escapeHtml(reason)}</b></li>
  <li>Ngày hiệu lực chấm dứt: <b>${formatDateVn(effectiveDate)}</b></li>
</ul>
<p>Vui lòng liên hệ Quản lý tòa nhà để thực hiện bàn giao phòng trước hoặc vào ngày hiệu lực.</p>`,
);

const sendReminderEmail = (to, roomNumber, buildingName, effectiveDate, milestoneDay) => sendMail(
    to,
    `[Housify] Nhắc xác nhận đơn chấm dứt hợp đồng phòng ${roomNumber} (Ngày ${milestoneDay})`,
    `<p>Xin chào,</p>
<p>Đơn chấm dứt hợp đồng hai bên thỏa thuận của phòng <b>${escapeHtml(roomNumber)}</b> tại <b>${escapeHtml(buildingName)}</b> (ngày hiệu lực: <b>${formatDateVn(effectiveDate)}</b>) hiện vẫn đang chờ bạn xác nhận.</p>
<p>Sau 7 ngày kể từ ngày gửi, nếu bạn không xác nhận, hệ thống sẽ tự động xác nhận đơn chấm dứt này theo quy định.</p>`,
);

/**
 * Xây dựng thông tin xác nhận điện tử hàng loạt cho danh sách đơn chấm dứt (gộp query theo trang)
 */
const buildElectronicConfirmationInfos = async (terminations = []) => {
    const mutualConfirmed = terminations.filter(
        (t) => t.type === TERMINATION_TYPE.MUTUAL && t.status === TERMINATION_STATUS.CONFIRMED,
    );
    if (mutualConfirmed.length === 0) {
        return terminations.map(() => ({
            signatureValid: null,
            shortSignature: null,
            electronicConfirmation: null,
        }));
    }

    const mutualConfirmedIds = mutualConfirmed.map((t) => t._id);
    const signerIds = mutualConfirmed
        .filter((t) => !t.autoConfirmed && t.handledBy)
        .map((t) => t.handledBy);

    const [reminderRows, signerNameMap] = await Promise.all([
        Notification.aggregate([
            {
                $match: {
                    type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
                    refId: { $in: mutualConfirmedIds },
                    createdBy: { $in: [null] },
                },
            },
            { $group: { _id: '$refId', count: { $sum: 1 } } },
        ]),
        resolveUserDisplayNames(signerIds),
    ]);

    const reminderCountMap = new Map(reminderRows.map((row) => [String(row._id), row.count]));

    return terminations.map((termination) => {
        if (termination.type !== TERMINATION_TYPE.MUTUAL || termination.status !== TERMINATION_STATUS.CONFIRMED) {
            return {
                signatureValid: null,
                shortSignature: null,
                electronicConfirmation: null,
            };
        }

        const reminderCount = reminderCountMap.get(String(termination._id)) ?? 0;

        if (termination.autoConfirmed) {
            return {
                signatureValid: null,
                shortSignature: null,
                reminderCount,
                electronicConfirmation: {
                    statusText: `Tự động xác nhận sau 7 ngày — đã nhắc ${reminderCount} lần`,
                    autoConfirmed: true,
                    reminderCount,
                    confirmedAt: termination.handledAt || null,
                },
            };
        }

        const recomputedHash = computeTerminationHash({
            contractId: termination.contractId,
            type: termination.type,
            reason: termination.reason,
            effectiveDate: termination.effectiveDate,
            note: termination.note,
            handledBy: termination.handledBy,
            handledAt: termination.handledAt,
        });

        const isValid = Boolean(termination.signatureHash && recomputedHash === termination.signatureHash);
        const shortSignature = termination.signatureHash
            ? termination.signatureHash.slice(0, 12).toUpperCase()
            : null;
        const signedByName = termination.handledBy
            ? signerNameMap.get(String(termination.handledBy)) || 'Không xác định'
            : 'Hệ thống';

        return {
            signatureValid: isValid,
            shortSignature,
            signedBy: signedByName,
            signedAt: termination.handledAt,
            reminderCount,
            electronicConfirmation: {
                statusText: 'Đã xác nhận điện tử',
                validityText: isValid ? 'Hợp lệ' : 'Không hợp lệ',
                signedBy: signedByName,
                signedAt: termination.handledAt,
                handledIp: termination.handledIp || null,
                shortSignature,
            },
        };
    });
};

const buildElectronicConfirmationInfo = async (termination) => {
    const [info] = await buildElectronicConfirmationInfos([termination]);
    return info;
};

/**
 * Tạo đơn chấm dứt hợp đồng (UC-28: MUTUAL, UC-29: UNILATERAL) – Role: Manager
 */
export const createTermination = async ({ managerId, contractId, data }) => {
    const contract = await Contract.findById(contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    const { room, building } = await verifyManagerContractScope(managerId, contract);

    if (contract.status !== CONTRACT_STATUS.ACTIVE) {
        throw new AppError('Chỉ có thể tạo đơn chấm dứt cho hợp đồng đang hiệu lực', 400);
    }

    // Chặn khi hợp đồng đã có đơn PENDING, hoặc đã có đơn CONFIRMED chưa tới ngày hiệu lực
    const existingProcessing = await TerminationRequest.findOne({
        contractId: contract._id,
        status: { $in: [TERMINATION_STATUS.PENDING, TERMINATION_STATUS.CONFIRMED] },
    }).lean();

    if (existingProcessing) {
        throw new AppError('Hợp đồng đã có đơn chấm dứt đang xử lý', 400);
    }

    const type = data.type || TERMINATION_TYPE.MUTUAL;
    const cleanReason = data.reason.trim();
    const effectiveDate = new Date(data.effectiveDate);
    const cleanNote = data.note?.trim() || undefined;

    // Kiểm tra ngày hiệu lực không được ở quá khứ và phải nằm trong thời hạn hợp đồng
    const effectiveDay = startOfVietnamDay(effectiveDate);
    const todayStart = startOfVietnamDay(new Date());
    const contractStartDay = startOfVietnamDay(contract.startDate);
    const contractEndDay = startOfVietnamDay(contract.endDate);

    if (effectiveDay < todayStart) {
        throw new AppError('Ngày hiệu lực không được ở quá khứ', 422, [
            { field: 'effectiveDate', message: 'Ngày hiệu lực không được ở quá khứ' },
        ]);
    }
    if (effectiveDay < contractStartDay) {
        throw new AppError('Ngày hiệu lực không được trước ngày bắt đầu hợp đồng', 422, [
            { field: 'effectiveDate', message: 'Ngày hiệu lực không được trước ngày bắt đầu hợp đồng' },
        ]);
    }
    if (effectiveDay > contractEndDay) {
        throw new AppError('Ngày hiệu lực không được vượt quá ngày kết thúc hợp đồng', 422, [
            { field: 'effectiveDate', message: 'Ngày hiệu lực không được vượt quá ngày kết thúc hợp đồng' },
        ]);
    }

    const repOccupant = await Occupant.findOne({
        contractId: contract._id,
        isRepresentative: true,
    }).lean();

    let createdTermination;

    try {
        await withTransaction(async (session) => {
            // Kiểm tra lại trong transaction để chống tạo đúp khi 2 request gửi đồng thời
            const dupInSession = await TerminationRequest.exists({
                contractId: contract._id,
                status: { $in: [TERMINATION_STATUS.PENDING, TERMINATION_STATUS.CONFIRMED] },
            }).session(session);
            if (dupInSession) {
                throw new AppError('Hợp đồng đã có đơn chấm dứt đang xử lý', 400);
            }

            const [doc] = await TerminationRequest.create(
                [
                    {
                        contractId: contract._id,
                        type,
                        reason: cleanReason,
                        effectiveDate,
                        note: cleanNote,
                        status: TERMINATION_STATUS.PENDING,
                        autoConfirmed: false,
                        requestedBy: managerId,
                    },
                ],
                { session },
            );
            createdTermination = doc;

            if (type === TERMINATION_TYPE.MUTUAL) {
                if (repOccupant?.userId) {
                    await notify(
                        {
                            userIds: repOccupant.userId,
                            type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
                            title: `Đơn chấm dứt hợp đồng phòng ${room.roomNumber}`,
                            message: `Manager đã gửi đơn chấm dứt hợp đồng phòng ${room.roomNumber} (${building.name}) với ngày hiệu lực ${formatDateVn(effectiveDate)}. Vui lòng xem và xác nhận.`,
                            refId: createdTermination._id,
                            createdBy: managerId,
                        },
                        session,
                    );
                }
            } else {
                // Đơn phương (UNILATERAL): thông báo cho Admin duyệt
                const admins = await User.find({
                    roleId: ROLE.ADMIN,
                    status: USER_STATUS.ACTIVE,
                })
                    .select('_id')
                    .session(session)
                    .lean();

                const adminIds = admins.map((a) => a._id);
                if (adminIds.length > 0) {
                    await notify(
                        {
                            userIds: adminIds,
                            type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
                            title: `Đơn chấm dứt đơn phương phòng ${room.roomNumber} chờ duyệt`,
                            message: `Manager vừa gửi đơn chấm dứt hợp đồng đơn phương cho phòng ${room.roomNumber} (${building.name}). Lý do: ${cleanReason}`,
                            refId: createdTermination._id,
                            createdBy: managerId,
                        },
                        session,
                    );
                }
            }
        });
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError('Hợp đồng đã có đơn chấm dứt đang xử lý', 400);
        }
        throw error;
    }

    let warning;
    if (type === TERMINATION_TYPE.MUTUAL) {
        const recipientEmail = await getRepresentativeRecipientEmail(contract._id, contract.representativeEmail);
        const mailSent = await sendMutualRequestEmail(
            recipientEmail,
            room.roomNumber,
            building.name,
            effectiveDate,
            cleanReason,
            cleanNote,
        );
        if (!mailSent) {
            warning = 'Gửi email thông báo đơn chấm dứt thất bại';
        }
    }

    return {
        termination: createdTermination,
        warning,
    };
};

/**
 * Danh sách đơn chấm dứt (UC-28, UC-29) – Role: Admin, Manager, Customer
 */
export const getTerminations = async ({ userId, roleId, query = {} }) => {
    const pageNum = Number(query.page) || 1;
    const limitNum = Number(query.limit) || 10;
    const filter = {};

    if (query.status) {
        const statuses = String(query.status).split(',').map((s) => s.trim()).filter(Boolean);
        filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    if (query.type) {
        const types = String(query.type).split(',').map((t) => t.trim()).filter(Boolean);
        filter.type = types.length === 1 ? types[0] : { $in: types };
    }

    let prefetchedContracts = null;
    let prefetchedRooms = null;
    let prefetchedBuildings = null;

    if (roleId === ROLE.ADMIN) {
        if (query.contractId) {
            filter.contractId = query.contractId;
        }
    } else if (roleId === ROLE.MANAGER) {
        if (query.contractId) {
            const [building, singleContract] = await Promise.all([
                Building.findOne({ managerId: userId, isDeleted: false }).select('_id name address').lean(),
                Contract.findById(query.contractId)
                    .select('_id roomId status startDate endDate rentPrice deposit')
                    .lean(),
            ]);
            if (!building || !singleContract) {
                throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
            }
            const singleRoom = await Room.findOne({
                _id: singleContract.roomId,
                buildingId: building._id,
                isDeleted: false,
            })
                .select('_id roomNumber floorNumber buildingId')
                .lean();
            if (!singleRoom) {
                throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
            }
            filter.contractId = singleContract._id;
            prefetchedContracts = [singleContract];
            prefetchedRooms = [singleRoom];
            prefetchedBuildings = [building];
        } else {
            const building = await Building.findOne({ managerId: userId, isDeleted: false })
                .select('_id name address')
                .lean();
            if (!building) {
                return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
            }
            const rooms = await Room.find({ buildingId: building._id, isDeleted: false })
                .select('_id roomNumber floorNumber buildingId')
                .lean();
            const roomIds = rooms.map((r) => r._id);
            const contracts = roomIds.length > 0
                ? await Contract.find({ roomId: { $in: roomIds } })
                      .select('_id roomId status startDate endDate rentPrice deposit')
                      .lean()
                : [];
            filter.contractId = { $in: contracts.map((c) => c._id) };
            prefetchedContracts = contracts;
            prefetchedRooms = rooms;
            prefetchedBuildings = [building];
        }
    } else if (roleId === ROLE.CUSTOMER) {
        if (query.contractId) {
            const isMyContract = await Occupant.exists({
                contractId: query.contractId,
                userId,
                isRepresentative: true,
            });
            if (!isMyContract) {
                throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
            }
            filter.contractId = query.contractId;
        } else {
            const repOccupants = await Occupant.find({
                userId,
                isRepresentative: true,
            })
                .select('contractId')
                .lean();
            filter.contractId = { $in: repOccupants.map((o) => o.contractId) };
        }

        // Customer không thấy đơn UNILATERAL nội bộ chưa được Admin duyệt (PENDING / REJECTED / CANCELLED)
        filter.$or = [
            { type: TERMINATION_TYPE.MUTUAL },
            { type: TERMINATION_TYPE.UNILATERAL, status: TERMINATION_STATUS.CONFIRMED },
        ];
    } else {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    const result = await paginate(TerminationRequest, filter, {
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

    const contractIds = [...new Set(result.items.map((item) => String(item.contractId)))];
    const contracts = prefetchedContracts
        ? prefetchedContracts.filter((c) => contractIds.includes(String(c._id)))
        : await Contract.find({ _id: { $in: contractIds } })
              .select('_id roomId status startDate endDate rentPrice deposit')
              .lean();
    const roomIds = [...new Set(contracts.map((c) => String(c.roomId)))];

    const [rooms, repOccupants, confirmationInfos] = await Promise.all([
        prefetchedRooms
            ? prefetchedRooms.filter((r) => roomIds.includes(String(r._id)))
            : Room.find({ _id: { $in: roomIds } })
                  .select('_id roomNumber floorNumber buildingId')
                  .lean(),
        Occupant.find({ contractId: { $in: contractIds }, isRepresentative: true })
            .select('_id contractId name cccd phone')
            .lean(),
        buildElectronicConfirmationInfos(result.items),
    ]);
    const buildingIds = [...new Set(rooms.map((r) => String(r.buildingId)))];
    const buildings = prefetchedBuildings
        ? prefetchedBuildings.filter((b) => buildingIds.includes(String(b._id)))
        : await Building.find({ _id: { $in: buildingIds } }).select('_id name address').lean();

    const contractMap = new Map(contracts.map((c) => [String(c._id), c]));
    const roomMap = new Map(rooms.map((r) => [String(r._id), r]));
    const buildingMap = new Map(buildings.map((b) => [String(b._id), b]));
    const repMap = new Map(repOccupants.map((o) => [String(o.contractId), o]));

    const enrichedItems = result.items.map((termination, index) => {
        const contract = contractMap.get(String(termination.contractId)) || null;
        const room = contract ? roomMap.get(String(contract.roomId)) || null : null;
        const building = room ? buildingMap.get(String(room.buildingId)) || null : null;
        const rep = repMap.get(String(termination.contractId)) || null;
        const confirmationInfo = confirmationInfos[index];

        return {
            ...termination,
            ...confirmationInfo,
            contract: contract
                ? {
                    _id: contract._id,
                    status: contract.status,
                    startDate: contract.startDate,
                    endDate: contract.endDate,
                    rentPrice: contract.rentPrice,
                    deposit: contract.deposit,
                }
                : null,
            room: room
                ? {
                    _id: room._id,
                    roomNumber: room.roomNumber,
                    floorNumber: room.floorNumber,
                    building: building ? { _id: building._id, name: building.name } : null,
                }
                : null,
            representative: rep
                ? {
                    _id: rep._id,
                    name: rep.name,
                    cccd: rep.cccd,
                    phone: rep.phone,
                }
                : null,
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
 * Chi tiết đơn chấm dứt (UC-28, UC-29) – Role: Admin, Manager, Customer
 */
export const getTerminationById = async ({ userId, roleId, terminationId }) => {
    const termination = await TerminationRequest.findById(terminationId).lean();
    if (!termination) {
        throw new AppError('Không tìm thấy đơn chấm dứt hợp đồng', 404);
    }

    const contract = await Contract.findById(termination.contractId).lean();
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng của đơn chấm dứt', 404);
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
        const isHiddenUnilateral =
            termination.type === TERMINATION_TYPE.UNILATERAL &&
            termination.status !== TERMINATION_STATUS.CONFIRMED;
        if (!isMyContract || isHiddenUnilateral) {
            throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
        }
    } else if (roleId !== ROLE.ADMIN) {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    const repOccupant = await Occupant.findOne({
        contractId: contract._id,
        isRepresentative: true,
    }).lean();

    const confirmationInfo = await buildElectronicConfirmationInfo(termination);

    return {
        ...termination,
        ...confirmationInfo,
        contract: {
            _id: contract._id,
            contractType: contract.contractType,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            rentPrice: contract.rentPrice,
            deposit: contract.deposit,
            representativeEmail: contract.representativeEmail,
        },
        room: room
            ? {
                _id: room._id,
                roomNumber: room.roomNumber,
                floorNumber: room.floorNumber,
                status: room.status,
                building: building
                    ? { _id: building._id, name: building.name, address: building.address }
                    : null,
            }
            : null,
        representative: repOccupant
            ? {
                _id: repOccupant._id,
                userId: repOccupant.userId,
                name: repOccupant.name,
                cccd: repOccupant.cccd,
                phone: repOccupant.phone,
                email: contract.representativeEmail,
            }
            : null,
    };
};

/**
 * Customer (người đại diện) xác nhận đơn chấm dứt hai bên thỏa thuận (UC-28)
 */
export const confirmTermination = async ({ customerId, terminationId, clientIp }) => {
    const termination = await TerminationRequest.findById(terminationId);
    if (!termination) {
        throw new AppError('Không tìm thấy đơn chấm dứt hợp đồng', 404);
    }

    const contract = await Contract.findById(termination.contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    const repOccupant = await Occupant.findOne({
        contractId: contract._id,
        userId: customerId,
        isRepresentative: true,
    }).lean();

    if (!repOccupant) {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    if (termination.type !== TERMINATION_TYPE.MUTUAL) {
        throw new AppError('Chỉ đơn chấm dứt hai bên thỏa thuận mới do khách hàng xác nhận', 400);
    }

    if (termination.status !== TERMINATION_STATUS.PENDING) {
        throw new AppError('Đơn chấm dứt này không còn ở trạng thái chờ xác nhận', 400);
    }

    if (contract.status !== CONTRACT_STATUS.ACTIVE) {
        throw new AppError('Hợp đồng không còn ở trạng thái đang hiệu lực', 400);
    }

    const room = await Room.findById(contract.roomId).lean();
    const building = room ? await Building.findOne({ _id: room.buildingId, isDeleted: false }).lean() : null;

    const now = new Date();
    const shouldEndImmediately = startOfVietnamDay(termination.effectiveDate) <= startOfVietnamDay(now);

    const signatureHash = computeTerminationHash({
        contractId: termination.contractId,
        type: termination.type,
        reason: termination.reason,
        effectiveDate: termination.effectiveDate,
        note: termination.note,
        handledBy: customerId,
        handledAt: now,
    });

    let contractEndedImmediately = false;
    let updatedTermination = null;

    await withTransaction(async (session) => {
        const freshContract = await Contract.findById(contract._id).select('status').session(session).lean();
        if (!freshContract || freshContract.status !== CONTRACT_STATUS.ACTIVE) {
            throw new AppError('Hợp đồng không còn ở trạng thái đang hiệu lực', 409);
        }

        // Chốt trạng thái PENDING nguyên tử để tránh đè khi Manager hủy hoặc cron vừa xử lý đồng thời
        updatedTermination = await TerminationRequest.findOneAndUpdate(
            { _id: termination._id, status: TERMINATION_STATUS.PENDING },
            {
                $set: {
                    status: TERMINATION_STATUS.CONFIRMED,
                    autoConfirmed: false,
                    handledBy: customerId,
                    handledAt: now,
                    handledIp: String(clientIp || '127.0.0.1'),
                    signatureHash,
                },
            },
            { session, returnDocument: 'after' },
        );
        if (!updatedTermination) {
            throw new AppError('Đơn chấm dứt đã được xử lý hoặc vừa bị thay đổi bởi thao tác khác', 409);
        }

        if (shouldEndImmediately) {
            contractEndedImmediately = await endContractByTerminationInSession({
                contractId: contract._id,
                effectiveDate: updatedTermination.effectiveDate,
                endedAt: now,
                session,
            });
        }

        const recipientIds = [
            customerId,
            building?.managerId || updatedTermination.requestedBy,
        ].filter(Boolean);

        await notify(
            {
                userIds: recipientIds,
                type: NOTIFICATION_TYPE.TERMINATION_CONFIRMED,
                title: `Đã xác nhận chấm dứt hợp đồng phòng ${room?.roomNumber || ''}`,
                message: `Người đại diện ${repOccupant.name} đã xác nhận điện tử đơn chấm dứt hợp đồng phòng ${room?.roomNumber || ''} (ngày hiệu lực: ${formatDateVn(updatedTermination.effectiveDate)}).`,
                refId: updatedTermination._id,
                createdBy: customerId,
            },
            session,
        );
    });

    const recipientEmail = await getRepresentativeRecipientEmail(contract._id, contract.representativeEmail);
    const mailSent = await sendMutualConfirmedEmail(
        recipientEmail,
        room?.roomNumber || '',
        building?.name || '',
        updatedTermination.effectiveDate,
        false,
    );

    const confirmationInfo = await buildElectronicConfirmationInfo(updatedTermination.toObject());

    return {
        termination: updatedTermination,
        ...confirmationInfo,
        contractEndedImmediately,
        warning: mailSent ? undefined : 'Gửi email xác nhận chấm dứt hợp đồng thất bại',
    };
};

/**
 * Admin phê duyệt đơn chấm dứt đơn phương (UC-29)
 */
export const approveTermination = async ({ adminId, terminationId }) => {
    const termination = await TerminationRequest.findById(terminationId);
    if (!termination) {
        throw new AppError('Không tìm thấy đơn chấm dứt hợp đồng', 404);
    }

    if (termination.type !== TERMINATION_TYPE.UNILATERAL) {
        throw new AppError('Admin chỉ phê duyệt đơn chấm dứt đơn phương', 400);
    }

    if (termination.status !== TERMINATION_STATUS.PENDING) {
        throw new AppError('Đơn chấm dứt này không còn ở trạng thái chờ duyệt', 400);
    }

    const contract = await Contract.findById(termination.contractId);
    if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
        throw new AppError('Hợp đồng không còn ở trạng thái đang hiệu lực', 400);
    }

    const room = await Room.findById(contract.roomId).lean();
    const building = room ? await Building.findOne({ _id: room.buildingId, isDeleted: false }).lean() : null;
    const repOccupant = await Occupant.findOne({
        contractId: contract._id,
        isRepresentative: true,
    }).lean();

    const now = new Date();
    const shouldEndImmediately = startOfVietnamDay(termination.effectiveDate) <= startOfVietnamDay(now);
    let contractEndedImmediately = false;
    let updatedTermination = null;

    await withTransaction(async (session) => {
        const freshContract = await Contract.findById(contract._id).select('status').session(session).lean();
        if (!freshContract || freshContract.status !== CONTRACT_STATUS.ACTIVE) {
            throw new AppError('Hợp đồng không còn ở trạng thái đang hiệu lực', 409);
        }

        // Chốt trạng thái PENDING nguyên tử để tránh đè khi Manager hủy hoặc Admin khác xử lý đồng thời
        updatedTermination = await TerminationRequest.findOneAndUpdate(
            { _id: termination._id, status: TERMINATION_STATUS.PENDING },
            {
                $set: {
                    status: TERMINATION_STATUS.CONFIRMED,
                    handledBy: adminId,
                    handledAt: now,
                },
            },
            { session, returnDocument: 'after' },
        );
        if (!updatedTermination) {
            throw new AppError('Đơn chấm dứt đã được xử lý hoặc vừa bị thay đổi bởi thao tác khác', 409);
        }

        if (shouldEndImmediately) {
            contractEndedImmediately = await endContractByTerminationInSession({
                contractId: contract._id,
                effectiveDate: updatedTermination.effectiveDate,
                endedAt: now,
                session,
            });
        }

        // Thông báo cho người đại diện (kèm lý do và ngày hiệu lực)
        if (repOccupant?.userId) {
            await notify(
                {
                    userIds: repOccupant.userId,
                    type: NOTIFICATION_TYPE.TERMINATION_CONFIRMED,
                    title: `Thông báo chấm dứt hợp đồng đơn phương phòng ${room?.roomNumber || ''}`,
                    message: `Hợp đồng phòng ${room?.roomNumber || ''} (${building?.name || ''}) bị chấm dứt đơn phương từ ngày ${formatDateVn(updatedTermination.effectiveDate)}. Lý do: ${updatedTermination.reason}`,
                    refId: updatedTermination._id,
                    createdBy: adminId,
                },
                session,
            );
        }

        // Thông báo cho Manager
        const managerRecipientId = building?.managerId || updatedTermination.requestedBy;
        if (managerRecipientId) {
            await notify(
                {
                    userIds: managerRecipientId,
                    type: NOTIFICATION_TYPE.TERMINATION_CONFIRMED,
                    title: `Đơn chấm dứt đơn phương phòng ${room?.roomNumber || ''} đã được duyệt`,
                    message: `Admin đã phê duyệt đơn chấm dứt hợp đồng đơn phương phòng ${room?.roomNumber || ''} (ngày hiệu lực: ${formatDateVn(updatedTermination.effectiveDate)}).`,
                    refId: updatedTermination._id,
                    createdBy: adminId,
                },
                session,
            );
        }
    });

    const recipientEmail = await getRepresentativeRecipientEmail(contract._id, contract.representativeEmail);
    const mailSent = await sendUnilateralApprovedEmail(
        recipientEmail,
        room?.roomNumber || '',
        building?.name || '',
        updatedTermination.effectiveDate,
        updatedTermination.reason,
    );

    return {
        termination: updatedTermination,
        contractEndedImmediately,
        warning: mailSent ? undefined : 'Gửi email thông báo chấm dứt đơn phương thất bại',
    };
};

/**
 * Admin từ chối đơn chấm dứt đơn phương (UC-29)
 */
export const rejectTermination = async ({ adminId, terminationId, data }) => {
    const termination = await TerminationRequest.findById(terminationId);
    if (!termination) {
        throw new AppError('Không tìm thấy đơn chấm dứt hợp đồng', 404);
    }

    if (termination.type !== TERMINATION_TYPE.UNILATERAL) {
        throw new AppError('Admin chỉ từ chối đơn chấm dứt đơn phương', 400);
    }

    if (termination.status !== TERMINATION_STATUS.PENDING) {
        throw new AppError('Đơn chấm dứt này không còn ở trạng thái chờ duyệt', 400);
    }

    const contract = await Contract.findById(termination.contractId).lean();
    const room = contract ? await Room.findById(contract.roomId).lean() : null;
    const building = room ? await Building.findOne({ _id: room.buildingId, isDeleted: false }).lean() : null;

    const cleanReason = data.reason.trim();
    const now = new Date();

    let updatedTermination = null;

    await withTransaction(async (session) => {
        updatedTermination = await TerminationRequest.findOneAndUpdate(
            { _id: termination._id, status: TERMINATION_STATUS.PENDING },
            {
                $set: {
                    status: TERMINATION_STATUS.REJECTED,
                    handledBy: adminId,
                    handledAt: now,
                    rejectReason: cleanReason,
                },
            },
            { session, returnDocument: 'after' },
        );
        if (!updatedTermination) {
            throw new AppError('Đơn chấm dứt đã được xử lý hoặc vừa bị thay đổi bởi thao tác khác', 409);
        }

        const managerRecipientId = building?.managerId || updatedTermination.requestedBy;
        if (managerRecipientId) {
            await notify(
                {
                    userIds: managerRecipientId,
                    type: NOTIFICATION_TYPE.TERMINATION_REJECTED,
                    title: `Đơn chấm dứt đơn phương phòng ${room?.roomNumber || ''} bị từ chối`,
                    message: `Admin đã từ chối đơn chấm dứt hợp đồng đơn phương phòng ${room?.roomNumber || ''}. Lý do: ${cleanReason}`,
                    refId: updatedTermination._id,
                    createdBy: adminId,
                },
                session,
            );
        }
    });

    return { termination: updatedTermination };
};

/**
 * Manager hủy đơn chấm dứt khi còn đang chờ xử lý (UC-28, UC-29)
 */
export const cancelTermination = async ({ managerId, terminationId, data }) => {
    const termination = await TerminationRequest.findById(terminationId);
    if (!termination) {
        throw new AppError('Không tìm thấy đơn chấm dứt hợp đồng', 404);
    }

    const contract = await Contract.findById(termination.contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    const { room, building } = await verifyManagerContractScope(managerId, contract);

    if (termination.status !== TERMINATION_STATUS.PENDING) {
        throw new AppError('Chỉ có thể hủy đơn chấm dứt khi đang ở trạng thái chờ xử lý', 400);
    }

    const repOccupant = await Occupant.findOne({
        contractId: contract._id,
        isRepresentative: true,
    }).lean();

    const cleanReason = data.reason.trim();

    let updatedTermination = null;

    await withTransaction(async (session) => {
        // Chốt trạng thái PENDING nguyên tử để tránh hủy đè lên đơn vừa được xác nhận / duyệt
        updatedTermination = await TerminationRequest.findOneAndUpdate(
            { _id: termination._id, status: TERMINATION_STATUS.PENDING },
            {
                $set: {
                    status: TERMINATION_STATUS.CANCELLED,
                    cancelledBy: managerId,
                    cancelReason: cleanReason,
                },
            },
            { session, returnDocument: 'after' },
        );
        if (!updatedTermination) {
            throw new AppError('Đơn chấm dứt đã được xử lý hoặc vừa bị thay đổi bởi thao tác khác', 409);
        }

        if (updatedTermination.type === TERMINATION_TYPE.MUTUAL) {
            if (repOccupant?.userId) {
                await notify(
                    {
                        userIds: repOccupant.userId,
                        type: NOTIFICATION_TYPE.TERMINATION_CANCELLED,
                        title: `Đã hủy đơn chấm dứt hợp đồng phòng ${room.roomNumber}`,
                        message: `Manager đã hủy đơn chấm dứt hợp đồng phòng ${room.roomNumber} (${building.name}). Lý do: ${cleanReason}`,
                        refId: updatedTermination._id,
                        createdBy: managerId,
                    },
                    session,
                );
            }
        } else {
            // Đơn phương (UNILATERAL): chỉ thông báo cho Admin đang chờ duyệt, không gửi cho Khách thuê
            const admins = await User.find({
                roleId: ROLE.ADMIN,
                status: USER_STATUS.ACTIVE,
            })
                .select('_id')
                .session(session)
                .lean();

            const adminIds = admins.map((a) => a._id);
            if (adminIds.length > 0) {
                await notify(
                    {
                        userIds: adminIds,
                        type: NOTIFICATION_TYPE.TERMINATION_CANCELLED,
                        title: `Đơn chấm dứt đơn phương phòng ${room.roomNumber} đã bị hủy`,
                        message: `Manager đã hủy đơn chấm dứt hợp đồng đơn phương phòng ${room.roomNumber} (${building.name}). Lý do: ${cleanReason}`,
                        refId: updatedTermination._id,
                        createdBy: managerId,
                    },
                    session,
                );
            }
        }
    });

    return { termination: updatedTermination };
};

/**
 * Job 1 – Nhắc và tự xác nhận đơn chấm dứt hai bên thỏa thuận (UC-28):
 * - Đơn MUTUAL còn PENDING:
 *   + Nhắc (chuông + mail) ngày 1, 3, 6 tính từ createdAt (mỗi mốc nhắc tối đa 1 lần).
 *   + Đủ >= 7 ngày chưa xác nhận -> tự CONFIRMED (autoConfirmed = true, không có mã xác thực),
 *     nếu ngày hiệu lực đã tới hoặc đã qua thì kết thúc hợp đồng ngay; báo Customer + Manager, gửi mail Customer.
 */
export const runTerminationReminderJob = async (now = new Date()) => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const MILESTONE_DAYS = [1, 3, 6];

    const pendingMutuals = await TerminationRequest.find({
        type: TERMINATION_TYPE.MUTUAL,
        status: TERMINATION_STATUS.PENDING,
    });

    const remindedIds = [];
    const autoConfirmedIds = [];

    for (const termination of pendingMutuals) {
        const contract = await Contract.findById(termination.contractId).lean();
        if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
            continue;
        }

        const room = await Room.findById(contract.roomId).lean();
        const building = room ? await Building.findOne({ _id: room.buildingId, isDeleted: false }).lean() : null;
        const repOccupant = await Occupant.findOne({
            contractId: contract._id,
            isRepresentative: true,
        }).lean();

        const diffMs = now.getTime() - new Date(termination.createdAt).getTime();
        const elapsedByMs = Math.floor(diffMs / DAY_MS);
        const elapsedByCalendar = Math.floor(
            (startOfVietnamDay(now).getTime() - startOfVietnamDay(termination.createdAt).getTime()) / DAY_MS,
        );
        const elapsedDays = Math.max(elapsedByMs, elapsedByCalendar);

        // Trường hợp 1: Đủ >= 7 ngày chưa xác nhận -> tự động xác nhận
        if (elapsedDays >= 7) {
            const shouldEndImmediately = startOfVietnamDay(termination.effectiveDate) <= startOfVietnamDay(now);
            let didAutoConfirm = false;

            await withTransaction(async (session) => {
                const freshTerm = await TerminationRequest.findOneAndUpdate(
                    { _id: termination._id, status: TERMINATION_STATUS.PENDING },
                    {
                        $set: {
                            status: TERMINATION_STATUS.CONFIRMED,
                            autoConfirmed: true,
                            handledAt: now,
                        },
                        $unset: { signatureHash: '' },
                    },
                    { session, returnDocument: 'after' },
                );
                if (!freshTerm) {
                    return;
                }

                if (shouldEndImmediately) {
                    await endContractByTerminationInSession({
                        contractId: contract._id,
                        effectiveDate: freshTerm.effectiveDate,
                        endedAt: now,
                        session,
                    });
                }

                const recipientIds = [
                    repOccupant?.userId,
                    building?.managerId || freshTerm.requestedBy,
                ].filter(Boolean);

                if (recipientIds.length > 0) {
                    await notify(
                        {
                            userIds: recipientIds,
                            type: NOTIFICATION_TYPE.TERMINATION_CONFIRMED,
                            title: `Đơn chấm dứt hợp đồng phòng ${room?.roomNumber || ''} tự động xác nhận`,
                            message: `Đơn chấm dứt hợp đồng phòng ${room?.roomNumber || ''} (${building?.name || ''}) đã được hệ thống tự động xác nhận sau 7 ngày kể từ ngày gửi (ngày hiệu lực: ${formatDateVn(freshTerm.effectiveDate)}).`,
                            refId: freshTerm._id,
                        },
                        session,
                    );
                }

                didAutoConfirm = true;
            });

            if (didAutoConfirm) {
                autoConfirmedIds.push(termination._id);
                const recipientEmail = await getRepresentativeRecipientEmail(contract._id, contract.representativeEmail);
                await sendMutualConfirmedEmail(
                    recipientEmail,
                    room?.roomNumber || '',
                    building?.name || '',
                    termination.effectiveDate,
                    true,
                );
            }
            continue;
        }

        // Trường hợp 2: Nhắc vào các mốc ngày 1, 3, 6 (mỗi mốc nhắc tối đa 1 lần)
        const reachedMilestones = MILESTONE_DAYS.filter((m) => m <= elapsedDays);
        if (reachedMilestones.length === 0 || !repOccupant?.userId) {
            continue;
        }

        const existingReminders = await Notification.find({
            type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
            refId: termination._id,
            createdBy: { $in: [null] },
        })
            .select('title')
            .lean();

        for (const milestoneDay of reachedMilestones) {
            const marker = `(Ngày ${milestoneDay})`;
            const alreadyReminded = existingReminders.some((n) => String(n.title || '').includes(marker));
            if (alreadyReminded) {
                continue;
            }

            await notify({
                userIds: repOccupant.userId,
                type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
                title: `Nhắc xác nhận đơn chấm dứt hợp đồng phòng ${room?.roomNumber || ''} ${marker}`,
                message: `Đơn chấm dứt hợp đồng phòng ${room?.roomNumber || ''} (${building?.name || ''}) với ngày hiệu lực ${formatDateVn(termination.effectiveDate)} vẫn đang chờ bạn xác nhận.`,
                refId: termination._id,
            });

            const recipientEmail = await getRepresentativeRecipientEmail(contract._id, contract.representativeEmail);
            await sendReminderEmail(
                recipientEmail,
                room?.roomNumber || '',
                building?.name || '',
                termination.effectiveDate,
                milestoneDay,
            );

            remindedIds.push({ terminationId: termination._id, milestoneDay });
        }
    }

    return {
        remindedCount: remindedIds.length,
        autoConfirmedCount: autoConfirmedIds.length,
        remindedIds,
        autoConfirmedIds,
    };
};

/**
 * Job 2 – Đơn chấm dứt đến ngày hiệu lực (UC-28, UC-29):
 * Đơn đã CONFIRMED có ngày hiệu lực <= hôm nay mà hợp đồng còn ACTIVE:
 * trong 1 transaction chuyển hợp đồng -> ENDED, phòng -> AVAILABLE, toàn bộ cư dân đang ở -> LEFT kèm ngày ra.
 */
export const runTerminationEffectiveJob = async (now = new Date()) => {
    const todayStart = startOfVietnamDay(now);
    const confirmedTerminations = await TerminationRequest.find({
        status: TERMINATION_STATUS.CONFIRMED,
    });

    const endedContractIds = [];

    for (const termination of confirmedTerminations) {
        if (startOfVietnamDay(termination.effectiveDate) > todayStart) {
            continue;
        }

        const contract = await Contract.findById(termination.contractId).lean();
        if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
            continue;
        }

        let didEnd = false;

        await withTransaction(async (session) => {
            didEnd = await endContractByTerminationInSession({
                contractId: contract._id,
                effectiveDate: termination.effectiveDate,
                endedAt: now,
                session,
            });
        });

        if (didEnd) {
            endedContractIds.push(contract._id);
        }
    }

    return {
        processedCount: endedContractIds.length,
        endedContractIds,
    };
};

