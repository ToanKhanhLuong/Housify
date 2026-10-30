// API của module building (UC-12..15, 23): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';
import { ROOM_STATUS } from '../../constants/enums';

// BE chưa xong: xóa MOCK, mockBuildings, mockRooms, fake, fail, các hàm mock* và các nhánh giả
// Hình dạng response chưa có trong api.md, đang tạm theo docs/database.md:
//   tòa: field của buildings + roomCount (số phòng chưa xóa) + manager { _id, name } | null
//   tầng: [{ floorNumber, roomCount, statusCounts: { AVAILABLE, OCCUPIED, MAINTENANCE } }]
const MOCK = true;

let mockBuildings = [
  {
    _id: 'b1',
    name: 'Housify Cầu Giấy',
    address: '12 Trần Thái Tông, Cầu Giấy, Hà Nội',
    description: 'Gần ĐH Quốc gia, có thang máy và chỗ để xe',
    images: [],
    floorCount: 5,
    rules: 'Giữ trật tự sau 22h.\nKhông nuôi thú cưng.\nĐể xe đúng nơi quy định.',
    managerId: 'u1',
    manager: { _id: 'u1', name: 'Trần Văn Tùng' },
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    _id: 'b2',
    name: 'Housify Thanh Xuân',
    address: '88 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    description: '',
    images: [],
    floorCount: 3,
    rules: '',
    managerId: null,
    manager: null,
    createdAt: '2026-10-05T08:00:00.000Z',
  },
];

// phòng giả để đếm theo tầng; hasContract: còn hợp đồng đang hiệu lực hoặc nháp (chặn xóa tòa, UC-14)
const mockRooms = [
  {
    buildingId: 'b1',
    _id: 'r1',
    roomNumber: 'P101',
    floorNumber: 1,
    status: ROOM_STATUS.OCCUPIED,
    hasContract: true,
  },
  {
    buildingId: 'b1',
    _id: 'r2',
    roomNumber: 'P102',
    floorNumber: 1,
    status: ROOM_STATUS.AVAILABLE,
    hasContract: false,
  },
  {
    buildingId: 'b1',
    _id: 'r3',
    roomNumber: 'P201',
    floorNumber: 2,
    status: ROOM_STATUS.MAINTENANCE,
    hasContract: false,
  },
  {
    buildingId: 'b1',
    _id: 'r4',
    roomNumber: 'P301',
    floorNumber: 3,
    status: ROOM_STATUS.OCCUPIED,
    hasContract: true,
  },
  {
    buildingId: 'b2',
    _id: 'r5',
    roomNumber: 'A101',
    floorNumber: 1,
    status: ROOM_STATUS.AVAILABLE,
    hasContract: false,
  },
];

const fake = (data, message = '') => Promise.resolve({ success: true, data, message });
const fail = (status, message) => Promise.reject({ status, message, errors: null });

const roomsOf = (buildingId) => mockRooms.filter((room) => room.buildingId === buildingId);
const withRoomCount = (building) => ({ ...building, roomCount: roomsOf(building._id).length });
const findBuilding = (id) => mockBuildings.find((building) => building._id === id);

// giả lập BE: tên tòa duy nhất trong các tòa đang hoạt động (BR-034)
const isDuplicateName = (name, exceptId) =>
  mockBuildings.some(
    (building) =>
      building._id !== exceptId && building.name.toLowerCase() === name.trim().toLowerCase(),
  );

const mockDetail = (id) => {
  const building = findBuilding(id);
  return building ? fake(withRoomCount(building)) : fail(404, 'Không tìm thấy tòa nhà');
};

const mockCreate = (data) => {
  if (isDuplicateName(data.name)) return fail(409, 'Tên tòa nhà đã tồn tại');
  const building = {
    _id: String(Date.now()),
    ...data,
    rules: '',
    managerId: null,
    manager: null,
    createdAt: new Date().toISOString(),
  };
  mockBuildings = [...mockBuildings, building];
  return fake(withRoomCount(building), 'Tạo tòa nhà thành công');
};

const mockUpdate = (id, data) => {
  if (isDuplicateName(data.name, id)) return fail(409, 'Tên tòa nhà đã tồn tại');
  mockBuildings = mockBuildings.map((building) =>
    building._id === id ? { ...building, ...data } : building,
  );
  return mockDetail(id);
};

