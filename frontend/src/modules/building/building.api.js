// API của module building (UC-12..15, 23): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const buildingApi = {
  // UC-13: danh sách tòa nhà (Admin xem tất cả, Manager xem tòa mình)
  list: (params) => api.get('/buildings', { params }),

  // UC-13: chi tiết tòa nhà (kèm roomStats và manager)
  detail: (id) => api.get(`/buildings/${id}`),

  // UC-12: tạo tòa nhà
  create: (data) => api.post('/buildings', data),

  // UC-13: cập nhật tòa nhà
  update: (id, data) => api.put(`/buildings/${id}`, data),

  // UC-14: xóa tòa nhà (xóa mềm)
  remove: (id) => api.delete(`/buildings/${id}`),

  // UC-15: danh sách phòng của tòa
  rooms: (id, params) => api.get(`/buildings/${id}/rooms`, { params }),

  // UC-15: sơ đồ các tầng
  floors: (id) => api.get(`/buildings/${id}/floors`),

  // UC-15: cập nhật số tầng
  updateFloorCount: (id, data) => api.patch(`/buildings/${id}/floor-count`, data),

  // UC-23: nội quy tòa nhà
  rules: (id) => api.get(`/buildings/${id}/rules`),

  // UC-23: cập nhật nội quy tòa nhà
  updateRules: (id, data) => api.put(`/buildings/${id}/rules`, data),
};

export default buildingApi;
