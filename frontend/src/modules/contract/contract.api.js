// API của module contract (UC-24..27, 46): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
// Danh sách có phân trang: data = { items, total, page, limit, totalPages } (limit tối đa 50)
import api from '../../api/axios';

const contractApi = {
  // UC-25: Manager xem hợp đồng tòa mình, Customer xem của mình. ?status=DRAFT,ACTIVE&roomId=&page=&limit=
  list: (params) => api.get('/contracts', { params }),

  // UC-25: chi tiết kèm room (roomType, building), representative, occupants[]
  detail: (id) => api.get(`/contracts/${id}`),

  // UC-24: tạo nháp { roomId, startDate, durationMonths, representativeCccd, representativeEmail, contractType, notes?, coOccupants[] }
  // Trả 201 { _id, status: 'DRAFT', ..., rawToken, warning? }
  create: (data) => api.post('/contracts', data),

  // UC-26: Nháp sửa CCCD, email, ngày bắt đầu, số tháng, ghi chú; Đang hiệu lực chỉ ghi chú. Trả kèm inviteInvalidated?
  update: (id, data) => api.put(`/contracts/${id}`, data),

  // UC-24 A2: gửi lại lời mời (link cũ hết hiệu lực, link mới 24h) → { rawToken, warning? }
  resendInvite: (id) => api.post(`/contracts/${id}/resend-invite`),

  // UC-27: gia hạn { months?: 12, notes? } – chỉ dời ngày kết thúc
  renew: (id, data) => api.post(`/contracts/${id}/renew`, data),

  // UC-46: hủy hợp đồng nháp { reason? }
  cancel: (id, data) => api.post(`/contracts/${id}/cancel`, data),

  // UC-23: nội quy tòa để in vào văn bản hợp đồng (Manager tòa mình, Customer tòa đang ở) → { rules }
  buildingRules: (buildingId) => api.get(`/buildings/${buildingId}/rules`),

  // phòng của tòa Manager phụ trách (GET /buildings/:id/rooms) – chọn phòng Trống khi tạo, tìm theo mã phòng
  rooms: (buildingId, params) => api.get(`/buildings/${buildingId}/rooms`, { params }),

  // UC-28, 29: các đơn chấm dứt của hợp đồng (GET /terminations?contractId=) – hiện ở chi tiết hợp đồng
  terminations: (contractId) => api.get('/terminations', { params: { contractId, limit: 10 } }),

  // UC-45 (Manager): xem trước hoàn cọc – chỉ HĐ Đã kết thúc do hết hạn, chưa hoàn. Không đủ điều kiện → 400 kèm lý do
  // → { deposit, canRefund, hasPendingInvoices, pendingInvoiceCount, pendingInvoiceTotal, pendingInvoices[], warning }
  refundPreview: (id) => api.get(`/contracts/${id}/refund-preview`),

  // UC-45 (Manager): xác nhận đã hoàn cọc (tiền mặt, 1 lần) → { depositRefundedAt, …, warning? }
  refundDeposit: (id) => api.post(`/contracts/${id}/refund-deposit`),
};

export default contractApi;
