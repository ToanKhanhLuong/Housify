// Chuông thông báo trên Topbar: badge số chưa đọc + dropdown 5 thông báo mới nhất (UC-41)
// Bấm một thông báo: đánh dấu đã đọc, mở đúng trang liên quan; không gắn bản ghi thì mở trang Thông báo để xem đầy đủ
import { forwardRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Dropdown } from 'react-bootstrap';
import { FaBell } from 'react-icons/fa';
import { toast } from 'react-toastify';
import notificationApi from '../../api/notification.api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { getNotificationLink } from '../../constants/notificationLinks.js';
import Loading from '../common/Loading.jsx';
import EmptyState from '../common/EmptyState.jsx';
import NotificationItem from './NotificationItem.jsx';

const LATEST_LIMIT = 5;

// Nút chuông thay cho nút mặc định của Dropdown (bỏ mũi tên, thêm badge)
const BellToggle = forwardRef(({ onClick, count, ...props }, ref) => (
  <Button
    ref={ref}
    variant="light"
    className="relative"
    aria-label="Thông báo"
    aria-expanded={props['aria-expanded']}
    onClick={(event) => {
      event.preventDefault();
      onClick(event);
    }}
  >
    <FaBell />
    {count > 0 && (
      <Badge bg="danger" className="absolute -right-2 -top-2">
        {count > 99 ? '99+' : count}
      </Badge>
    )}
  </Button>
));
BellToggle.displayName = 'BellToggle';

export default function NotificationBell() {
  const { user } = useAuth();
  const { unreadCount, refreshUnread } = useNotifications();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLatest = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationApi.list({ page: 1, limit: LATEST_LIMIT });
      setItems(res.data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (nextShow) => {
    setShow(nextShow);
    if (nextShow) {
      loadLatest();
      refreshUnread();
    }
  };

  const handleOpen = async (notification) => {
    setShow(false);
    if (!notification.isRead) {
      try {
        await notificationApi.markRead(notification._id);
        refreshUnread();
      } catch (err) {
        toast.error(err.message);
      }
    }

    const link = getNotificationLink(notification, user.role);
    if (link) {
      navigate(link);
    } else {
      navigate('/notifications', { state: { openNotification: { ...notification, isRead: true } } });
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      refreshUnread();
    } catch (err) {
      toast.error(err.message);
    }
  };

  let content;
  if (loading) content = <Loading />;
  else if (error) content = <div className="px-3 py-3 text-sm text-danger">{error}</div>;
  else if (items.length === 0) content = <EmptyState message="Chưa có thông báo nào" />;
  else {
    content = items.map((notification) => (
      <Dropdown.Item
        key={notification._id}
        as="button"
        onClick={() => handleOpen(notification)}
        className={`whitespace-normal border-b border-gray-100 px-3 py-2 ${notification.isRead ? '' : 'bg-blue-50'}`}
      >
        <NotificationItem notification={notification} compact />
      </Dropdown.Item>
    ));
  }

  return (
    <Dropdown show={show} onToggle={handleToggle} align="end" autoClose="outside">
      <Dropdown.Toggle as={BellToggle} count={unreadCount} />

      <Dropdown.Menu className="w-[340px] max-w-[90vw] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
          <span className="font-semibold">Thông báo</span>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={handleMarkAll}>
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">{content}</div>

        <Dropdown.Item as={Link} to="/notifications" onClick={() => setShow(false)} className="py-2 text-center text-primary">
          Xem tất cả
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
