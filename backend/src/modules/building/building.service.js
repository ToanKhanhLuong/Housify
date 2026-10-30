// Service cho module building (UC-12, UC-13, UC-14, UC-15, UC-23)
import Building from '../../models/Building.js';
import Contract from '../../models/Contract.js';
import Room from '../../models/Room.js';
import Occupant from '../../models/Occupant.js';
import Manager from '../../models/Manager.js';
import { AppError } from '../../utils/AppError.js';
import {
  ROLE,
  CONTRACT_STATUS,
  ROOM_STATUS,
  NOTIFICATION_TYPE,
  OCCUPANT_STATUS,
} from '../../constants/enums.js';
import { withTransaction } from '../../helpers/withTransaction.js';
import { notify } from '../../helpers/notify.js';
import { escapeRegex } from '../../helpers/filter.js';

// So tên không phân biệt hoa thường, khớp nguyên chuỗi (BR-034)
const sameNameFilter = (name) => ({
  $regex: new RegExp(`^${escapeRegex(name)}$`, 'i'),
});

// Thêm roomStats { total, available, occupied, maintenance } và manager { _id, name } | null cho từng tòa
const withDetails = async (buildings) => {
  if (buildings.length === 0) return [];
  const buildingIds = buildings.map((building) => building._id);
  const managerIds = buildings
    .map((building) => building.managerId)
    .filter(Boolean);

  const [stats, managers] = await Promise.all([
    Room.aggregate([
      { $match: { buildingId: { $in: buildingIds }, isDeleted: false } },
      {
        $group: {
          _id: { buildingId: '$buildingId', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]),
    Manager.find({ userId: { $in: managerIds } })
      .select('userId name')
      .lean(),
  ]);

  const statsByBuilding = new Map();
  for (const item of stats) {
    const bId = String(item._id.buildingId);
    if (!statsByBuilding.has(bId)) {
      statsByBuilding.set(bId, { total: 0, available: 0, occupied: 0, maintenance: 0 });
    }
    const bStats = statsByBuilding.get(bId);
    const status = item._id.status;
    const count = item.count;
    bStats.total += count;
    if (status === ROOM_STATUS.AVAILABLE) bStats.available += count;
    else if (status === ROOM_STATUS.OCCUPIED) bStats.occupied += count;
    else if (status === ROOM_STATUS.MAINTENANCE) bStats.maintenance += count;
  }

  const managerByUser = new Map(
    managers.map((manager) => [String(manager.userId), manager]),
  );

  return buildings.map((building) => {
    const manager = building.managerId
      ? managerByUser.get(String(building.managerId))
      : null;
    const roomStats = statsByBuilding.get(String(building._id)) || {
      total: 0,
      available: 0,
      occupied: 0,
      maintenance: 0,
    };

    return {
      ...building.toObject(),
      roomStats,
      manager: manager ? { _id: building.managerId, name: manager.name } : null,
    };
  });
};

const withDetail = async (building) => (await withDetails([building]))[0];

// 1. Tạo tòa nhà (UC-12)
export const createBuilding = async (data) => {
  const name = data.name.trim();

  // Kiểm tra tên đã tồn tại chưa
  const existing = await Building.findOne({
    name: sameNameFilter(name),
    isDeleted: false,
  });

  if (existing) {
    throw new AppError('Tên tòa nhà đã tồn tại', 409);
  }

  // Lưu tòa nhà vào MongoDB
  const building = await Building.create({
    name,
    address: data.address.trim(),
    description: data.description,
    images: data.images || [],
    floorCount: data.floorCount,
  });

  return withDetail(building);
};

// 2. Lấy danh sách tòa nhà (UC-13)
export const getBuildings = async (query = {}, user) => {
  const filter = { isDeleted: false };

  // Manager chỉ xem tòa nhà mình quản lý
  if (user.role === ROLE.MANAGER) {
    filter.managerId = user.id;
  }

  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: regex }, { address: regex }];
  }

  if (query.hasManager === 'true') {
    filter.managerId = { $exists: true, $ne: null };
  } else if (query.hasManager === 'false') {
    filter.managerId = null;
  }

  // Sắp theo tên tăng dần
  const buildings = await Building.find(filter).sort({ name: 1 });

  return withDetails(buildings);
};

