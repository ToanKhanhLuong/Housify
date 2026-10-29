// Service cho module building (UC-12, UC-13, UC-14, UC-15)
import Building from "../../models/Building.js";
import Contract from "../../models/Contract.js";
import Room from "../../models/Room.js";
import { AppError } from "../../utils/AppError.js";
import { ROLE, CONTRACT_STATUS, ROOM_STATUS } from "../../constants/enums.js";
import { withTransaction } from "../../helpers/withTransaction.js";

// 1. Tạo tòa nhà (UC-12)
export const createBuilding = async (data) => {
  const name = data.name.trim();

  // Kiểm tra tên đã tồn tại chưa
  const existing = await Building.findOne({
    name,
    isDeleted: false,
  });

  if (existing) {
    throw new AppError("Tên tòa nhà đã tồn tại", 409);
  }

  // Lưu tòa nhà vào MongoDB
  const building = await Building.create({
    name,
    address: data.address.trim(),
    description: data.description,
    images: data.images || [],
    floorCount: data.floorCount ?? 1,
  });

  return building;
};

// 2. Lấy danh sách tòa nhà (UC-13)
export const getBuildings = async (user) => {
  const filter = { isDeleted: false };

  // Manager chỉ xem tòa nhà mình quản lý
  if (user.role === ROLE.MANAGER) {
    filter.managerId = user.id;
  }

  const buildings = await Building.find(filter);

  return buildings;
};

// 3. Lấy chi tiết tòa nhà (UC-13)
export const getBuildingById = async (id, user) => {
  // Tìm tòa nhà chưa bị xóa
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError("Tòa nhà không tồn tại", 404);
  }

  // Manager chỉ xem tòa mình phụ trách
  if (user.role === ROLE.MANAGER) {
    if (String(building.managerId) !== String(user.id)) {
      throw new AppError("Bạn không có quyền xem tòa nhà này", 403);
    }
  }

  return building;
};

// 4. Cập nhật tòa nhà (UC-13)
export const updateBuilding = async (id, data) => {
  // Tìm tòa nhà chưa bị xóa
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError("Tòa nhà không tồn tại", 404);
  }

  // Nếu đổi tên thì kiểm tra trùng
  if (data.name !== undefined) {
    const name = data.name.trim();

    if (name !== building.name) {
      const existing = await Building.findOne({
        name,
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existing) {
        throw new AppError("Tên tòa nhà đã tồn tại", 409);
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

  return building;
};

// 5. Xóa mềm tòa nhà (UC-14)
export const deleteBuilding = async (id) => {
  // Tìm tòa nhà
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError("Tòa nhà không tồn tại", 404);
  }

  // Không cho xóa nếu còn Manager
  if (building.managerId) {
    throw new AppError("Vui lòng gỡ Manager trước khi xóa", 400);
  }

  // Lấy danh sách phòng thuộc tòa nhà
  const rooms = await Room.find({
    buildingId: id,
    isDeleted: false,
  });

  const roomIds = rooms.map((room) => room._id);

  // Kiểm tra hợp đồng DRAFT hoặc ACTIVE
  const activeContracts = await Contract.find({
    roomId: { $in: roomIds },
    status: { $in: [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE] },
  }).populate("roomId", "roomNumber");

  if (activeContracts.length > 0) {
    const stuckRooms = activeContracts.map((c) => c.roomId.roomNumber);

    throw new AppError(
      `Không thể xóa vì các phòng sau đang có hợp đồng: ${stuckRooms.join(", ")}`,
      400,
    );
  }

  // Xóa mềm tòa nhà và các phòng cùng lúc
  const now = new Date();

  await withTransaction(async (session) => {
    building.isDeleted = true;
    building.deletedAt = now;

    await building.save({ session });

    await Room.updateMany(
      { buildingId: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: now } },
      { session },
    );
  });

  return { message: "Xóa tòa nhà thành công" };
};

// 6. Lấy danh sách tầng và thống kê số phòng mỗi tầng (UC-15)
export const getBuildingFloors = async (id, user) => {
  // Kiểm tra tòa nhà tồn tại
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError("Tòa nhà không tồn tại", 404);
  }

  // Manager chỉ xem tầng của tòa mình phụ trách
  if (user.role === ROLE.MANAGER) {
    if (String(building.managerId) !== String(user.id)) {
      throw new AppError("Bạn không có quyền xem tòa nhà này", 403);
    }
  }

  // Lấy danh sách phòng chưa bị xóa của tòa nhà
  const rooms = await Room.find({
    buildingId: id,
    isDeleted: false,
  });

  // Sinh danh sách từ tầng 1 đến floorCount
  const floors = [];
  for (let i = 1; i <= building.floorCount; i++) {
    const floorRooms = rooms.filter((room) => room.floorNumber === i);
    const countOf = (status) =>
      floorRooms.filter((room) => room.status === status).length;

    floors.push({
      floorNumber: i,
      roomCount: floorRooms.length,
      statusCounts: {
        [ROOM_STATUS.AVAILABLE]: countOf(ROOM_STATUS.AVAILABLE),
        [ROOM_STATUS.OCCUPIED]: countOf(ROOM_STATUS.OCCUPIED),
        [ROOM_STATUS.MAINTENANCE]: countOf(ROOM_STATUS.MAINTENANCE),
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
    throw new AppError("Tòa nhà không tồn tại", 404);
  }

  // BR-042: Không giảm số tầng xuống dưới tầng cao nhất đang có phòng
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

  return building;
};
