// API của module room (UC-16..19): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';
import { CONTRACT_STATUS, ROOM_STATUS } from '../../constants/enums';

// BE chưa xong: xóa MOCK, các biến mock*, fake, fail, các hàm mock* và các nhánh giả
// Hình dạng response chưa có trong api.md, đang tạm theo docs/database.md:
//   phòng: field của rooms + building { _id, name, floorCount } + roomType { _id, name }
const MOCK = true;

const mockBuildings = [
  { _id: 'b1', name: 'Housify Cầu Giấy', floorCount: 5 },
  { _id: 'b2', name: 'Housify Thanh Xuân', floorCount: 3 },
];

const mockRoomTypes = [
  { _id: 't1', name: 'Phòng đơn' },
  { _id: 't2', name: 'Phòng đôi' },
  { _id: 't3', name: 'Studio' },
];

// contractStatus, occupantCount: chỉ để giả lập các kiểm tra của BE (UC-17 E02, UC-18), BE thật không trả
let mockRooms = [
  {
    _id: 'r1',
    buildingId: 'b1',
    roomNumber: 'P101',
    floorNumber: 1,
    roomTypeId: 't1',
    area: 20,
    capacity: 2,
    rentPrice: 2500000,
    deposit: 2500000,
    status: ROOM_STATUS.OCCUPIED,
    contractStatus: CONTRACT_STATUS.ACTIVE,
    occupantCount: 2,
  },
  {
    _id: 'r2',
    buildingId: 'b1',
    roomNumber: 'P102',
    floorNumber: 1,
    roomTypeId: 't1',
    area: 18,
    capacity: 2,
    rentPrice: 2300000,
    deposit: 2300000,
    status: ROOM_STATUS.AVAILABLE,
    contractStatus: CONTRACT_STATUS.DRAFT,
    occupantCount: 0,
  },
  {
    _id: 'r3',
    buildingId: 'b1',
    roomNumber: 'P201',
    floorNumber: 2,
    roomTypeId: 't2',
    area: 28,
    capacity: 3,
    rentPrice: 3300000,
    deposit: 3300000,
    status: ROOM_STATUS.MAINTENANCE,
    contractStatus: null,
    occupantCount: 0,
  },
  {
    _id: 'r4',
    buildingId: 'b1',
    roomNumber: 'P301',
    floorNumber: 3,
    roomTypeId: 't3',
    area: 35,
    capacity: 4,
    rentPrice: 4200000,
    deposit: 4200000,
    status: ROOM_STATUS.OCCUPIED,
    contractStatus: CONTRACT_STATUS.ACTIVE,
    occupantCount: 3,
  },
  {
    _id: 'r5',
    buildingId: 'b2',
    roomNumber: 'A101',
    floorNumber: 1,
    roomTypeId: 't1',
    area: 16,
    capacity: 1,
    rentPrice: 2000000,
    deposit: 2000000,
    status: ROOM_STATUS.AVAILABLE,
    contractStatus: null,
    occupantCount: 0,
  },
].map((room) => ({ images: [], createdAt: '2026-09-01T08:00:00.000Z', ...room }));

const fake = (data, message = '') => Promise.resolve({ success: true, data, message });
const fail = (status, message) => Promise.reject({ status, message, errors: null });

const findRoom = (id) => mockRooms.find((room) => room._id === id);

// ghép tòa, loại phòng như BE populate; bỏ 2 field chỉ dùng để giả lập
const toResponse = (room) => {
  const response = {
    ...room,
    building: mockBuildings.find((building) => building._id === room.buildingId) ?? null,
    roomType: mockRoomTypes.find((type) => type._id === room.roomTypeId) ?? null,
  };
  delete response.contractStatus;
  delete response.occupantCount;
  return response;
};

const mockList = (buildingId, { floor, status, roomTypeId } = {}) => {
  const rooms = mockRooms.filter(
    (room) =>
      room.buildingId === buildingId &&
      (!floor || room.floorNumber === Number(floor)) &&
      (!status || room.status === status) &&
      (!roomTypeId || room.roomTypeId === roomTypeId),
  );
  return fake(rooms.map(toResponse));
};

