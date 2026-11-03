// Nghiệp vụ cho module occupant: xem danh sách/chi tiết cư dân, sửa thông tin, thêm và rút tên người ở cùng (UC-30..33)
import {
    ROLE,
    CONTRACT_STATUS,
    OCCUPANT_STATUS,
    AUDIT_ACTION,
} from '../../constants/enums.js';
import { AppError } from '../../utils/AppError.js';
import { paginate } from '../../utils/pagination.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { audit } from '../../helpers/audit.js';
import { startOfVietnamDay } from '../../helpers/date.js';
import { isCccd } from '../../helpers/validators.js';
import { getSignedUrl } from '../upload/upload.service.js';
import Occupant from '../../models/Occupant.js';
import Contract from '../../models/Contract.js';
import Room from '../../models/Room.js';
import RoomType from '../../models/RoomType.js';
import Building from '../../models/Building.js';
import User from '../../models/User.js';
import Manager from '../../models/Manager.js';

/**
 * Kiểm tra quyền Manager trên hợp đồng/phòng (phải thuộc tòa Manager đang quản lý)
 */
const verifyManagerScopeByContract = async (managerId, contract) => {
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
 * Xem danh sách cư dân trong tòa của Manager (UC-30)
 * - Mặc định chỉ lấy người đang ở (STAYED thuộc hợp đồng ACTIVE)
 * - Lọc theo roomId và status (STAYED / LEFT)
 * - Không bao giờ lấy cư dân của hợp đồng DRAFT hoặc CANCELLED
 */
export const getOccupants = async ({ managerId, query = {} }) => {
    const { roomId, status, page = 1, limit = 10 } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const building = await Building.findOne({ managerId, isDeleted: false }).lean();
    if (!building) {
        if (roomId) {
            const room = await Room.findOne({ _id: roomId, isDeleted: false }).lean();
            if (!room) {
                throw new AppError('Không tìm thấy phòng', 404);
            }
            throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
        }
        return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    const buildingRooms = await Room.find({ buildingId: building._id, isDeleted: false })
        .select('_id roomNumber floorNumber status')
        .lean();
    const roomMap = new Map(buildingRooms.map((r) => [String(r._id), r]));

    let targetRoomIds = buildingRooms.map((r) => r._id);

    if (roomId) {
        const targetRoom = await Room.findOne({ _id: roomId, isDeleted: false }).lean();
        if (!targetRoom) {
            throw new AppError('Không tìm thấy phòng', 404);
        }
        if (!roomMap.has(String(targetRoom._id))) {
            throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
        }
        targetRoomIds = [targetRoom._id];
    }

    if (targetRoomIds.length === 0) {
        return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    // Chỉ lấy hợp đồng ACTIVE hoặc ENDED (không lấy DRAFT và CANCELLED vì họ chưa từng vào ở)
    const contracts = await Contract.find({
        roomId: { $in: targetRoomIds },
        status: { $in: [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED] },
    })
        .select('_id roomId status')
        .lean();

    if (contracts.length === 0) {
        return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    const activeContractIds = contracts
        .filter((c) => c.status === CONTRACT_STATUS.ACTIVE)
        .map((c) => c._id);
    const activeAndEndedContractIds = contracts.map((c) => c._id);
    const contractMap = new Map(contracts.map((c) => [String(c._id), c]));

    const statusList = Array.isArray(status)
        ? status
        : typeof status === 'string' && status.trim()
            ? status.split(',').map((s) => s.trim()).filter(Boolean)
            : [OCCUPANT_STATUS.STAYED]; // Mặc định chỉ lấy người đang ở (STAYED)

    const wantStayed = statusList.includes(OCCUPANT_STATUS.STAYED);
    const wantLeft = statusList.includes(OCCUPANT_STATUS.LEFT);

    let filter = {};
    if (wantStayed && !wantLeft) {
        filter = {
            contractId: { $in: activeContractIds },
            status: OCCUPANT_STATUS.STAYED,
        };
    } else if (!wantStayed && wantLeft) {
        filter = {
            contractId: { $in: activeAndEndedContractIds },
            status: OCCUPANT_STATUS.LEFT,
        };
    } else {
        filter = {
            $or: [
                { contractId: { $in: activeContractIds }, status: OCCUPANT_STATUS.STAYED },
                { contractId: { $in: activeAndEndedContractIds }, status: OCCUPANT_STATUS.LEFT },
            ],
        };
    }

    const result = await paginate(Occupant, filter, {
        page: pageNum,
        limit: limitNum,
        sort: { isRepresentative: -1, joinDate: -1, createdAt: -1 },
    });

    const items = result.items.map((occ) => {
        const contract = contractMap.get(String(occ.contractId));
        const room = contract ? roomMap.get(String(contract.roomId)) : null;

        return {
            _id: occ._id,
            contractId: occ.contractId,
            userId: occ.userId || null,
            name: occ.name,
            cccd: occ.cccd,
            phone: occ.phone,
            dateOfBirth: occ.dateOfBirth,
            address: occ.address || null,
            relationship: occ.relationship || null,
            isRepresentative: occ.isRepresentative,
            roleLabel: occ.isRepresentative ? 'Đại diện' : 'Ở cùng',
            status: occ.status,
            joinDate: occ.joinDate,
            exitDate: occ.exitDate || null,
            room: room
                ? {
                    _id: room._id,
                    roomNumber: room.roomNumber,
                    floorNumber: room.floorNumber,
                    status: room.status,
                }
                : null,
        };
    });

    return {
        items,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit) || 0,
    };
};

/**
 * Customer (người đại diện) xem danh sách thành viên trong hợp đồng ACTIVE của mình (UC-30 - Thành viên phòng)
 */
export const getMyRoomMembers = async ({ userId }) => {
    const repOccupants = await Occupant.find({
        userId,
        isRepresentative: true,
    })
        .select('contractId')
        .lean();

    if (repOccupants.length === 0) {
        return { contractId: null, room: null, items: [] };
    }

    const activeContract = await Contract.findOne({
        _id: { $in: repOccupants.map((o) => o.contractId) },
        status: CONTRACT_STATUS.ACTIVE,
    }).lean();

    if (!activeContract) {
        return { contractId: null, room: null, items: [] };
    }

    const [room, user, occupants] = await Promise.all([
        Room.findById(activeContract.roomId).select('_id roomNumber floorNumber status roomTypeId').lean(),
        User.findById(userId).select('email').lean(),
        Occupant.find({ contractId: activeContract._id })
            .sort({ isRepresentative: -1, joinDate: 1 })
            .lean(),
    ]);

    const roomType = room?.roomTypeId
        ? await RoomType.findById(room.roomTypeId).select('_id name capacity').lean()
        : null;

    const items = occupants.map((occ) => ({
        _id: occ._id,
        contractId: occ.contractId,
        userId: occ.userId || null,
        name: occ.name,
        cccd: occ.cccd,
        phone: occ.phone,
        email: occ.isRepresentative ? (user?.email || activeContract.representativeEmail) : null,
        dateOfBirth: occ.dateOfBirth,
        address: occ.address || null,
        relationship: occ.relationship || null,
        isRepresentative: occ.isRepresentative,
        roleLabel: occ.isRepresentative ? 'Đại diện' : 'Ở cùng',
        status: occ.status,
        joinDate: occ.joinDate,
        exitDate: occ.exitDate || null,
        cccdFrontUrl: getSignedUrl(occ.cccdFrontImage),
        cccdBackUrl: getSignedUrl(occ.cccdBackImage),
    }));

    return {
        contractId: activeContract._id,
        room: room
            ? {
                _id: room._id,
                roomNumber: room.roomNumber,
                floorNumber: room.floorNumber,
                status: room.status,
                capacity: roomType?.capacity || null,
            }
            : null,
        items,
    };
};

/**
 * Xem chi tiết hồ sơ cư dân kèm link có chữ ký của ảnh CCCD (UC-30)
 * - Chỉ Manager của tòa và người đại diện của hợp đồng đó được xem
 */
export const getOccupantById = async ({ userId, roleId, occupantId }) => {
    const occupant = await Occupant.findById(occupantId).lean();
    if (!occupant) {
        throw new AppError('Không tìm thấy cư dân', 404);
    }

    const contract = await Contract.findById(occupant.contractId).lean();
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng của cư dân', 404);
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
            throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
        }
    } else {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    let repEmail = null;
    if (occupant.isRepresentative) {
        if (occupant.userId) {
            const repUser = await User.findById(occupant.userId).select('email').lean();
            repEmail = repUser?.email || contract.representativeEmail || null;
        } else {
            repEmail = contract.representativeEmail || null;
        }
    }

    return {
        _id: occupant._id,
        contractId: occupant.contractId,
        userId: occupant.userId || null,
        isRepresentative: occupant.isRepresentative,
        roleLabel: occupant.isRepresentative ? 'Đại diện' : 'Ở cùng',
        name: occupant.name,
        phone: occupant.phone,
        email: repEmail,
        dateOfBirth: occupant.dateOfBirth,
        address: occupant.address || null,
        cccd: occupant.cccd,
        relationship: occupant.relationship || null,
        status: occupant.status,
        joinDate: occupant.joinDate,
        exitDate: occupant.exitDate || null,
        cccdFrontImage: occupant.cccdFrontImage || null,
        cccdBackImage: occupant.cccdBackImage || null,
        cccdFrontUrl: getSignedUrl(occupant.cccdFrontImage),
        cccdBackUrl: getSignedUrl(occupant.cccdBackImage),
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
        contract: {
            _id: contract._id,
            contractType: contract.contractType,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
        },
    };
};

/**
 * Cập nhật thông tin cư dân (UC-31)
 * - Manager: sửa mọi cư dân trong tòa mình thuộc hợp đồng DRAFT hoặc ACTIVE (kể cả họ tên và CCCD của đại diện)
 * - Customer (đại diện): chỉ sửa người ở cùng trong hợp đồng ACTIVE của mình;
 *   gọi PUT /occupants/:id cho chính hồ sơ của mình -> chặn 400 "Thông tin của bạn vui lòng cập nhật ở trang Hồ sơ cá nhân"
 */
export const updateOccupant = async ({ userId, roleId, occupantId, data }) => {
    const occupant = await Occupant.findById(occupantId);
    if (!occupant) {
        throw new AppError('Không tìm thấy cư dân', 404);
    }

    const contract = await Contract.findById(occupant.contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng của cư dân', 404);
    }

    const room = await Room.findById(contract.roomId).lean();
    const building = room ? await Building.findOne({ _id: room.buildingId, isDeleted: false }).lean() : null;

    if (roleId === ROLE.MANAGER) {
        if (!building || String(building.managerId) !== String(userId)) {
            throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
        }
        if (contract.status !== CONTRACT_STATUS.DRAFT && contract.status !== CONTRACT_STATUS.ACTIVE) {
            throw new AppError('Chỉ được chỉnh sửa thông tin cư dân thuộc hợp đồng nháp hoặc đang hiệu lực', 400);
        }
    } else if (roleId === ROLE.CUSTOMER) {
        const isMyContract = await Occupant.exists({
            contractId: contract._id,
            userId,
            isRepresentative: true,
        });
        if (!isMyContract) {
            throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
        }
        // Người đại diện chỉ sửa người ở cùng qua API này; hồ sơ của chính mình sửa ở trang Hồ sơ cá nhân
        if (occupant.isRepresentative) {
            throw new AppError('Thông tin của bạn vui lòng cập nhật ở trang Hồ sơ cá nhân', 400);
        }
        if (contract.status !== CONTRACT_STATUS.ACTIVE) {
            throw new AppError('Chỉ được chỉnh sửa thông tin cư dân khi hợp đồng đang hiệu lực', 400);
        }
    } else {
        throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    const targetCccd = data.cccd !== undefined ? String(data.cccd).trim() : occupant.cccd;
    const targetDob = data.dateOfBirth !== undefined ? new Date(data.dateOfBirth) : occupant.dateOfBirth;
    const targetPhone = data.phone !== undefined ? String(data.phone).trim() : occupant.phone;

    // 1. Kiểm tra định dạng CCCD đủ 12 chữ số (dùng isCccd trong helpers/validators.js)
    if (data.cccd !== undefined && !isCccd(targetCccd)) {
        throw new AppError('Số CCCD phải gồm đúng 12 chữ số', 400);
    }

    // 2. Nếu đổi CCCD -> kiểm tra trùng trong hợp đồng và trên hệ thống
    const cccdChanged = data.cccd !== undefined && targetCccd !== occupant.cccd;
    if (cccdChanged) {
        const dupInContract = await Occupant.findOne({
            contractId: contract._id,
            _id: { $ne: occupant._id },
            cccd: targetCccd,
        });
        // Khi hợp đồng là DRAFT thì người đại diện chưa có bản ghi trong occupants nên so thêm với contract.representativeCccd;
        // Khi hợp đồng là ACTIVE thì người đại diện đã nằm trong occupants (dupInContract), không dựa vào contract.representativeCccd
        const dupWithDraftRep =
            contract.status === CONTRACT_STATUS.DRAFT &&
            !occupant.isRepresentative &&
            contract.representativeCccd === targetCccd;

        if (dupInContract || dupWithDraftRep) {
            throw new AppError('CCCD trùng với cư dân khác trong phòng', 400);
        }

        if (occupant.isRepresentative) {
            // Đổi CCCD người đại diện = đổi tên đăng nhập -> không được thuộc tài khoản Customer khác
            const otherRepAccount = await Occupant.findOne({
                cccd: targetCccd,
                isRepresentative: true,
                userId: { $ne: occupant.userId },
            });
            if (otherRepAccount) {
                throw new AppError('Số CCCD mới đã thuộc về tài khoản khách hàng khác trong hệ thống', 400);
            }
        }

        // Không được trùng người đang ở (STAYED) tại hợp đồng ACTIVE khác
        const stayedOther = await Occupant.findOne({
            cccd: targetCccd,
            status: OCCUPANT_STATUS.STAYED,
            contractId: { $ne: contract._id },
        });
        if (stayedOther) {
            const otherContract = await Contract.findById(stayedOther.contractId).select('status').lean();
            if (otherContract?.status === CONTRACT_STATUS.ACTIVE) {
                throw new AppError('Số CCCD mới hiện đang thuộc cư dân đang ở phòng khác', 400);
            }
        }
    }

    // 3. Kiểm tra SĐT không trùng người khác (kiểm chéo Manager và cư dân)
    const phoneChanged = data.phone !== undefined && targetPhone !== occupant.phone;
    if (phoneChanged) {
        const phoneInManager = await Manager.findOne({ phone: targetPhone });
        const phoneInOccupant = await Occupant.findOne({
            phone: targetPhone,
            _id: { $ne: occupant._id },
            cccd: { $nin: [occupant.cccd, targetCccd] },
        });
        if (phoneInManager || phoneInOccupant) {
            throw new AppError('Số điện thoại đã tồn tại trong hệ thống', 409);
        }
    }

    // 4. Ghi nhận giá trị trước/sau và lưu trong Transaction
    const before = {
        name: occupant.name,
        phone: occupant.phone,
        dateOfBirth: occupant.dateOfBirth,
        address: occupant.address ?? null,
        cccd: occupant.cccd,
        relationship: occupant.relationship ?? null,
        cccdFrontImage: occupant.cccdFrontImage ?? null,
        cccdBackImage: occupant.cccdBackImage ?? null,
    };

    if (data.name !== undefined) occupant.name = data.name.trim();
    if (data.phone !== undefined) occupant.phone = targetPhone;
    if (data.dateOfBirth !== undefined) occupant.dateOfBirth = targetDob;
    if (data.address !== undefined) occupant.address = data.address ? data.address.trim() : undefined;
    if (data.cccd !== undefined) occupant.cccd = targetCccd;
    if (data.relationship !== undefined) occupant.relationship = data.relationship ? data.relationship.trim() : undefined;
    if (data.cccdFrontImage !== undefined) occupant.cccdFrontImage = data.cccdFrontImage ? data.cccdFrontImage.trim() : undefined;
    if (data.cccdBackImage !== undefined) occupant.cccdBackImage = data.cccdBackImage ? data.cccdBackImage.trim() : undefined;

    const after = {
        name: occupant.name,
        phone: occupant.phone,
        dateOfBirth: occupant.dateOfBirth,
        address: occupant.address ?? null,
        cccd: occupant.cccd,
        relationship: occupant.relationship ?? null,
        cccdFrontImage: occupant.cccdFrontImage ?? null,
        cccdBackImage: occupant.cccdBackImage ?? null,
    };

    const oldCccd = before.cccd;

    await withTransaction(async (session) => {
        await occupant.save({ session });

        // Nếu đổi CCCD người đại diện -> chỉ đổi trên hồ sơ cư dân (tên đăng nhập), KHÔNG sửa contract.representativeCccd
        if (occupant.isRepresentative && cccdChanged && occupant.userId) {
            await Occupant.updateMany(
                {
                    userId: occupant.userId,
                    isRepresentative: true,
                    _id: { $ne: occupant._id },
                    cccd: oldCccd,
                },
                { cccd: targetCccd },
                { session },
            );
        }

        await audit(
            {
                actorId: userId,
                action: AUDIT_ACTION.UPDATE_OCCUPANT,
                targetType: 'occupants',
                targetId: occupant._id,
                reason: 'Cập nhật thông tin cư dân',
                metadata: { before, after },
            },
            session,
        );
    });

    return getOccupantById({ userId, roleId, occupantId: occupant._id });
};

/**
 * Thêm người ở cùng vào hợp đồng đang hiệu lực (UC-32)
 */
export const addOccupant = async ({ managerId, contractId, data }) => {
    const contract = await Contract.findById(contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    const { room } = await verifyManagerScopeByContract(managerId, contract);

    if (contract.status !== CONTRACT_STATUS.ACTIVE) {
        throw new AppError('Chỉ thêm được người ở cùng khi hợp đồng đang hiệu lực', 400);
    }

    const roomType = await RoomType.findOne({ _id: room.roomTypeId, isDeleted: false }).lean();
    if (!roomType) {
        throw new AppError('Loại phòng không hợp lệ', 400);
    }

    // Kiểm tra sức chứa phòng (tính cả người đại diện và người ở cùng đang STAYED)
    const currentStayedCount = await Occupant.countDocuments({
        contractId: contract._id,
        status: OCCUPANT_STATUS.STAYED,
    });

    if (currentStayedCount >= roomType.capacity) {
        throw new AppError(`Phòng đã đạt sức chứa tối đa (${roomType.capacity} người)`, 400);
    }

    const cleanCccd = String(data.cccd || '').trim();
    const cleanPhone = String(data.phone || '').trim();
    const parsedDob = new Date(data.dateOfBirth);
    const parsedJoinDate = data.joinDate ? new Date(data.joinDate) : new Date();

    // Kiểm tra CCCD đủ 12 chữ số
    if (!isCccd(cleanCccd)) {
        throw new AppError('Số CCCD phải gồm đúng 12 chữ số', 400);
    }

    // Kiểm tra CCCD đã có trong hợp đồng ACTIVE chưa (dựa trên bảng occupants, không dựa vào contract.representativeCccd)
    const existingInContract = await Occupant.findOne({
        contractId: contract._id,
        cccd: cleanCccd,
    });
    if (existingInContract) {
        throw new AppError('CCCD đã tồn tại trong danh sách cư dân của phòng', 400);
    }

    // Kiểm tra CCCD đang ở phòng khác
    const stayedOther = await Occupant.findOne({
        cccd: cleanCccd,
        status: OCCUPANT_STATUS.STAYED,
        contractId: { $ne: contract._id },
    });
    if (stayedOther) {
        const otherContract = await Contract.findById(stayedOther.contractId).select('status').lean();
        if (otherContract?.status === CONTRACT_STATUS.ACTIVE) {
            throw new AppError('Người mang số CCCD này hiện đang ở phòng khác', 400);
        }
    }

    // Kiểm tra SĐT không trùng người khác
    const phoneInManager = await Manager.findOne({ phone: cleanPhone });
    const phoneInOccupant = await Occupant.findOne({
        phone: cleanPhone,
        cccd: { $ne: cleanCccd },
    });
    if (phoneInManager || phoneInOccupant) {
        throw new AppError('Số điện thoại đã tồn tại trong hệ thống', 409);
    }

    let createdOccupant = null;

    await withTransaction(async (session) => {
        const [newOccupant] = await Occupant.create(
            [
                {
                    contractId: contract._id,
                    isRepresentative: false,
                    name: data.name.trim(),
                    cccd: cleanCccd,
                    phone: cleanPhone,
                    dateOfBirth: parsedDob,
                    address: data.address?.trim() || undefined,
                    relationship: data.relationship?.trim() || undefined,
                    cccdFrontImage: data.cccdFrontImage?.trim() || undefined,
                    cccdBackImage: data.cccdBackImage?.trim() || undefined,
                    status: OCCUPANT_STATUS.STAYED,
                    joinDate: parsedJoinDate,
                },
            ],
            { session },
        );

        createdOccupant = newOccupant;

        await audit(
            {
                actorId: managerId,
                action: AUDIT_ACTION.ADD_OCCUPANT,
                targetType: 'occupants',
                targetId: newOccupant._id,
                reason: `Thêm người ở cùng vào phòng ${room.roomNumber}`,
                metadata: {
                    contractId: contract._id,
                    roomId: room._id,
                    name: newOccupant.name,
                    cccd: newOccupant.cccd,
                    phone: newOccupant.phone,
                    relationship: newOccupant.relationship || null,
                    joinDate: newOccupant.joinDate,
                },
            },
            session,
        );
    });

    return getOccupantById({
        userId: managerId,
        roleId: ROLE.MANAGER,
        occupantId: createdOccupant._id,
    });
};

/**
 * Rút tên người ở cùng khỏi phòng (UC-33)
 * - Chỉ rút được người ở cùng (không phải đại diện) thuộc hợp đồng ACTIVE trong tòa của Manager
 * - Đánh dấu status = LEFT + exitDate, không xóa bản ghi
 */
export const leaveOccupant = async ({ managerId, occupantId, data = {} }) => {
    const occupant = await Occupant.findById(occupantId);
    if (!occupant) {
        throw new AppError('Không tìm thấy cư dân', 404);
    }

    const contract = await Contract.findById(occupant.contractId);
    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng của cư dân', 404);
    }

    const { room } = await verifyManagerScopeByContract(managerId, contract);

    if (contract.status !== CONTRACT_STATUS.ACTIVE) {
        throw new AppError('Chỉ rút tên được người ở cùng khi hợp đồng đang hiệu lực', 400);
    }

    if (occupant.isRepresentative) {
        throw new AppError(
            'Không thể xóa người đại diện theo luồng này — vui lòng dùng chấm dứt hợp đồng',
            400,
        );
    }

    if (occupant.status === OCCUPANT_STATUS.LEFT) {
        throw new AppError('Người này đã chuyển đi', 400);
    }

    const parsedExitDate = data.exitDate ? new Date(data.exitDate) : new Date();
    if (startOfVietnamDay(parsedExitDate) < startOfVietnamDay(occupant.joinDate)) {
        throw new AppError('Ngày chuyển ra không được trước ngày bắt đầu ở', 400);
    }

    const note = data.note?.trim() || undefined;

    await withTransaction(async (session) => {
        occupant.status = OCCUPANT_STATUS.LEFT;
        occupant.exitDate = parsedExitDate;
        await occupant.save({ session });

        await audit(
            {
                actorId: managerId,
                action: AUDIT_ACTION.REMOVE_OCCUPANT,
                targetType: 'occupants',
                targetId: occupant._id,
                reason: note || 'Rút tên người ở cùng khỏi phòng',
                metadata: {
                    contractId: contract._id,
                    roomId: room._id,
                    name: occupant.name,
                    cccd: occupant.cccd,
                    exitDate: parsedExitDate,
                    note: note || null,
                },
            },
            session,
        );
    });

    return getOccupantById({
        userId: managerId,
        roleId: ROLE.MANAGER,
        occupantId: occupant._id,
    });
};
