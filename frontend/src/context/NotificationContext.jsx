// Số thông báo chưa đọc dùng chung cho chuông và trang Thông báo (UC-41). Tự hỏi lại BE mỗi 60 giây
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import notificationApi from '../api/notification.api.js';

const REFRESH_MS = 60 * 1000;

const NotificationContext = createContext(null);

// Lỗi đếm số chưa đọc thì trả null → giữ số cũ, không làm phiền người dùng
const fetchUnreadCount = () =>
  notificationApi
    .unreadCount()
    .then((res) => res.data.count)
    .catch(() => null);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    const count = await fetchUnreadCount();
    if (count !== null) setUnreadCount(count);
  }, []);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchUnreadCount().then((count) => {
        if (active && count !== null) setUnreadCount(count);
      });

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const value = useMemo(() => ({ unreadCount, refreshUnread }), [unreadCount, refreshUnread]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => useContext(NotificationContext);
