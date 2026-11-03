// API của module invoice (UC-34..37): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
// Danh sách có phân trang: data = { items, total, page, limit, totalPages }
import api from '../../api/axios';

const invoiceApi = {
  // UC-36: Manager xem tòa mình, Customer xem phòng mình (không thấy nháp). ?status=&month=&roomId=&page=&limit=
  list: (params) => api.get('/invoices', { params }),

  // UC-36: chi tiết, kèm contractId.roomId (đã populate), isOverdue, isPaidLate
  detail: (id) => api.get(`/invoices/${id}`),

  // UC-34: sửa hóa đơn nháp { items[] } – server tự tính tiền, giữ đơn giá đã chốt. Trả hóa đơn kèm warnings[]
  update: (id, data) => api.put(`/invoices/${id}`, data),

  // UC-35: gửi hóa đơn → PENDING, sinh QR, hạn = lúc gửi + 7 ngày. Trả hóa đơn kèm warning (null nếu gửi được)
  send: (id) => api.post(`/invoices/${id}/send`),

  // UC-35: gửi lại chuông + email cho hóa đơn PENDING. Trả hóa đơn kèm warning
  resendNotification: (id) => api.post(`/invoices/${id}/resend-notification`),

  // UC-37: hủy hóa đơn DRAFT / PENDING, { reason } bắt buộc
  cancel: (id, data) => api.post(`/invoices/${id}/cancel`, data),

  // UC-34: gợi ý trước khi lập ?contractId=&month= → { contract, month, items[], warnings[], hasExistingInvoice, existingInvoiceId }
  prefill: (params) => api.get('/invoices/prefill', { params }),

  // UC-34: lưu nháp { contractId, month, items[], confirmDuplicate? }. Trùng kỳ mà chưa xác nhận → 409. Trả hóa đơn kèm warnings[]
  create: (data) => api.post('/invoices', data),

  // UC-34 A1: tạo nháp hàng loạt { contractIds[], month } → { totalCreated, invoices[], errors[], warnings[] }
  bulk: (data) => api.post('/invoices/bulk', data),

  // hợp đồng đang hiệu lực của tòa (GET /contracts, tối đa 50 mỗi trang) – để chọn phòng lập hóa đơn
  activeContracts: () => api.get('/contracts', { params: { status: 'ACTIVE', limit: 50 } }),

  // phòng của tòa Manager phụ trách – để tìm hóa đơn theo mã phòng (GET /buildings/:id/rooms)
  rooms: (buildingId) => api.get(`/buildings/${buildingId}/rooms`),

  // UC-36 bước 3: giao dịch SePay của hóa đơn đã trả (GET /payments ?from=&to= theo ngày trả, YYYY-MM-DD)
  // API chưa lọc được theo invoiceId → FE lấy theo khoảng ngày rồi lọc đúng hóa đơn
  payments: (params) => api.get('/payments', { params }),
};

export default invoiceApi;
