// Dữ liệu giả dùng chung cho mock tòa nhà, phòng, loại phòng (UC-12..20, 23) – field theo docs/database.md
// Chỉ nằm trong bộ nhớ: F5 là về lại dữ liệu này. BE xong module nào thì đổi USE_MOCK của module đó thành false
import { ROOM_STATUS, CONTRACT_STATUS } from '../constants/enums.js';

const day = (iso) => new Date(iso).toISOString();

// Manager có thể được phân công (chỉ để mock hiện tên, SĐT ở chi tiết tòa)
export const managers = [
  { _id: 'mock-mgr-1', name: 'Trần Minh Đức', phone: '0912384761', email: 'duc.tran@housify.vn' },
  { _id: 'mock-mgr-2', name: 'Vũ Khánh Linh', phone: '0983127450', email: 'linh.vu@housify.vn' },
];

export const roomTypes = [
  { _id: 'mock-rt-1', name: 'Phòng đơn', isDeleted: false, createdAt: day('2026-09-02') },
  { _id: 'mock-rt-2', name: 'Phòng đôi', isDeleted: false, createdAt: day('2026-09-02') },
  { _id: 'mock-rt-3', name: 'Phòng có gác xép', isDeleted: false, createdAt: day('2026-09-05') },
  { _id: 'mock-rt-4', name: 'Phòng 4 người', isDeleted: false, createdAt: day('2026-09-10') },
];

const RULES_A = `1. Giờ đóng cổng: 23:00. Về muộn báo trước cho quản lý tòa.
2. Không nấu ăn bằng bếp than, bếp cồn trong phòng.
3. Giữ yên lặng sau 22:00, không mở loa lớn.
4. Xe máy để đúng khu vực tầng 1, khóa cổ và tắt máy trước khi dắt vào.
5. Khách đến chơi ở lại qua đêm phải báo quản lý tòa.
6. Đổ rác đúng giờ (18:00 - 20:00) tại điểm tập kết.
7. Thanh toán hóa đơn trong vòng 7 ngày kể từ khi nhận hóa đơn.`;

export const buildings = [
  {
    _id: 'mock-b-1',
    name: 'Tòa A - Thạch Hòa',
    address: 'Số 12 ngõ 4, thôn 3, Thạch Hòa, Thạch Thất, Hà Nội',
    description: 'Cách cổng Đại học FPT khoảng 1,2 km. Có thang máy, máy giặt chung tầng 1 và camera hành lang.',
    images: [
      'https://picsum.photos/seed/housify-toa-a-1/960/640',
      'https://picsum.photos/seed/housify-toa-a-2/960/640',
    ],
    floorCount: 5, // tầng 5 chưa có phòng → thử giảm số tầng
    rules: RULES_A,
    managerId: 'mock-mgr-1', // có Manager → bị chặn xóa
    isDeleted: false,
    createdAt: day('2026-09-03T08:30:00'),
    updatedAt: day('2026-10-01T10:00:00'),
  },
  {
    _id: 'mock-b-2',
    name: 'Tòa B - Tân Xã',
    address: 'Số 58 đường Tân Xã, Thạch Thất, Hà Nội',
    description: 'Khu yên tĩnh, gần chợ Tân Xã. Phòng có ban công.',
    images: ['https://picsum.photos/seed/housify-toa-b-1/960/640'],
    floorCount: 3,
    rules: '',
    managerId: null, // không có Manager nhưng còn phòng đang thuê → bị chặn xóa
    isDeleted: false,
    createdAt: day('2026-09-12T14:00:00'),
    updatedAt: day('2026-09-12T14:00:00'),
  },
  {
    _id: 'mock-b-3',
    name: 'Tòa C - Bình Yên',
    address: 'Số 7 xóm Đình, Bình Yên, Thạch Thất, Hà Nội',
    description: '',
    images: [],
    floorCount: 4, // chưa có phòng, chưa có Manager → xóa được
    rules: '',
    managerId: null,
    isDeleted: false,
    createdAt: day('2026-10-15T09:15:00'),
    updatedAt: day('2026-10-15T09:15:00'),
  },
];

