// API của module payment (UC-39): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
// Danh sách có phân trang: data = { items, total, page, limit } (BE chưa trả totalPages, Pager tự tính từ total)
import api from '../../api/axios';

const paymentApi = {
  // UC-39: Manager xem giao dịch tòa mình, Customer xem phòng mình. ?from=&to= (YYYY-MM-DD, theo ngày trả) &page=&limit=
  // mỗi dòng: { sepayTxnId, amount, bankName, transferContent, paidAt, statusLabel, invoice{ invoiceCode, month, totalAmount, dueDate, status, roomNumber } }
  list: (params) => api.get('/payments', { params }),
};

export default paymentApi;
