// API của module incident (UC-43, 44): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
// Danh sách có phân trang: data = { items, total, page, limit, totalPages }
import api from '../../api/axios';

const incidentApi = {
  // Customer: đơn mình gửi; Manager: đơn tòa mình. ?status=&type=&roomId=&from=&to=&page=&limit=
  // mỗi dòng có room { roomNumber, floorNumber }, reporter { name, phone }
  list: (params) => api.get('/incidents', { params }),

  // chi tiết: thêm handledByName, history [{ title, message, createdAt }]
  detail: (id) => api.get(`/incidents/${id}`),

  // UC-43: Customer gửi { type, title, description, images? } → đơn vừa tạo { _id, incidentCode, …, warning? }
  create: (data) => api.post('/incidents', data),

  // UC-44: Manager tiếp nhận; giải quyết, từ chối cần { resultNote }
  accept: (id) => api.patch(`/incidents/${id}/accept`),
  resolve: (id, data) => api.patch(`/incidents/${id}/resolve`, data),
  reject: (id, data) => api.patch(`/incidents/${id}/reject`, data),

  // phòng của tòa Manager phụ trách – để tìm đơn theo mã phòng (GET /buildings/:id/rooms)
  rooms: (buildingId) => api.get(`/buildings/${buildingId}/rooms`),
};

export default incidentApi;
