// Dữ liệu giả cho phòng (UC-16..19) khi BE chưa có API – quy tắc theo backend/src/modules/room/room.md
import { ROLE, ROOM_STATUS, CONTRACT_STATUS } from '../constants/enums.js';
import { buildings, rooms, roomTypes, contracts } from './housing.data.js';
import { respond, reject, invalid, newId, now, sameText, currentUser } from './mockHelpers.js';

const findBuilding = (id) => buildings.find((b) => !b.isDeleted && b._id === id);
const findRoom = (id) => rooms.find((r) => !r.isDeleted && r._id === id);
const contractOf = (roomId, status) => contracts.find((c) => c.roomId === roomId && c.status === status);

// Danh sách: populate roomTypeId. Chi tiết: populate thêm buildingId { _id, name, floorCount }
const populateType = (r) => {
  const type = roomTypes.find((t) => t._id === r.roomTypeId);
  return { ...r, roomTypeId: type ? { _id: type._id, name: type.name } : null };
};
const populateAll = (r) => {
  const b = buildings.find((x) => x._id === r.buildingId);
  return { ...populateType(r), buildingId: { _id: b._id, name: b.name, floorCount: b.floorCount } };
};

// Admin xem mọi tòa; Manager chỉ tòa mình
const canView = (building) => {
  const user = currentUser();
  if (!user) return false;
  if (user.role === ROLE.ADMIN) return true;
  return user.role === ROLE.MANAGER && user.building?._id === building._id;
};

const isPositive = (v) => v !== '' && v !== null && v !== undefined && Number(v) > 0;

// Kiểm tra các field chung của tạo / sửa → mảng lỗi [{ field, message }]
const validateFields = (body, building) => {
  const errors = [];
  const floor = Number(body.floorNumber);
  if (!Number.isInteger(floor) || floor < 1 || floor > building.floorCount) {
    errors.push({ field: 'floorNumber', message: `Tầng phải từ 1 đến ${building.floorCount}` });
  }
  if (!roomTypes.some((t) => !t.isDeleted && t._id === body.roomTypeId)) {
    errors.push({ field: 'roomTypeId', message: 'Vui lòng chọn loại phòng' });
  }
  if (!isPositive(body.area)) errors.push({ field: 'area', message: 'Diện tích phải lớn hơn 0' });
  if (!Number.isInteger(Number(body.capacity)) || Number(body.capacity) < 1) {
    errors.push({ field: 'capacity', message: 'Sức chứa phải là số nguyên từ 1 trở lên' });
  }
  if (!isPositive(body.rentPrice)) errors.push({ field: 'rentPrice', message: 'Giá thuê phải lớn hơn 0' });
  if (!isPositive(body.deposit)) errors.push({ field: 'deposit', message: 'Tiền cọc phải lớn hơn 0' });
  return errors;
};

const pickFields = (body) => ({
  floorNumber: Number(body.floorNumber),
  roomTypeId: body.roomTypeId,
  area: Number(body.area),
  capacity: Number(body.capacity),
  rentPrice: Number(body.rentPrice),
  deposit: Number(body.deposit),
  images: body.images || [],
});

export const roomMock = {
  // params: { status, floor, roomTypeId, minPrice, maxPrice }
  listByBuilding: (buildingId, params = {}) => {
    const building = findBuilding(buildingId);
    if (!building) return reject(404, 'Tòa nhà không tồn tại');
    if (!canView(building)) return reject(403, 'Không có quyền truy cập');

    const { status, floor, roomTypeId, minPrice, maxPrice } = params;
    const list = rooms
      .filter((r) => !r.isDeleted && r.buildingId === buildingId)
      .filter((r) => !status || r.status === status)
      .filter((r) => !floor || r.floorNumber === Number(floor))
      .filter((r) => !roomTypeId || r.roomTypeId === roomTypeId)
      .filter((r) => !minPrice || r.rentPrice >= Number(minPrice))
      .filter((r) => !maxPrice || r.rentPrice <= Number(maxPrice))
      .sort((a, b) => a.floorNumber - b.floorNumber || a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true }));
    return respond(list.map(populateType));
  },

  get: (id) => {
    const room = findRoom(id);
    if (!room) return reject(404, 'Phòng không tồn tại');
    if (!canView(findBuilding(room.buildingId))) return reject(403, 'Không có quyền truy cập');
    return respond(populateAll(room));
  },

  create: (buildingId, body) => {
    const building = findBuilding(buildingId);
    if (!building) return reject(404, 'Tòa nhà không tồn tại');

    const errors = validateFields(body, building);
    if (!String(body.roomNumber || '').trim()) errors.unshift({ field: 'roomNumber', message: 'Vui lòng nhập mã phòng' });
    if (errors.length) return invalid(errors);

    const duplicated = rooms.some((r) => !r.isDeleted && r.buildingId === buildingId && sameText(r.roomNumber, body.roomNumber));
    if (duplicated) {
      return reject(409, 'Mã phòng đã tồn tại', [{ field: 'roomNumber', message: 'Mã phòng đã tồn tại trong tòa này' }]);
    }

    const room = {
      _id: newId(),
      buildingId,
      roomNumber: body.roomNumber.trim(),
      ...pickFields(body),
      status: ROOM_STATUS.AVAILABLE, // phòng mới luôn Trống
      isDeleted: false,
      createdAt: now(),
      updatedAt: now(),
    };
    rooms.push(room);
    return respond(populateAll(room), 'Tạo phòng thành công');
  },

  // Không sửa roomNumber; status chỉ AVAILABLE ↔ MAINTENANCE
  update: (id, body) => {
    const room = findRoom(id);
    if (!room) return reject(404, 'Phòng không tồn tại');

    const errors = validateFields(body, findBuilding(room.buildingId));
    if (errors.length) return invalid(errors);

    const occupants = contractOf(id, CONTRACT_STATUS.ACTIVE)?.occupantCount || 0;
    if (Number(body.capacity) < occupants) {
      const message = `Sức chứa không được nhỏ hơn số người đang cư trú hiện tại (${occupants} người)`;
      return reject(409, message, [{ field: 'capacity', message }]);
    }

    let { status } = room;
    if (body.status && body.status !== room.status) {
      if (room.status === ROOM_STATUS.OCCUPIED || body.status === ROOM_STATUS.OCCUPIED) {
        const message = 'Trạng thái Đang thuê do hợp đồng quyết định, không đổi tay được';
        return reject(409, message, [{ field: 'status', message }]);
      }
      if (body.status === ROOM_STATUS.MAINTENANCE && contractOf(id, CONTRACT_STATUS.DRAFT)) {
        const message = 'Phòng đang có hợp đồng nháp chờ kích hoạt. Manager cần hủy hợp đồng nháp trước.';
        return reject(409, message, [{ field: 'status', message }]);
      }
      status = body.status;
    }

    Object.assign(room, pickFields(body), { status, updatedAt: now() });
    return respond(populateAll(room), 'Cập nhật phòng thành công');
  },

  remove: (id) => {
    const room = findRoom(id);
    if (!room) return reject(404, 'Phòng không tồn tại');
    if (contractOf(id, CONTRACT_STATUS.ACTIVE)) return reject(409, 'Không thể xóa phòng đang có khách thuê');
    if (contractOf(id, CONTRACT_STATUS.DRAFT)) {
      return reject(409, 'Phòng đang có hợp đồng chờ kích hoạt. Manager cần hủy hợp đồng nháp trước khi xóa.');
    }
    Object.assign(room, { isDeleted: true, deletedAt: now() });
    return respond(null, 'Đã xóa phòng');
  },
};

export default roomMock;