// UC-14: chặn khi còn phòng có hợp đồng đang hiệu lực / nháp, hoặc còn Manager phụ trách
const mockRemove = (id) => {
  const building = findBuilding(id);
  const blockedRooms = roomsOf(id).filter((room) => room.hasContract);
  if (blockedRooms.length > 0) {
    const roomNumbers = blockedRooms.map((room) => room.roomNumber).join(', ');
    return fail(400, `Không thể xóa tòa nhà vì còn phòng đang có hợp đồng: ${roomNumbers}`);
  }
  if (building?.managerId) {
    return fail(400, 'Tòa nhà còn Manager phụ trách, vui lòng gỡ phân công trước khi xóa');
  }
  mockBuildings = mockBuildings.filter((item) => item._id !== id);
  return fake(null, 'Xóa tòa nhà thành công');
};

const mockFloors = (id) => {
  const building = findBuilding(id);
  if (!building) return fail(404, 'Không tìm thấy tòa nhà');
  const floors = Array.from({ length: building.floorCount }, (_, index) => {
    const rooms = roomsOf(id).filter((room) => room.floorNumber === index + 1);
    const countOf = (status) => rooms.filter((room) => room.status === status).length;
    return {
      floorNumber: index + 1,
      roomCount: rooms.length,
      statusCounts: {
        [ROOM_STATUS.AVAILABLE]: countOf(ROOM_STATUS.AVAILABLE),
        [ROOM_STATUS.OCCUPIED]: countOf(ROOM_STATUS.OCCUPIED),
        [ROOM_STATUS.MAINTENANCE]: countOf(ROOM_STATUS.MAINTENANCE),
      },
    };
  });
  return fake(floors);
};

// BR-042: không giảm xuống dưới tầng cao nhất đang có phòng
const mockUpdateFloorCount = (id, { floorCount }) => {
  const blocked = roomsOf(id).filter((room) => room.floorNumber > floorCount);
  if (blocked.length > 0) {
    return fail(400, `Không thể giảm số tầng: còn ${blocked.length} phòng ở các tầng bị bỏ`);
  }
  mockBuildings = mockBuildings.map((building) =>
    building._id === id ? { ...building, floorCount } : building,
  );
  return fake(withRoomCount(findBuilding(id)), 'Cập nhật số tầng thành công');
};

const mockUpdateRules = (id, { rules }) => {
  mockBuildings = mockBuildings.map((building) =>
    building._id === id ? { ...building, rules } : building,
  );
  return fake({ rules }, 'Lưu nội quy thành công');
};

const buildingApi = {
  list: (params) =>
    MOCK ? fake(mockBuildings.map(withRoomCount)) : api.get('/buildings', { params }),
  detail: (id) => (MOCK ? mockDetail(id) : api.get(`/buildings/${id}`)),
  create: (data) => (MOCK ? mockCreate(data) : api.post('/buildings', data)),
  update: (id, data) => (MOCK ? mockUpdate(id, data) : api.put(`/buildings/${id}`, data)),
  remove: (id) => (MOCK ? mockRemove(id) : api.delete(`/buildings/${id}`)),

  // UC-15: tầng 1..n kèm số phòng theo trạng thái; sửa tổng số tầng
  // sơ đồ tầng: phòng của tòa (GET /buildings/:buildingId/rooms trong api.md), mỗi phòng có _id, roomNumber, floorNumber, status
  rooms: (id) =>
    MOCK
      ? fake(
          roomsOf(id).map(({ _id, roomNumber, floorNumber, status }) => ({
            _id,
            roomNumber,
            floorNumber,
            status,
          })),
        ) // không trả hasContract (chỉ để giả lập)
      : api.get(`/buildings/${id}/rooms`),
  floors: (id) => (MOCK ? mockFloors(id) : api.get(`/buildings/${id}/floors`)),
  updateFloorCount: (id, data) =>
    MOCK ? mockUpdateFloorCount(id, data) : api.patch(`/buildings/${id}/floor-count`, data),

  // UC-23: nội quy, một bản, lưu đè
  rules: (id) =>
    MOCK ? fake({ rules: findBuilding(id)?.rules ?? '' }) : api.get(`/buildings/${id}/rules`),
  updateRules: (id, data) =>
    MOCK ? mockUpdateRules(id, data) : api.put(`/buildings/${id}/rules`, data),
};

export default buildingApi;
