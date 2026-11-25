// Service cho module roomType (UC-20)
import RoomType from '../../models/RoomType.js';
import Room from '../../models/Room.js';
import { AppError } from '../../utils/AppError.js';
import { CONTRACT_STATUS } from '../../constants/enums.js';
import { escapeRegex } from '../../helpers/filter.js';
import { getRequiredCapacityByRoom } from '../../helpers/customerRestriction.js';

// So tên không phân biệt hoa thường, khớp nguyên chuỗi
const sameNameFilter = (name) => ({
  $regex: new RegExp(`^${escapeRegex(name)}$`, 'i'),
});

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

  // Sửa capacity: kiểm tra cả số cư dân đang ở (ACTIVE) lẫn số chỗ tối thiểu của hợp đồng nháp (DRAFT)
  const rooms = await Room.find({
    roomTypeId: id,
    isDeleted: false,
  });

  const capacityMap = await getRequiredCapacityByRoom(rooms.map((room) => room._id));
  for (const room of rooms) {
    const requirement = capacityMap.get(String(room._id));
    if (requirement && requirement.required > data.capacity) {
      const message =
        requirement.contractStatus === CONTRACT_STATUS.DRAFT
          ? `Sức chứa mới nhỏ hơn số người của hợp đồng nháp đang chờ ký tại phòng ${room.roomNumber} (${requirement.required} người)`
          : requirement.contractStatus === CONTRACT_STATUS.UPCOMING
          ? `Sức chứa mới nhỏ hơn số người của hợp đồng sắp hiệu lực tại phòng ${room.roomNumber} (${requirement.required} người)`
          : `Sức chứa mới nhỏ hơn số người đang ở của phòng ${room.roomNumber} (${requirement.required} người)`;
      throw new AppError(message, 400);
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
