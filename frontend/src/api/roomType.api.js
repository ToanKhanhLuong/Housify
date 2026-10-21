// API loại phòng (UC-20) theo docs/api.md: danh sách, thêm, sửa, xóa
import api from './axios.js';
import { roomTypeMock } from '../mocks/roomType.mock.js';

// Toàn xong API roomType thì đổi thành false
const USE_MOCK = true;

export const roomTypeApi = {
  // → mảng loại phòng, mỗi loại có thêm roomCount (số phòng đang dùng)
  list: () => (USE_MOCK ? roomTypeMock.list() : api.get('/room-types')),

  create: (body) => (USE_MOCK ? roomTypeMock.create(body) : api.post('/room-types', body)), // { name }

  update: (id, body) => (USE_MOCK ? roomTypeMock.update(id, body) : api.put(`/room-types/${id}`, body)), // { name }

  remove: (id) => (USE_MOCK ? roomTypeMock.remove(id) : api.delete(`/room-types/${id}`)),
};

export default roomTypeApi;
