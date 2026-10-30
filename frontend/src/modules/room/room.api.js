// API của module room (UC-16..19): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const roomApi = {
  // UC-19: danh sách phòng theo tòa (GET /buildings/:buildingId/rooms)
  list: (buildingId, params) => api.get(`/buildings/${buildingId}/rooms`, { params }),

  // UC-19: chi tiết phòng (GET /rooms/:id)
  detail: (id) => api.get(`/rooms/${id}`),

  // UC-16: tạo phòng trong tòa (POST /buildings/:buildingId/rooms)
  create: (buildingId, data) => api.post(`/buildings/${buildingId}/rooms`, data),

  // UC-17: sửa phòng (PUT /rooms/:id)
  update: (id, data) => api.put(`/rooms/${id}`, data),

  // UC-18: xóa mềm phòng (DELETE /rooms/:id)
  remove: (id) => api.delete(`/rooms/${id}`),

  // Danh mục loại phòng để chọn khi tạo / sửa phòng và lọc
  listRoomTypes: () => api.get('/room-types'),
};

export default roomApi;
