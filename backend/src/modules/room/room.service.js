// Service cho module room (UC-16, UC-17, UC-18, UC-19)
import Room from '../../models/Room.js';
import Building from '../../models/Building.js';
import RoomType from '../../models/RoomType.js';
import Contract from '../../models/Contract.js';
import Occupant from '../../models/Occupant.js';
import { AppError } from '../../utils/AppError.js';
import {
  ROLE,
  ROOM_STATUS,
  CONTRACT_STATUS,
  OCCUPANT_STATUS,
} from '../../constants/enums.js';
import { escapeRegex } from '../../helpers/filter.js';

// Tìm tòa chưa xóa; Manager chỉ được thao tác trên tòa mình phụ trách
const findBuilding = async (buildingId, user) => {
  const building = await Building.findOne({
    _id: buildingId,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError('Tòa nhà không tồn tại', 404);
  }

  if (user.role === ROLE.MANAGER) {
    if (String(building.managerId) !== String(user.id)) {
      throw new AppError('Bạn không có quyền xem phòng của tòa này', 403);
    }
  }

  return building;
};

// Tìm phòng chưa xóa (và tòa của phòng chưa xóa)
const findRoom = async (id, user) => {
  const room = await Room.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!room) {
    throw new AppError('Phòng không tồn tại', 404);
  }

  const building = await findBuilding(room.buildingId, user);
  return { room, building };
};

// Loại phòng phải còn hoạt động (UC-16, UC-17)
const ensureRoomTypeExists = async (roomTypeId) => {
  const roomType = await RoomType.findOne({
    _id: roomTypeId,
    isDeleted: false,
  });

  if (!roomType) {
    throw new AppError('Loại phòng không tồn tại', 422, [
      { field: 'roomTypeId', message: 'Loại phòng không tồn tại' },
    ]);
  }

  return roomType;
};

// Tầng phải nằm trong 1..floorCount của tòa
const ensureFloorInBuilding = (floorNumber, building) => {
  if (floorNumber > building.floorCount) {
    throw new AppError(
      `Tầng phải nằm trong khoảng 1 đến ${building.floorCount}`,
      400,
    );
  }
};

// Hợp đồng DRAFT hoặc ACTIVE của phòng (BR-061: tối đa 1 hợp đồng)
const findOpenContract = (roomId) =>
  Contract.findOne({
    roomId,
    status: { $in: [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE] },
  });

// TODO: Đếm cư dân STAYED thuộc hợp đồng ACTIVE của phòng. Iter 1 chưa có hợp đồng nên luôn ra 0.
const countStayingOccupants = async (roomId) => {
  try {
    const contract = await Contract.findOne({
      roomId,
      status: CONTRACT_STATUS.ACTIVE,
    });

    if (!contract) {
      return 0;
    }

    return Occupant.countDocuments({
      contractId: contract._id,
      status: OCCUPANT_STATUS.STAYED,
    });
  } catch {
    return 0;
  }
};

// Thêm building { _id, name, floorCount }, roomType { _id, name, capacity }, occupantCount cho từng phòng
const withDetails = async (rooms) => {
  if (rooms.length === 0) return [];
  const buildingIds = rooms.map((room) => room.buildingId);
  const roomTypeIds = rooms.map((room) => room.roomTypeId);
  const roomIds = rooms.map((room) => room._id);

  const [buildings, roomTypes, occupantCounts] = await Promise.all([
    Building.find({ _id: { $in: buildingIds } })
      .select('name floorCount')
      .lean(),
    RoomType.find({ _id: { $in: roomTypeIds } })
      .select('name capacity')
      .lean(),
    Promise.all(roomIds.map((id) => countStayingOccupants(id))),
  ]);

  const buildingById = new Map(
    buildings.map((building) => [String(building._id), building]),
  );
  const roomTypeById = new Map(
    roomTypes.map((roomType) => [
      String(roomType._id),
      { _id: roomType._id, name: roomType.name, capacity: roomType.capacity },
    ]),
  );

  return rooms.map((room, index) => {
    const obj = room.toObject ? room.toObject() : { ...room };
    delete obj.capacity;
    return {
      ...obj,
      occupantCount: occupantCounts[index] ?? 0,
      building: buildingById.get(String(room.buildingId)) ?? null,
      roomType: roomTypeById.get(String(room.roomTypeId)) ?? null,
    };
  });
};

