// API của module notification (UC-41): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const notificationApi = {
    // { page, limit, unread } → { items, total, page, limit }, chỉ thông báo của mình, mới nhất trước
    list: (params) => api.get('/notifications', { params }),
    // → { count }
    unreadCount: () => api.get('/notifications/unread-count'),
    // → thông báo vừa đánh dấu (cùng dạng 1 item ở danh sách)
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    // → { updated }
    markAllRead: () => api.patch('/notifications/read-all'),
};

export default notificationApi;