// 3. Lấy chi tiết tòa nhà (UC-13)
export const getBuildingById = async (id, user) => {
  // Tìm tòa nhà chưa bị xóa
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError('Tòa nhà không tồn tại', 404);
  }

  // Manager chỉ xem tòa mình phụ trách
  if (user.role === ROLE.MANAGER) {
    if (String(building.managerId) !== String(user.id)) {
      throw new AppError('Bạn không có quyền xem tòa nhà này', 403);
    }
  }

  return withDetail(building);
};

// 4. Cập nhật tòa nhà (UC-13)
export const updateBuilding = async (id, data) => {
  // Tìm tòa nhà chưa bị xóa
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError('Tòa nhà không tồn tại', 404);
  }

  // Nếu đổi tên thì kiểm tra trùng
  if (data.name !== undefined) {
    const name = data.name.trim();

    if (name.toLowerCase() !== building.name.toLowerCase()) {
      const existing = await Building.findOne({
        name: sameNameFilter(name),
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existing) {
        throw new AppError('Tên tòa nhà đã tồn tại', 409);
      }
    }

    building.name = name;
  }

  // Cập nhật các thông tin còn lại
  if (data.address !== undefined) {
    building.address = data.address.trim();
  }

  if (data.description !== undefined) {
    building.description = data.description;
  }

  if (data.images !== undefined) {
    building.images = data.images;
  }

  // Lưu thay đổi vào MongoDB
  await building.save();

  return withDetail(building);
};

// 5. Xóa mềm tòa nhà (UC-14)
export const deleteBuilding = async (id) => {
  // Tìm tòa nhà
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError('Tòa nhà không tồn tại', 404);
  }

  // Không cho xóa nếu còn Manager
  if (building.managerId) {
    throw new AppError('Vui lòng gỡ Manager trước khi xóa', 400);
  }

  // Kiểm tra hợp đồng và xóa mềm trong cùng 1 transaction: lỗi giữa chừng thì không thay đổi gì
  const now = new Date();

  await withTransaction(async (session) => {
    // Lấy danh sách phòng thuộc tòa nhà
    const rooms = await Room.find({ buildingId: id, isDeleted: false }).session(session);

    // Tìm các phòng đang có hợp đồng DRAFT hoặc ACTIVE
    if (rooms.length > 0) {
      const roomIds = rooms.map((r) => r._id);
      const activeContracts = await Contract.find({
        roomId: { $in: roomIds },
        status: { $in: [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE] },
      }).session(session);

      if (activeContracts.length > 0) {
        const busyRoomIds = new Set(activeContracts.map((c) => String(c.roomId)));
        const busyRoomNumbers = rooms
          .filter((r) => busyRoomIds.has(String(r._id)))
          .map((r) => r.roomNumber)
          .join(', ');

        throw new AppError(
          `Không thể xóa vì các phòng sau đang có hợp đồng: ${busyRoomNumbers}`,
          400,
        );
      }

      // Xóa mềm toàn bộ phòng của tòa nhà
      await Room.updateMany(
        { buildingId: id, isDeleted: false },
        { isDeleted: true, deletedAt: now },
        { session },
      );
    }

    // Xóa mềm tòa nhà
    building.isDeleted = true;
    building.deletedAt = now;
    await building.save({ session });
  });

  return { message: 'Xóa tòa nhà thành công' };
};