const withDetail = async (room) => (await withDetails([room]))[0];

// 1. Lấy danh sách phòng của một tòa (UC-19)
export const getRooms = async (buildingId, query, user) => {
  const building = await findBuilding(buildingId, user);

  const filter = { buildingId, isDeleted: false };

  // q: tìm theo mã phòng
  if (query.q) {
    filter.roomNumber = { $regex: escapeRegex(query.q), $options: 'i' };
  }

  // status: nhiều giá trị, trong AVAILABLE / OCCUPIED / MAINTENANCE
  if (query.status && query.status.length > 0) {
    filter.status = { $in: query.status };
  }

  // floor: nhiều giá trị, mỗi số trong khoảng 1..floorCount của tòa
  if (query.floor && query.floor.length > 0) {
    for (const f of query.floor) {
      if (f < 1 || f > building.floorCount) {
        throw new AppError('Giá trị lọc không hợp lệ', 422, [
          { field: 'floor', message: `Tầng phải nằm trong khoảng 1 đến ${building.floorCount}` },
        ]);
      }
    }
    filter.floorNumber = { $in: query.floor };
  }

  // roomTypeId: nhiều giá trị
  if (query.roomTypeId && query.roomTypeId.length > 0) {
    filter.roomTypeId = { $in: query.roomTypeId };
  }

  // minPrice, maxPrice: số ≥ 0 so với rentPrice
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.rentPrice = {};
    if (query.minPrice !== undefined) {
      filter.rentPrice.$gte = Number(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      filter.rentPrice.$lte = Number(query.maxPrice);
    }
  }

  // Sắp xếp: floorNumber tăng dần, rồi roomNumber
  const rooms = await Room.find(filter).sort({ floorNumber: 1, roomNumber: 1 });

  return withDetails(rooms);
};

// 2. Lấy chi tiết phòng (UC-19)
export const getRoomById = async (id, user) => {
  const { room } = await findRoom(id, user);
  return withDetail(room);
};

// 3. Tạo phòng (UC-16 - Chỉ Admin)
export const createRoom = async (buildingId, data, user) => {
  const building = await findBuilding(buildingId, user);
  const roomNumber = data.roomNumber.trim();

  // Kiểm tra rentPrice, deposit > 0 ở service
  if (data.rentPrice !== undefined && Number(data.rentPrice) <= 0) {
    throw new AppError('Giá thuê phải lớn hơn 0', 422, [
      { field: 'rentPrice', message: 'Giá thuê phải lớn hơn 0' },
    ]);
  }
  if (data.deposit !== undefined && Number(data.deposit) <= 0) {
    throw new AppError('Tiền cọc phải lớn hơn 0', 422, [
      { field: 'deposit', message: 'Tiền cọc phải lớn hơn 0' },
    ]);
  }

  ensureFloorInBuilding(data.floorNumber, building);
  await ensureRoomTypeExists(data.roomTypeId);

  // BR-043: mã phòng duy nhất trong tòa, phòng đã xóa không tính (BR-050)
  const existing = await Room.findOne({
    buildingId,
    roomNumber: { $regex: new RegExp(`^${escapeRegex(roomNumber)}$`, 'i') },
    isDeleted: false,
  });

  if (existing) {
    throw new AppError('Mã phòng đã tồn tại trong tòa nhà', 409);
  }

  // Phòng mới luôn ở trạng thái Trống (BR-044), không còn lưu capacity
  const room = await Room.create({
    buildingId,
    roomNumber,
    floorNumber: data.floorNumber,
    roomTypeId: data.roomTypeId,
    area: data.area,
    rentPrice: data.rentPrice,
    deposit: data.deposit,
    images: data.images || [],
    status: ROOM_STATUS.AVAILABLE,
  });

  return withDetail(room);
};