// BR-043: mã phòng duy nhất trong cùng tòa (phòng đã xóa không tính)
const isDuplicateNumber = (buildingId, roomNumber) =>
  mockRooms.some(
    (room) =>
      room.buildingId === buildingId &&
      room.roomNumber.toLowerCase() === roomNumber.trim().toLowerCase(),
  );

const mockCreate = (buildingId, data) => {
  if (isDuplicateNumber(buildingId, data.roomNumber)) {
    return fail(409, 'Mã phòng đã tồn tại trong tòa nhà');
  }
  const room = {
    _id: String(Date.now()),
    buildingId,
    ...data,
    status: ROOM_STATUS.AVAILABLE, // BR-044
    contractStatus: null,
    occupantCount: 0,
    createdAt: new Date().toISOString(),
  };
  mockRooms = [...mockRooms, room];
  return fake(toResponse(room), 'Tạo phòng thành công');
};

const mockUpdate = (id, data) => {
  const room = findRoom(id);
  if (!room) return fail(404, 'Không tìm thấy phòng');
  if (data.capacity < room.occupantCount) {
    return fail(
      400,
      `Sức chứa không được nhỏ hơn số người đang cư trú hiện tại (${room.occupantCount} người)`,
    );
  }
  if (
    data.status === ROOM_STATUS.MAINTENANCE &&
    room.status !== ROOM_STATUS.MAINTENANCE &&
    room.contractStatus === CONTRACT_STATUS.DRAFT
  ) {
    return fail(
      400,
      'Phòng đang có hợp đồng nháp, Manager cần hủy hợp đồng nháp trước khi chuyển sang Bảo trì',
    );
  }
  const updated = { ...room, ...data };
  mockRooms = mockRooms.map((item) => (item._id === id ? updated : item));
  return fake(toResponse(updated), 'Cập nhật phòng thành công');
};

// UC-18: chặn khi còn hợp đồng đang hiệu lực hoặc nháp
const mockRemove = (id) => {
  const room = findRoom(id);
  if (room?.contractStatus === CONTRACT_STATUS.ACTIVE) {
    return fail(400, 'Không thể xóa phòng đang có khách thuê');
  }
  if (room?.contractStatus === CONTRACT_STATUS.DRAFT) {
    return fail(
      400,
      'Phòng đang có hợp đồng chờ kích hoạt, Manager cần hủy hợp đồng nháp trước khi xóa',
    );
  }
  mockRooms = mockRooms.filter((item) => item._id !== id);
  return fake(null, 'Xóa phòng thành công');
};

const roomApi = {
  // UC-19: ?floor=&status=&roomTypeId=
  list: (buildingId, params) =>
    MOCK ? mockList(buildingId, params) : api.get(`/buildings/${buildingId}/rooms`, { params }),
  create: (buildingId, data) =>
    MOCK ? mockCreate(buildingId, data) : api.post(`/buildings/${buildingId}/rooms`, data),
  detail: (id) =>
    MOCK
      ? findRoom(id)
        ? fake(toResponse(findRoom(id)))
        : fail(404, 'Không tìm thấy phòng')
      : api.get(`/rooms/${id}`),
  // PUT không gửi roomNumber (BR-046); status chỉ AVAILABLE hoặc MAINTENANCE
  update: (id, data) => (MOCK ? mockUpdate(id, data) : api.put(`/rooms/${id}`, data)),
  remove: (id) => (MOCK ? mockRemove(id) : api.delete(`/rooms/${id}`)),

  // danh sách để chọn: tòa nhà (module building), loại phòng chưa xóa (module roomType)
  listBuildings: () => (MOCK ? fake(mockBuildings) : api.get('/buildings')),
  listRoomTypes: () => (MOCK ? fake(mockRoomTypes) : api.get('/room-types')),
};

export default roomApi;
