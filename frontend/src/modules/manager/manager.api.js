// API của module manager (UC-08..11, chỉ Admin): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
// :id là _id của users (không phải của managers). Gửi mail lỗi thì vẫn thành công, kèm data.warning
import api from '../../api/axios';

const managerApi = {
  // UC-09: ?status=&q= → danh sách Manager (mỗi người kèm building: { _id, name } | null)
  list: (params) => api.get('/managers', { params }),
  // UC-08 bước 1–5: { name, email, phone } → tạo tài khoản PENDING, gửi mail link kích hoạt
  create: (data) => api.post('/managers', data),
  // UC-09: chi tiết, kèm cccdFrontUrl, cccdBackUrl
  detail: (id) => api.get(`/managers/${id}`),
  // UC-09: chỉ tài khoản đã kích hoạt; ảnh gửi là publicId
  update: (id, data) => api.put(`/managers/${id}`, data),
  // UC-09: chỉ tài khoản chưa kích hoạt, xóa hẳn
  remove: (id) => api.delete(`/managers/${id}`),
  resendActivation: (id) => api.post(`/managers/${id}/resend-activation`),
  // UC-10: lock cần { reason }
  lock: (id, data) => api.patch(`/managers/${id}/lock`, data),
  unlock: (id) => api.patch(`/managers/${id}/unlock`),
  // UC-11: { managerId, confirmReplace? } hoặc { managerId: null } để gỡ.
  // Tòa đã có Manager mà chưa gửi confirmReplace: true → 409, message là câu hỏi xác nhận
  assignBuilding: (buildingId, data) => api.put(`/buildings/${buildingId}/manager`, data),
  // danh sách tòa để chọn khi phân công (module building)
  listBuildings: () => api.get('/buildings'),
};

export default managerApi;