// 4. Cập nhật phòng (UC-17 - Chỉ Admin). Không sửa mã phòng (BR-046)
export const updateRoom = async (id, data, user) => {
  const { room, building } = await findRoom(id, user);

  // Kiểm tra rentPrice, deposit > 0 ở service
  if (data.rentPrice !== undefined && Number(data.rentPrice) <= 0) {
    throw new AppError('Giá thuê phải lớn hơn 0', 422, [
      { field: 'rentPrice', message: 'Giá thuê phải lớn hơn 0' },
    ]);
  }
  if (data.deposit !== undefined && Number(data.deposit) <= 0) {
    throw new AppError('Tiền cọc phải lớn hơn 0', 422, [
      { field: 'deposit', message: 'Tiền cọc phải lớn hơn 0' },
    ]);
  }

  if (data.floorNumber !== undefined) {
    ensureFloorInBuilding(data.floorNumber, building);
    room.floorNumber = data.floorNumber;
  }

  // Đổi loại phòng: capacity của loại mới phải ≥ số người đang ở
  if (data.roomTypeId !== undefined) {
    const newRoomType = await ensureRoomTypeExists(data.roomTypeId);
    if (String(room.roomTypeId) !== String(data.roomTypeId)) {
      const occupantCount = await countStayingOccupants(room._id);
      if (newRoomType.capacity < occupantCount) {
        throw new AppError(
          `Loại phòng mới không đủ chỗ cho số người đang ở (${occupantCount} người)`,
          400,
        );
      }
      room.roomTypeId = data.roomTypeId;
    }
  }

  // Đổi trạng thái: chỉ Trống ↔ Bảo trì, Đang thuê do hợp đồng quyết định (BR-052)
  if (data.status !== undefined && data.status !== room.status) {
    if (room.status === ROOM_STATUS.OCCUPIED) {
      throw new AppError('Phòng đang thuê, không thể đổi trạng thái', 400);
    }

    // UC-17 A2: phòng còn hợp đồng nháp thì không chuyển sang Bảo trì
    if (data.status === ROOM_STATUS.MAINTENANCE) {
      const draftContract = await Contract.findOne({
        roomId: room._id,
        status: CONTRACT_STATUS.DRAFT,
      });

      if (draftContract) {
        throw new AppError(
          'Phòng đang có hợp đồng nháp, Manager cần hủy hợp đồng nháp trước khi chuyển sang Bảo trì',
          400,
        );
      }
    }

    room.status = data.status;
  }

  if (data.area !== undefined) {
    room.area = data.area;
  }

  if (data.rentPrice !== undefined) {
    room.rentPrice = data.rentPrice;
  }

  if (data.deposit !== undefined) {
    room.deposit = data.deposit;
  }

  if (data.images !== undefined) {
    room.images = data.images;
  }

  await room.save();

  return withDetail(room);
};

// 5. Xóa mềm phòng (UC-18 - Chỉ Admin)
export const deleteRoom = async (id, user) => {
  const { room } = await findRoom(id, user);

  // Chặn khi còn hợp đồng đang hiệu lực hoặc đang nháp
  const contract = await findOpenContract(room._id);

  if (contract?.status === CONTRACT_STATUS.ACTIVE) {
    throw new AppError('Không thể xóa phòng đang có khách thuê', 400);
  }

  if (contract?.status === CONTRACT_STATUS.DRAFT) {
    throw new AppError(
      'Phòng đang có hợp đồng chờ kích hoạt, Manager cần hủy hợp đồng nháp trước khi xóa',
      400,
    );
  }

  room.isDeleted = true;
  room.deletedAt = new Date();
  await room.save();

  return { message: 'Xóa phòng thành công' };
};
