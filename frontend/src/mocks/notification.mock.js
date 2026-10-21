// Dữ liệu giả cho thông báo (UC-41) khi BE chưa có API – trả đúng dạng { success, data, message } như axios.js
// Field theo docs/database.md (notifications). Dạng unread-count tạm đoán là { count } – chờ An chốt
import { NOTIFICATION_TYPE } from '../constants/enums.js';

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

let notifications = [
  { type: NOTIFICATION_TYPE.MANAGER_ASSIGNED, title: 'Bạn được phân công quản lý tòa nhà', message: 'Admin đã phân công bạn quản lý tòa Housify Cầu Giấy. Bạn có thể bắt đầu quản lý phòng, hợp đồng và hóa đơn của tòa.', minutes: 5, isRead: false },
  { type: NOTIFICATION_TYPE.ANNOUNCEMENT, title: 'Cập nhật nội quy tòa nhà', message: 'Nội quy tòa nhà vừa được cập nhật: giờ đóng cổng chuyển sang 23:30, khách đến chơi phải đăng ký với quản lý.', minutes: 40, isRead: false },
  { type: NOTIFICATION_TYPE.INVOICE_SENT, title: 'Hóa đơn tháng 10/2026', message: 'Phòng P101 có hóa đơn mới HD2610K7QX, tổng 3 450 000 đ, hạn thanh toán 28/10/2026.', minutes: 120, isRead: false },
  { type: NOTIFICATION_TYPE.INCIDENT_UPDATE, title: 'Sự cố đang được xử lý', message: 'Đơn SC2610A1 "Vòi nước bị rò" đã được tiếp nhận và đang xử lý.', minutes: 300, isRead: true },
  { type: NOTIFICATION_TYPE.PAYMENT_SUCCESS, title: 'Thanh toán thành công', message: 'Hóa đơn HD2609B2CD của phòng P203 đã được thanh toán 3 120 000 đ qua SePay.', minutes: 60 * 26, isRead: true },
  { type: NOTIFICATION_TYPE.PAYMENT_REMINDER, title: 'Nhắc thanh toán hóa đơn', message: 'Hóa đơn HD2609B2CD còn 3 ngày nữa đến hạn thanh toán.', minutes: 60 * 50, isRead: true },
  { type: NOTIFICATION_TYPE.TERMINATION_REQUEST, title: 'Có đơn chấm dứt hợp đồng', message: 'Quản lý đã lập đơn chấm dứt hợp đồng phòng P305 theo thỏa thuận, ngày hiệu lực 30/11/2026. Vui lòng xác nhận.', minutes: 60 * 72, isRead: false },
  { type: NOTIFICATION_TYPE.CONTRACT_RENEWED, title: 'Hợp đồng được gia hạn', message: 'Hợp đồng phòng P101 đã được gia hạn thêm 6 tháng, ngày kết thúc mới 30/04/2027.', minutes: 60 * 96, isRead: true },
  { type: NOTIFICATION_TYPE.INVOICE_CANCELLED, title: 'Hóa đơn bị hủy', message: 'Hóa đơn HD2609Z9XY đã bị hủy với lý do: nhập sai chỉ số điện.', minutes: 60 * 120, isRead: true },
  { type: NOTIFICATION_TYPE.ANNOUNCEMENT, title: 'Lịch cắt điện bảo trì', message: 'Tòa nhà cắt điện từ 8:00 đến 11:00 ngày 25/10/2026 để bảo trì trạm biến áp.', minutes: 60 * 150, isRead: true },
  { type: NOTIFICATION_TYPE.DEPOSIT_REFUNDED, title: 'Đã hoàn tiền cọc', message: 'Quản lý đã ghi nhận hoàn cọc 5 000 000 đ cho hợp đồng phòng P402.', minutes: 60 * 200, isRead: true },
  { type: NOTIFICATION_TYPE.MANAGER_UNASSIGNED, title: 'Bạn đã bị gỡ khỏi tòa nhà', message: 'Admin đã gỡ bạn khỏi tòa Housify Thanh Xuân.', minutes: 60 * 300, isRead: true },
].map((item, index) => ({
  _id: `mock-noti-${index + 1}`,
  type: item.type,
  title: item.title,
  message: item.message,
  refId: `mock-ref-${index + 1}`,
  isRead: item.isRead,
  createdAt: minutesAgo(item.minutes),
}));

const delay = (result) => new Promise((resolve) => setTimeout(() => resolve(result), 300));
const ok = (data, message = '') => delay({ success: true, data, message });

export const notificationMock = {
  list: ({ page = 1, limit = 10, unread } = {}) => {
    const filtered = notifications
      .filter((item) => !unread || !item.isRead)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const items = filtered.slice((page - 1) * limit, page * limit);
    return ok({ items, total: filtered.length, page, limit });
  },

  unreadCount: () => ok({ count: notifications.filter((item) => !item.isRead).length }),

  markRead: (id) => {
    notifications = notifications.map((item) => (item._id === id ? { ...item, isRead: true } : item));
    return ok(notifications.find((item) => item._id === id), 'Đã đánh dấu đã đọc');
  },

  markAllRead: () => {
    notifications = notifications.map((item) => ({ ...item, isRead: true }));
    return ok(null, 'Đã đánh dấu tất cả là đã đọc');
  },
};
