// API thông báo (UC-41) theo docs/api.md: danh sách, số chưa đọc, đánh dấu đã đọc
import api from './axios.js';
import { notificationMock } from '../mocks/notification.mock.js';

// An xong API notification thì đổi thành false
const USE_MOCK = true;

export const notificationApi = {
  // { page, limit, unread } → { items, total, page, limit }, mới nhất trước
  list: (params) => (USE_MOCK ? notificationMock.list(params) : api.get('/notifications', { params })),

  // → { count }
  unreadCount: () => (USE_MOCK ? notificationMock.unreadCount() : api.get('/notifications/unread-count')),

  markRead: (id) => (USE_MOCK ? notificationMock.markRead(id) : api.patch(`/notifications/${id}/read`)),

  markAllRead: () => (USE_MOCK ? notificationMock.markAllRead() : api.patch('/notifications/read-all')),
};

export default notificationApi;
