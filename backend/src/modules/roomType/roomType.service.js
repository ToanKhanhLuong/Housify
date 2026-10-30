// Service cho module roomType (UC-20)
import RoomType from '../../models/RoomType.js';
import Room from '../../models/Room.js';
import Contract from '../../models/Contract.js';
import Occupant from '../../models/Occupant.js';
import { AppError } from '../../utils/AppError.js';
import { CONTRACT_STATUS, OCCUPANT_STATUS } from '../../constants/enums.js';
import { escapeRegex } from '../../helpers/filter.js';

// So tên không phân biệt hoa thường, khớp nguyên chuỗi
const sameNameFilter = (name) => ({
  $regex: new RegExp(`^${escapeRegex(name)}$`, 'i'),
});

// TODO: Đếm cư dân STAYED thuộc hợp đồng ACTIVE khi có module hợp đồng ở Iter 2. Iter 1 chưa có hợp đồng nên luôn trả về 0.
const countStayingOccupants = async (roomId) => {
  try {
    const contract = await Contract.findOne({
      roomId,
      status: CONTRACT_STATUS.ACTIVE,
    });
    if (!contract) return 0;
    return Occupant.countDocuments({
      contractId: contract._id,
      status: OCCUPANT_STATUS.STAYED,
    });
  } catch {
    return 0;
  }
};

// 1. Lấy danh sách loại phòng, sắp xếp theo tên tăng dần (UC-20)
export const getRoomTypes = async () => {
  const [roomTypes, roomCounts] = await Promise.all([
    RoomType.find({ isDeleted: false }).sort({ name: 1 }),
    Room.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$roomTypeId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(roomCounts.map((item) => [String(item._id), item.count]));

  return roomTypes.map((rt) => ({
    _id: rt._id,
    name: rt.name,
    capacity: rt.capacity,
    roomCount: countMap.get(String(rt._id)) || 0,
    createdAt: rt.createdAt,
    updatedAt: rt.updatedAt,
  }));
};

// 2. Lấy chi tiết một loại phòng (UC-20)
export const getRoomTypeById = async (id) => {
  const roomType = await RoomType.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!roomType) {
    throw new AppError('Loại phòng không tồn tại', 404);
  }

  const roomCount = await Room.countDocuments({
    roomTypeId: id,
    isDeleted: false,
  });

  return {
    _id: roomType._id,
    name: roomType.name,
    capacity: roomType.capacity,
    roomCount,
    createdAt: roomType.createdAt,
    updatedAt: roomType.updatedAt,
  };
};

// 3. Tạo loại phòng mới (UC-20)
export const createRoomType = async (data) => {
  const name = data.name.trim();

  // Kiểm tra tên trùng trong các loại phòng chưa xóa (BR-053)
  const existing = await RoomType.findOne({
    name: sameNameFilter(name),
    isDeleted: false,
  });

  if (existing) {
    throw new AppError('Tên loại phòng đã tồn tại', 409);
  }

  const roomType = await RoomType.create({
    name,
    capacity: data.capacity,
  });

  return {
    _id: roomType._id,
    name: roomType.name,
    capacity: roomType.capacity,
    roomCount: 0,
    createdAt: roomType.createdAt,
    updatedAt: roomType.updatedAt,
  };
};

// 4. Cập nhật loại phòng (UC-20)
export const updateRoomType = async (id, data) => {
  const roomType = await RoomType.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!roomType) {
    throw new AppError('Loại phòng không tồn tại', 404);
  }

  const name = data.name.trim();

  // Nếu tên thay đổi thì kiểm tra trùng với các loại phòng khác (BR-053)
  if (name.toLowerCase() !== roomType.name.toLowerCase()) {
    const existing = await RoomType.findOne({
      name: sameNameFilter(name),
      isDeleted: false,
      _id: { $ne: id },
    });

    if (existing) {
      throw new AppError('Tên loại phòng đã tồn tại', 409);
    }
  }

  // Sửa capacity: nếu có phòng chưa xóa thuộc loại này có số người đang ở > capacity mới → chặn
  const rooms = await Room.find({
    roomTypeId: id,
    isDeleted: false,
  });

  for (const room of rooms) {
    const occupantCount = await countStayingOccupants(room._id);
    if (occupantCount > data.capacity) {
      throw new AppError(
        `Sức chứa mới nhỏ hơn số người đang ở của phòng ${room.roomNumber} (${occupantCount} người)`,
        400,
      );
    }
  }

  roomType.name = name;
  roomType.capacity = data.capacity;
  await roomType.save();

  return {
    _id: roomType._id,
    name: roomType.name,
    capacity: roomType.capacity,
    roomCount: rooms.length,
    createdAt: roomType.createdAt,
    updatedAt: roomType.updatedAt,
  };
};

// 5. Xóa mềm loại phòng (UC-20)
export const deleteRoomType = async (id) => {
  const roomType = await RoomType.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!roomType) {
    throw new AppError('Loại phòng không tồn tại', 404);
  }

  // BR-054: Chặn xóa khi loại phòng đang được gán cho phòng còn hoạt động
  const roomCount = await Room.countDocuments({
    roomTypeId: id,
    isDeleted: false,
  });

  if (roomCount > 0) {
    throw new AppError(
      `Không thể xóa loại phòng đang được dùng bởi ${roomCount} phòng`,
      400,
    );
  }

  // Xóa mềm loại phòng
  roomType.isDeleted = true;
  await roomType.save();

  return { message: 'Xóa loại phòng thành công' };
};
