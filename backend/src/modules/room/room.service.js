// Service cho module room (UC-16, UC-17, UC-18, UC-19)
import Room from "../../models/Room.js";
import Building from "../../models/Building.js";
import RoomType from "../../models/RoomType.js";
import Contract from "../../models/Contract.js";
import Occupant from "../../models/Occupant.js";
import { AppError } from "../../utils/AppError.js";
import {
  ROLE,
  ROOM_STATUS,
  CONTRACT_STATUS,
  OCCUPANT_STATUS,
} from "../../constants/enums.js";

// Mã phòng người dùng nhập có thể chứa . ( ) … nên phải escape trước khi đưa vào regex
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Tìm tòa chưa xóa; Manager chỉ được thao tác trên tòa mình phụ trách
const findBuilding = async (buildingId, user) => {
  const building = await Building.findOne({
    _id: buildingId,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError("Tòa nhà không tồn tại", 404);
  }

  if (user.role === ROLE.MANAGER) {
    if (String(building.managerId) !== String(user.id)) {
      throw new AppError("Bạn không có quyền xem phòng của tòa nhà này", 403);
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
    throw new AppError("Phòng không tồn tại", 404);
  }

  const building = await findBuilding(room.buildingId, user);
  return { room, building };
};

// Loại phòng phải còn hoạt động (UC-16: loại đã xóa không chọn được)
const ensureRoomTypeExists = async (roomTypeId) => {
  const roomType = await RoomType.findOne({
    _id: roomTypeId,
    isDeleted: false,
  });

  if (!roomType) {
    throw new AppError("Loại phòng không tồn tại", 404);
  }
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

// Số người đang ở = cư dân STAYED thuộc hợp đồng ACTIVE của phòng
const countStayingOccupants = async (roomId) => {
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
};

// Thêm building { _id, name, floorCount } và roomType { _id, name } cho từng phòng
// Giữ nguyên buildingId, roomTypeId dạng id để FE dùng lại khi sửa
const withDetails = async (rooms) => {
  const buildingIds = rooms.map((room) => room.buildingId);
  const roomTypeIds = rooms.map((room) => room.roomTypeId);

  const [buildings, roomTypes] = await Promise.all([
    Building.find({ _id: { $in: buildingIds } })
      .select("name floorCount")
      .lean(),
    RoomType.find({ _id: { $in: roomTypeIds } })
      .select("name")
      .lean(),
  ]);

  const buildingById = new Map(
    buildings.map((building) => [String(building._id), building]),
  );
  const roomTypeById = new Map(
    roomTypes.map((roomType) => [String(roomType._id), roomType]),
  );

  return rooms.map((room) => ({
    ...room.toObject(),
    building: buildingById.get(String(room.buildingId)) ?? null,
    roomType: roomTypeById.get(String(room.roomTypeId)) ?? null,
  }));
};

const withDetail = async (room) => (await withDetails([room]))[0];

// 1. Lấy danh sách phòng của một tòa (UC-19)
export const getRooms = async (buildingId, query, user) => {
  await findBuilding(buildingId, user);

  const filter = { buildingId, isDeleted: false };

  if (query.floor) {
    filter.floorNumber = query.floor;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.roomTypeId) {
    filter.roomTypeId = query.roomTypeId;
  }

  // Lọc theo khoảng giá thuê
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.rentPrice = {};
    if (query.minPrice !== undefined) {
      filter.rentPrice.$gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      filter.rentPrice.$lte = query.maxPrice;
    }
  }

  // Xếp theo tầng rồi theo mã phòng
  const rooms = await Room.find(filter).sort({ floorNumber: 1, roomNumber: 1 });

  return withDetails(rooms);
};

// 2. Lấy chi tiết phòng (UC-19 – iter 1 chỉ thông tin phòng)
export const getRoomById = async (id, user) => {
  const { room } = await findRoom(id, user);
  return withDetail(room);
};

// 3. Tạo phòng (UC-16 - Chỉ Admin)
export const createRoom = async (buildingId, data, user) => {
  const building = await findBuilding(buildingId, user);
  const roomNumber = data.roomNumber.trim();

  ensureFloorInBuilding(data.floorNumber, building);
  await ensureRoomTypeExists(data.roomTypeId);

  // BR-043: mã phòng duy nhất trong tòa, phòng đã xóa không tính (BR-050)
  const existing = await Room.findOne({
    buildingId,
    roomNumber: { $regex: new RegExp(`^${escapeRegex(roomNumber)}$`, "i") },
    isDeleted: false,
  });

  if (existing) {
    throw new AppError("Mã phòng đã tồn tại trong tòa nhà", 409);
  }

  // Phòng mới luôn ở trạng thái Trống (BR-044)
  const room = await Room.create({
    buildingId,
    roomNumber,
    floorNumber: data.floorNumber,
    roomTypeId: data.roomTypeId,
    area: data.area,
    capacity: data.capacity,
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

  if (data.floorNumber !== undefined) {
    ensureFloorInBuilding(data.floorNumber, building);
    room.floorNumber = data.floorNumber;
  }

  if (data.roomTypeId !== undefined) {
    await ensureRoomTypeExists(data.roomTypeId);
    room.roomTypeId = data.roomTypeId;
  }

  // Sức chứa không được nhỏ hơn số người đang ở
  if (data.capacity !== undefined) {
    const occupantCount = await countStayingOccupants(room._id);

    if (data.capacity < occupantCount) {
      throw new AppError(
        `Sức chứa không được nhỏ hơn số người đang cư trú hiện tại (${occupantCount} người)`,
        400,
      );
    }

    room.capacity = data.capacity;
  }

  // Đổi trạng thái: chỉ Trống ↔ Bảo trì, Đang thuê do hợp đồng quyết định (BR-052)
  if (data.status !== undefined && data.status !== room.status) {
    if (room.status === ROOM_STATUS.OCCUPIED) {
      throw new AppError("Phòng đang thuê, không thể đổi trạng thái", 400);
    }

    // UC-17 A2: phòng còn hợp đồng nháp thì không chuyển sang Bảo trì
    if (data.status === ROOM_STATUS.MAINTENANCE) {
      const draftContract = await Contract.findOne({
        roomId: room._id,
        status: CONTRACT_STATUS.DRAFT,
      });

      if (draftContract) {
        throw new AppError(
          "Phòng đang có hợp đồng nháp, Manager cần hủy hợp đồng nháp trước khi chuyển sang Bảo trì",
          400,
        );
      }
    }

    room.status = data.status;
  }

  // Giá mới chỉ áp dụng cho hợp đồng tạo sau này (hợp đồng đã tạo giữ giá lúc ký)
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
    throw new AppError("Không thể xóa phòng đang có khách thuê", 400);
  }

  if (contract?.status === CONTRACT_STATUS.DRAFT) {
    throw new AppError(
      "Phòng đang có hợp đồng chờ kích hoạt, Manager cần hủy hợp đồng nháp trước khi xóa",
      400,
    );
  }

  room.isDeleted = true;
  room.deletedAt = new Date();
  await room.save();

  return { message: "Xóa phòng thành công" };
};
