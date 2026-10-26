import Building from "../../models/Building.js";
import { AppError } from "../../utils/AppError.js";
import { ROLE, CONTRACT_STATUS } from "../../constants/enums.js";
import Contract from "../../models/Contract.js";
import Room from "../../models/Room.js";
import { withTransaction } from "../../helpers/withTransaction.js";
// Tạo tòa nhà
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

// 2. Lấy danh sách tòa nhà
export const getBuildings = async (user) => {
  const filter = { isDeleted: false };

  // Manager chỉ xem tòa nhà mình quản lý
  if (user.role === ROLE.MANAGER) {
    filter.managerId = user.id;
  }

  const buildings = await Building.find(filter);

  return buildings;
};

// 3. Lấy chi tiết tòa nhà
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

// Cập nhật tòa nhà
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
      // SỬA THÀNH:
      const existing = await Building.findOne({
        name,
        isDeleted: false,
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

// Xóa mềm tòa nhà
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
  const contract = await Contract.findOne({
    roomId: { $in: roomIds },
    status: { $in: [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE] },
  });

  if (contract) {
    throw new AppError(
      "Không thể xóa vì còn hợp đồng nháp hoặc đang hoạt động",
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
