// API của module roomType (UC-20): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const roomTypeApi = {
  // Lấy danh sách loại phòng (sắp xếp theo tên, không phân trang)
  list: () => api.get('/room-types'),

  // Lấy chi tiết loại phòng
  detail: (id) => api.get(`/room-types/${id}`),

  // Tạo loại phòng mới { name, capacity }
  create: (data) => api.post('/room-types', data),

  // Cập nhật loại phòng { name, capacity }
  update: (id, data) => api.put(`/room-types/${id}`, data),

  // Xóa mềm loại phòng (chặn khi còn phòng sử dụng)
  remove: (id) => api.delete(`/room-types/${id}`),
};

export default roomTypeApi;
