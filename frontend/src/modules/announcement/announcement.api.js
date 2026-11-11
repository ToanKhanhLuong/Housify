// API của module announcement (UC-40): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const announcementApi = {
  // UC-40: Manager xem lịch sử các đợt thông báo chung đã gửi
  list: (params) => api.get('/announcements', { params }),

  // UC-40: Manager gửi thông báo chung cho người đại diện các phòng đang thuê trong tòa mình
  // { title, message, target: 'ALL' | roomIds[] } → message "Đã gửi thành công đến X tài khoản" (+ warning khi email lỗi)
  send: (data) => api.post('/announcements', data),

  // phòng của tòa Manager phụ trách (GET /buildings/:id/rooms) – chọn phòng đang thuê để gửi
  rooms: (buildingId) => api.get(`/buildings/${buildingId}/rooms`),
};

export default announcementApi;