const { AVAILABLE, OCCUPIED, MAINTENANCE } = ROOM_STATUS;

const makeRoom = ([_id, buildingId, floorNumber, roomNumber, roomTypeId, area, capacity, rentPrice, status]) => ({
  _id,
  buildingId,
  floorNumber,
  roomNumber,
  roomTypeId,
  area,
  capacity,
  rentPrice,
  deposit: rentPrice,
  images: [],
  status,
  isDeleted: false,
  createdAt: day('2026-09-04T09:00:00'),
  updatedAt: day('2026-09-04T09:00:00'),
});

export const rooms = [
  ['mock-r-101', 'mock-b-1', 1, '101', 'mock-rt-1', 18, 1, 2800000, OCCUPIED],
  ['mock-r-102', 'mock-b-1', 1, '102', 'mock-rt-1', 18, 1, 2800000, AVAILABLE],
  ['mock-r-103', 'mock-b-1', 1, '103', 'mock-rt-2', 24, 2, 3600000, OCCUPIED],
  ['mock-r-201', 'mock-b-1', 2, '201', 'mock-rt-2', 25, 2, 3700000, OCCUPIED],
  ['mock-r-202', 'mock-b-1', 2, '202', 'mock-rt-3', 28, 3, 4200000, AVAILABLE],
  ['mock-r-203', 'mock-b-1', 2, '203', 'mock-rt-3', 28, 3, 4200000, MAINTENANCE],
  ['mock-r-301', 'mock-b-1', 3, '301', 'mock-rt-4', 35, 4, 5200000, OCCUPIED],
  ['mock-r-302', 'mock-b-1', 3, '302', 'mock-rt-2', 24, 2, 3600000, AVAILABLE],
  ['mock-r-401', 'mock-b-1', 4, '401', 'mock-rt-3', 30, 3, 4500000, AVAILABLE],
  ['mock-r-b101', 'mock-b-2', 1, '101', 'mock-rt-1', 16, 1, 2500000, OCCUPIED],
  ['mock-r-b102', 'mock-b-2', 1, '102', 'mock-rt-2', 22, 2, 3200000, AVAILABLE],
  ['mock-r-b201', 'mock-b-2', 2, '201', 'mock-rt-2', 22, 2, 3200000, AVAILABLE],
  ['mock-r-b202', 'mock-b-2', 2, '202', 'mock-rt-1', 16, 1, 2500000, MAINTENANCE],
].map(makeRoom);
rooms[0].images = ['https://picsum.photos/seed/housify-room-101/960/640'];

// Hợp đồng: chỉ field mock cần để kiểm tra chặn xóa / sức chứa. Module contract (iter 2) thay bằng dữ liệu đầy đủ
export const contracts = [
  { _id: 'mock-c-1', roomId: 'mock-r-101', status: CONTRACT_STATUS.ACTIVE, occupantCount: 1 },
  { _id: 'mock-c-2', roomId: 'mock-r-103', status: CONTRACT_STATUS.ACTIVE, occupantCount: 2 },
  { _id: 'mock-c-3', roomId: 'mock-r-201', status: CONTRACT_STATUS.ACTIVE, occupantCount: 2 },
  { _id: 'mock-c-4', roomId: 'mock-r-301', status: CONTRACT_STATUS.ACTIVE, occupantCount: 3 },
  { _id: 'mock-c-5', roomId: 'mock-r-302', status: CONTRACT_STATUS.DRAFT, occupantCount: 0 }, // nháp → chặn xóa / bảo trì
  { _id: 'mock-c-6', roomId: 'mock-r-b101', status: CONTRACT_STATUS.ACTIVE, occupantCount: 1 },
];
