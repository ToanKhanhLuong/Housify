// UC-41: trang thông báo đầy đủ (cả 3 role) theo mockup docs/mock/Notifications.dc.html, vào bằng chuông → "Xem tất cả"
// Mới nhất trước, chưa đọc có nền nhạt, chấm màu và chữ đậm; lọc Tất cả / Chưa đọc
// Bấm dòng → đánh dấu đã đọc; có trang liên quan thì chuyển thẳng tới đó (giống chuông), không có thì hiện nội dung đầy đủ
// Từ chuông mở sang (thông báo không có trang liên quan) thì hiện sẵn nội dung thông báo đó
import { useCallback, useEffect, useState } from 'react';
import { Button, ButtonGroup, Card, ListGroup, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { NOTIFICATION_TYPE_LABEL } from '../../constants/statusLabels';
import { useAuth } from '../../context/AuthContext';
import { useSavedState } from '../../utils/filter';
import notificationApi from './notification.api';
import {
    NOTIFICATIONS_CHANGED,
    emitNotificationsChanged,
    formatRelative,
    getNotificationLink,
} from './notification.utils';
import NotificationDetailModal from './components/NotificationDetailModal';

const LIMIT = 10;

const NotificationsPage = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const fromBell = location.state?.notification ?? null; // thông báo chuông gửi sang để hiện sẵn
    const [data, setData] = useState(null); // { items, total, page, limit }; null: đang tải
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useSavedState('notifications:page', 1);
    const [unreadOnly, setUnreadOnly] = useSavedState('notifications:unreadOnly', false);
    const [loadError, setLoadError] = useState('');
    const [viewing, setViewing] = useState(null); // thông báo đang xem nội dung đầy đủ
    const [submitting, setSubmitting] = useState(false);

    // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
    const loadNotifications = useCallback(
        () =>
            Promise.all([
                notificationApi.list({ page, limit: LIMIT, unread: unreadOnly || undefined }),
                notificationApi.unreadCount(),
            ])
                .then(([listResponse, countResponse]) => {
                    setData(listResponse.data);
                    setUnreadCount(countResponse.data.count);
                    setLoadError('');
                })
                .catch((error) => setLoadError(error.message)), // E: lỗi tải danh sách
        [page, unreadOnly],
    );

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // chuông vừa đánh dấu đã đọc (đang đứng ở trang này) thì tải lại cho khớp
    useEffect(() => {
        window.addEventListener(NOTIFICATIONS_CHANGED, loadNotifications);
        return () => window.removeEventListener(NOTIFICATIONS_CHANGED, loadNotifications);
    }, [loadNotifications]);

    // đóng nội dung; nếu đang hiện thông báo chuông gửi sang thì xóa khỏi lịch sử để F5 không mở lại
    const handleCloseDetail = () => {
        setViewing(null);
        if (fromBell) navigate(location.pathname, { replace: true, state: null });
    };

    const handleFilterChange = (nextUnreadOnly) => {
        if (nextUnreadOnly === unreadOnly) return;
        setUnreadOnly(nextUnreadOnly);
        setPage(1);
        setData(null);
        setLoadError('');
    };

    const handlePageChange = (nextPage) => {
        setPage(nextPage);
        setData(null);
        setLoadError('');
    };

    const handleRetry = () => {
        setData(null);
        setLoadError('');
        loadNotifications();
    };

    // bước 3: đánh dấu đã đọc; có trang liên quan thì chuyển tới đó, không có thì hiện nội dung đầy đủ
    const handleOpen = async (notification) => {
        const link = getNotificationLink(notification, user.role);
        if (!link) setViewing(notification);
        if (!notification.isRead) {
            try {
                await notificationApi.markRead(notification._id);
                setData((current) => ({
                    ...current,
                    items: current.items.map((item) =>
                        item._id === notification._id ? { ...item, isRead: true } : item,
                    ),
                }));
                setUnreadCount((count) => Math.max(count - 1, 0));
                emitNotificationsChanged();
            } catch (error) {
                toast.error(error.message);
            }
        }
        if (link) navigate(link);
    };

    // bước 4
    const handleMarkAllRead = async () => {
        setSubmitting(true);
        try {
            await notificationApi.markAllRead();
            toast.success('Đã đánh dấu tất cả đã đọc');
            emitNotificationsChanged(); // trang và chuông cùng tải lại theo sự kiện này
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const renderContent = () => {
        if (loadError) {
            return (
                <ErrorState
                    message="Không tải được danh sách thông báo"
                    detail={loadError}
                    onRetry={handleRetry}
                />
            );
        }
        if (!data) return <SkeletonRows rows={5} columns={2} />;
        if (data.items.length === 0) {
            return (
                <EmptyState
                    message={unreadOnly ? 'Không có thông báo chưa đọc.' : 'Chưa có thông báo nào'}
                />
            );
        }
        return (
            <ListGroup variant="flush">
                {data.items.map((item) => (
                    <ListGroup.Item
                        key={item._id}
                        action
                        onClick={() => handleOpen(item)}
                        className={`flex gap-3 py-3 text-body ${item.isRead ? '' : 'bg-primary-subtle'}`}
                    >
                        <span
                            className={`mt-2 w-2 h-2 shrink-0 rounded-circle ${item.isRead ? 'bg-body-secondary' : 'bg-primary'}`}
                        />
                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between column-gap-3">
                                <span className={item.isRead ? '' : 'fw-semibold'}>
                                    {item.title}
                                </span>
                                <span className="small text-secondary text-nowrap">
                                    {formatRelative(item.createdAt)}
                                </span>
                            </span>
                            <span className="d-block small text-secondary mb-1">
                                {item.message}
                            </span>
                            <StatusBadge map={NOTIFICATION_TYPE_LABEL} value={item.type} />
                        </span>
                    </ListGroup.Item>
                ))}
            </ListGroup>
        );
    };

    return (
        <>
            <PageHeader
                title="Thông báo"
                actions={
                    <>
                        <ButtonGroup aria-label="Lọc thông báo">
                            <Button
                                variant={unreadOnly ? 'secondary' : 'primary'}
                                onClick={() => handleFilterChange(false)}
                            >
                                Tất cả
                            </Button>
                            <Button
                                variant={unreadOnly ? 'primary' : 'secondary'}
                                onClick={() => handleFilterChange(true)}
                            >
                                Chưa đọc ({unreadCount})
                            </Button>
                        </ButtonGroup>
                        <Button
                            variant="secondary"
                            onClick={handleMarkAllRead}
                            disabled={submitting || unreadCount === 0}
                        >
                            {submitting && (
                                <Spinner animation="border" size="sm" className="me-2" />
                            )}
                            Đánh dấu tất cả đã đọc
                        </Button>
                    </>
                }
            >
                {data && (
                    <Pager
                        page={data.page}
                        limit={data.limit}
                        total={data.total}
                        onChange={handlePageChange}
                    />
                )}
            </PageHeader>

            <Card>{renderContent()}</Card>

            {(viewing ?? fromBell) && (
                <NotificationDetailModal
                    notification={viewing ?? fromBell}
                    onHide={handleCloseDetail}
                />
            )}
        </>
    );
};

export default NotificationsPage;
