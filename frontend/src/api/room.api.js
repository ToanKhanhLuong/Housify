// API phòng (UC-16..19) theo docs/api.md
import api from './axios.js';
import { roomMock } from '../mocks/room.mock.js';

// Toàn xong API room thì đổi thành false
const USE_MOCK = true;

export const roomApi = {
  // params: { status, floor, roomTypeId, minPrice, maxPrice } → mảng phòng, roomTypeId đã populate { _id, name }
  listByBuilding: (buildingId, params) =>
    USE_MOCK ? roomMock.listByBuilding(buildingId, params) : api.get(`/buildings/${buildingId}/rooms`, { params }),

  // → phòng, populate roomTypeId { _id, name } và buildingId { _id, name, floorCount }
  get: (id) => (USE_MOCK ? roomMock.get(id) : api.get(`/rooms/${id}`)),

  // { roomNumber, floorNumber, roomTypeId, area, capacity, rentPrice, deposit, images }
  create: (buildingId, body) =>
    USE_MOCK ? roomMock.create(buildingId, body) : api.post(`/buildings/${buildingId}/rooms`, body),

  // như create nhưng không gửi roomNumber, có thêm status (AVAILABLE | MAINTENANCE)
  update: (id, body) => (USE_MOCK ? roomMock.update(id, body) : api.put(`/rooms/${id}`, body)),

  remove: (id) => (USE_MOCK ? roomMock.remove(id) : api.delete(`/rooms/${id}`)),
};

export default roomApi;
