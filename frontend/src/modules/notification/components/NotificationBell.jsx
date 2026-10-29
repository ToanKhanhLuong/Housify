// UC-41 bước 1: chuông trên Header, hiện số thông báo chưa đọc, bấm thì mở trang Thông báo
// Số được tải lại khi đổi trang, khi trang Thông báo vừa đánh dấu đã đọc, và mỗi 30 giây (không dùng socket)
// Tab trình duyệt bị ẩn thì tạm dừng, quay lại tab thì tải ngay (theo gợi ý trong docs/api.md)
import { useCallback, useEffect, useState } from 'react';
import { Badge } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { BiBell } from 'react-icons/bi';
import notificationApi from '../notification.api';
import { NOTIFICATIONS_CHANGED } from '../notification.utils';

const REFRESH_MS = 30 * 1000;

const NotificationBell = () => {
    const { pathname } = useLocation();
    const [count, setCount] = useState(0);

    // lỗi thì giữ số cũ: chuông không báo lỗi, trang Thông báo mới báo (UC-41 E)
    const loadCount = useCallback(
        () =>
            notificationApi
                .unreadCount()
                .then((response) => setCount(response.data.count))
                .catch(() => {}),
        [],
    );

    useEffect(() => {
        loadCount();
    }, [loadCount, pathname]);

    useEffect(() => {
        let timer = null;
        const start = () => {
            timer = setInterval(loadCount, REFRESH_MS);
        };
        const handleVisibility = () => {
            clearInterval(timer);
            if (document.hidden) return;
            loadCount();
            start();
        };

        if (!document.hidden) start();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener(NOTIFICATIONS_CHANGED, loadCount);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener(NOTIFICATIONS_CHANGED, loadCount);
        };
    }, [loadCount]);

    return (
        <Link
            to="/notifications"
            className="text-secondary flex position-relative"
            aria-label={count > 0 ? `Thông báo, ${count} chưa đọc` : 'Thông báo'}
        >
            <BiBell size={20} />
            {count > 0 && (
                <Badge
                    bg="danger"
                    pill
                    className="position-absolute top-0 start-100 translate-middle"
                >
                    {count > 99 ? '99+' : count}
                </Badge>
            )}
        </Link>
    );
};

export default NotificationBell;
