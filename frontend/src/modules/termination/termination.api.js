// API của module termination (UC-28, 29): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
// Danh sách có phân trang: data = { items, total, page, limit, totalPages }
import api from '../../api/axios';

const terminationApi = {
  // UC-28, 29: Admin (lọc ?type=UNILATERAL&status=PENDING), Manager (tòa mình), Customer (HĐ mình đại diện)
  // ?status=&type=&contractId=&page=&limit= (tối đa 50)
  list: (params) => api.get('/terminations', { params }),

  // chi tiết đơn + contract, room, representative + xác nhận điện tử (electronicConfirmation, signatureValid…)
  detail: (id) => api.get(`/terminations/${id}`),

  // Manager tạo đơn trên hợp đồng ACTIVE { type: MUTUAL | UNILATERAL, reason, effectiveDate, note? } → đơn vừa tạo { _id, type, status, …, warning? }
  create: (contractId, data) => api.post(`/contracts/${contractId}/terminations`, data),

  // UC-28: người đại diện xác nhận điện tử đơn MUTUAL { agreed: true }
  confirm: (id) => api.post(`/terminations/${id}/confirm`, { agreed: true }),

  // UC-29: Admin duyệt / từ chối đơn UNILATERAL (từ chối bắt buộc { reason })
  approve: (id) => api.post(`/terminations/${id}/approve`),
  reject: (id, data) => api.post(`/terminations/${id}/reject`, data),

  // Manager hủy đơn đang chờ { reason } (bắt buộc)
  cancel: (id, data) => api.post(`/terminations/${id}/cancel`, data),

  // chi tiết hợp đồng để hiện tóm tắt ở trang tạo đơn (GET /contracts/:id)
  contract: (id) => api.get(`/contracts/${id}`),
};

export default terminationApi;
