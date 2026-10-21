// Trang Thông báo cho mọi role (UC-41): mới nhất trước, lọc chưa đọc, bấm để xem đầy đủ + đánh dấu đã đọc, đánh dấu tất cả
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, ListGroup, Modal, Nav, Spinner } from 'react-bootstrap';
import { FaBellSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import notificationApi from '../../api/notification.api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { getNotificationLink } from '../../constants/notificationLinks.js';
import { formatDateTime } from '../../utils/format.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Loading from '../../components/common/Loading.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Paginator from '../../components/common/Paginator.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import NotificationItem from '../../components/notification/NotificationItem.jsx';

const LIMIT = 10;

export default function NotificationsPage() {
  const { user } = useAuth();
  const { unreadCount, refreshUnread } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [filter, setFilter] = useState('all'); // all | unread
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Bấm từ chuông vào thông báo không gắn trang nào → mở luôn nội dung
  const fromBell = location.state?.openNotification || null;
  const shown = selected || fromBell;
  const shownLink = shown ? getNotificationLink(shown, user.role) : null;

  // Tăng reloadKey để tải lại trang hiện tại (sau khi đánh dấu tất cả)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true; // đổi trang / bộ lọc nhanh thì bỏ kết quả của lần gọi cũ
    notificationApi
      .list({ page, limit: LIMIT, unread: filter === 'unread' || undefined })
      .then((res) => active && setResult(res.data))
      .catch((err) => active && toast.error(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, filter, reloadKey]);

  const changeFilter = (nextFilter) => {
    if (nextFilter === filter) return;
    setLoading(true);
    setFilter(nextFilter);
    setPage(1);
  };

  const changePage = (nextPage) => {
    setLoading(true);
    setPage(nextPage);
  };

  const handleOpen = async (notification) => {
    setSelected(notification);
    if (notification.isRead) return;
    try {
      await notificationApi.markRead(notification._id);
      setResult((current) => ({
        ...current,
        items: current.items.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item)),
      }));
      refreshUnread();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      const res = await notificationApi.markAllRead();
      toast.success(res.message || 'Đã đánh dấu tất cả là đã đọc');
      refreshUnread();
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    if (fromBell) navigate(location.pathname, { replace: true, state: null });
  };

  let content;
  if (loading) content = <Loading />;
  else if (result.items.length === 0) {
    content = (
      <EmptyState
        icon={FaBellSlash}
        message={filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
      />
    );
  } else {
    content = (
      <ListGroup variant="flush">
        {result.items.map((notification) => (
          <ListGroup.Item
            key={notification._id}
            action
            onClick={() => handleOpen(notification)}
            className={`py-3 ${notification.isRead ? '' : 'bg-blue-50'}`}
          >
            <NotificationItem notification={notification} />
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  }

  return (
    <div>
      <PageHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}
        actions={
          <Button onClick={handleMarkAll} disabled={unreadCount === 0 || markingAll}>
            {markingAll && <Spinner animation="border" size="sm" className="me-2" />}
            Đánh dấu tất cả đã đọc
          </Button>
        }
      />

      <Card>
        <Card.Header className="bg-white">
          <Nav variant="tabs" className="card-header-tabs" activeKey={filter} onSelect={changeFilter}>
            <Nav.Item>
              <Nav.Link eventKey="all">Tất cả</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="unread">Chưa đọc</Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
        <Card.Body className="p-0">{content}</Card.Body>
      </Card>

      {!loading && result.total > 0 && (
        <Paginator page={page} limit={LIMIT} total={result.total} onChange={changePage} />
      )}

      <Modal show={Boolean(shown)} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{shown?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge group="NOTIFICATION_TYPE" value={shown?.type} />
            <span className="text-sm text-gray-500">{formatDateTime(shown?.createdAt)}</span>
          </div>
          <p className="mb-0 whitespace-pre-line">{shown?.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Đóng
          </Button>
          {shownLink && <Button onClick={() => navigate(shownLink)}>Xem chi tiết</Button>}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