// 6. Lấy danh sách tầng và thống kê số phòng mỗi tầng (UC-15)
export const getBuildingFloors = async (id, user) => {
  const building = await getBuildingById(id, user);

  // Đếm số phòng và trạng thái từng phòng theo từng tầng (chỉ tính phòng chưa xóa)
  const roomStats = await Room.aggregate([
    { $match: { buildingId: building._id, isDeleted: false } },
    {
      $group: {
        _id: { floorNumber: '$floorNumber', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Gom dữ liệu theo tầng
  const floorMap = {};
  for (const item of roomStats) {
    const floor = item._id.floorNumber;
    const status = item._id.status;
    const count = item.count;

    if (!floorMap[floor]) {
      floorMap[floor] = {
        total: 0,
        AVAILABLE: 0,
        OCCUPIED: 0,
        MAINTENANCE: 0,
      };
    }
    floorMap[floor].total += count;
    floorMap[floor][status] = (floorMap[floor][status] || 0) + count;
  }

  // Trả về đủ các tầng từ 1 đến floorCount
  const floors = [];
  for (let i = 1; i <= building.floorCount; i++) {
    const stats = floorMap[i] || {
      total: 0,
      AVAILABLE: 0,
      OCCUPIED: 0,
      MAINTENANCE: 0,
    };
    floors.push({
      floorNumber: i,
      roomCount: stats.total,
      statusCounts: {
        AVAILABLE: stats.AVAILABLE,
        OCCUPIED: stats.OCCUPIED,
        MAINTENANCE: stats.MAINTENANCE,
      },
    });
  }

  return floors;
};

// 7. Cập nhật số tầng / xóa tầng trên cùng (UC-15)
export const updateFloorCount = async (id, floorCount) => {
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError('Tòa nhà không tồn tại', 404);
  }

  // BR-042: Không được giảm xuống dưới tầng cao nhất đang có phòng
  const blockedRooms = await Room.find({
    buildingId: id,
    isDeleted: false,
    floorNumber: { $gt: floorCount },
  });

  if (blockedRooms.length > 0) {
    throw new AppError(
      `Không thể giảm số tầng: còn ${blockedRooms.length} phòng ở các tầng bị bỏ`,
      400,
    );
  }

  building.floorCount = floorCount;
  await building.save();

  return withDetail(building);
};

// 8. Lấy nội quy tòa nhà (UC-23 - Admin xem mọi tòa, Manager xem tòa mình, Customer xem tòa đang ở)
export const getBuildingRules = async (id, user) => {
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError('Tòa nhà không tồn tại', 404);
  }

  // Manager chỉ xem nội quy tòa mình phụ trách
  if (user.role === ROLE.MANAGER) {
    if (String(building.managerId) !== String(user.id)) {
      throw new AppError('Bạn không có quyền xem nội quy của tòa nhà này', 403);
    }
  }

  // Customer chỉ xem nội quy tòa nhà mình đang ở
  if (user.role === ROLE.CUSTOMER) {
    const occupant = await Occupant.findOne({
      userId: user.id,
      status: OCCUPANT_STATUS.STAYED,
    });

    if (!occupant) {
      throw new AppError('Bạn chưa có phòng đang thuê', 403);
    }

    const contract = await Contract.findOne({
      _id: occupant.contractId,
      status: CONTRACT_STATUS.ACTIVE,
    });

    if (!contract) {
      throw new AppError('Bạn không có hợp đồng đang hiệu lực', 403);
    }

    const room = await Room.findById(contract.roomId);
    if (!room || String(room.buildingId) !== String(id)) {
      throw new AppError('Bạn chỉ được xem nội quy của tòa nhà mình đang ở', 403);
    }
  }

  return { rules: building.rules || '' };
};

// 9. Cập nhật / Ghi đè nội quy tòa nhà (UC-23 - Chỉ Admin)
export const updateBuildingRules = async (id, rules, user) => {
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError('Tòa nhà không tồn tại', 404);
  }

  // Cập nhật và lưu đè nội quy
  building.rules = rules.trim();
  await building.save();

  // Báo Manager của tòa nếu tòa đã có Manager (UC-23)
  if (building.managerId) {
    await notify({
      userIds: building.managerId,
      type: NOTIFICATION_TYPE.ANNOUNCEMENT,
      title: 'Nội quy mới',
      message: `Tòa ${building.name} vừa cập nhật nội quy`,
      refId: building._id,
      createdBy: user.id,
    });
  }

  return { rules: building.rules };
};
