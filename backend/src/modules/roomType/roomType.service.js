// Service cho module roomType (UC-20)
import RoomType from "../../models/RoomType.js";
import Room from "../../models/Room.js";
import { AppError } from "../../utils/AppError.js";

// 1. Lấy danh sách loại phòng (UC-20)
export const getRoomTypes = async () => {
  const roomTypes = await RoomType.find({ isDeleted: false }).sort({
    createdAt: -1,
  });
  return roomTypes;
};

// 2. Lấy chi tiết một loại phòng (UC-20)
export const getRoomTypeById = async (id) => {
  const roomType = await RoomType.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!roomType) {
    throw new AppError("Loại phòng không tồn tại", 404);
  }

  return roomType;
};

// 3. Tạo loại phòng mới (UC-20)
export const createRoomType = async (data) => {
  const name = data.name.trim();

  // Kiểm tra tên trùng trong các loại phòng chưa xóa (BR-053)
  const existing = await RoomType.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
    isDeleted: false,
  });

  if (existing) {
    throw new AppError("Tên loại phòng đã tồn tại", 409);
  }

  const roomType = await RoomType.create({ name });
  return roomType;
};

// 4. Cập nhật tên loại phòng (UC-20)
export const updateRoomType = async (id, data) => {
  const roomType = await RoomType.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!roomType) {
    throw new AppError("Loại phòng không tồn tại", 404);
  }

  const name = data.name.trim();

  // Nếu tên thay đổi thì kiểm tra trùng với các loại phòng khác (BR-053)
  if (name.toLowerCase() !== roomType.name.toLowerCase()) {
    const existing = await RoomType.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      isDeleted: false,
      _id: { $ne: id },
    });

    if (existing) {
      throw new AppError("Tên loại phòng đã tồn tại", 409);
    }
  }

  roomType.name = name;
  await roomType.save();

  return roomType;
};

// 5. Xóa mềm loại phòng (UC-20)
export const deleteRoomType = async (id) => {
  const roomType = await RoomType.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!roomType) {
    throw new AppError("Loại phòng không tồn tại", 404);
  }

  // BR-054: Chặn xóa khi loại phòng đang được gán cho phòng còn hoạt động
  const roomCount = await Room.countDocuments({
    roomTypeId: id,
    isDeleted: false,
  });

  if (roomCount > 0) {
    throw new AppError(
      `Không thể xóa loại phòng vì đang có ${roomCount} phòng sử dụng`,
      400,
    );
  }

  // Xóa mềm loại phòng
  roomType.isDeleted = true;
  await roomType.save();

  return { message: "Xóa loại phòng thành công" };
};
