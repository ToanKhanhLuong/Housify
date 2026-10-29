// UC-41: xem thông báo (cả 3 role). Mới nhất trước, chưa đọc có chấm xanh và chữ đậm
// Bấm dòng → hiện nội dung đầy đủ, đồng thời đánh dấu đã đọc; có trang liên quan thì mở tiếp từ đó
// Từ chuông mở sang (thông báo không có trang liên quan) thì hiện sẵn nội dung thông báo đó
import { useCallback, useEffect, useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Pager from '../../components/Pager';
import Select from '../../components/Select';
import { formatDateTime } from '../../utils/format';
import notificationApi from './notification.api';
import { NOTIFICATIONS_CHANGED, emitNotificationsChanged } from './notification.utils';
import NotificationDetailModal from './components/NotificationDetailModal';

const LIMIT = 10;
const FILTER_OPTIONS = [{ value: 'unread', label: 'Chưa đọc' }];

const NotificationsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const fromBell = location.state?.notification ?? null; // thông báo chuông gửi sang để hiện sẵn
    const [data, setData] = useState(null); // { items, total, page, limit }; null: đang tải
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [unreadOnly, setUnreadOnly] = useState(false);
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
                })
                .catch((error) => toast.error(error.message)), // E: lỗi tải danh sách
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

    const handleFilterChange = (event) => {
        setUnreadOnly(event.target.value === 'unread');
        setPage(1);
        setData(null);
    };

    const handlePageChange = (nextPage) => {
        setPage(nextPage);
        setData(null);
    };

    // bước 3: hiện nội dung đầy đủ + đánh dấu đã đọc
    const handleOpen = async (notification) => {
        setViewing(notification);
        if (notification.isRead) return;
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

    const columns = [
        {
            key: 'title',
            title: 'Thông báo',
            render: (row) => (
                <div className="flex gap-2">
                    <span
                        className={`mt-2 w-2 h-2 shrink-0 rounded-circle ${row.isRead ? '' : 'bg-primary'}`}
                    />
                    <div className="min-w-0">
                        <div className={row.isRead ? '' : 'fw-semibold'}>{row.title}</div>
                        <div className="small text-secondary line-clamp-1">{row.message}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'createdAt',
            title: 'Thời gian',
            className: 'text-nowrap text-secondary',
            render: (row) => formatDateTime(row.createdAt),
        },
    ];

    return (
        <>
            <PageHeader
                title="Thông báo"
                subtitle={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : undefined}
                actions={
                    <Button
                        variant="primary"
                        onClick={handleMarkAllRead}
                        disabled={submitting || unreadCount === 0}
                    >
                        {submitting && <Spinner animation="border" size="sm" className="me-2" />}
                        Đánh dấu tất cả đã đọc
                    </Button>
                }
            >
                <Select
                    name="filter"
                    aria-label="Lọc thông báo"
                    options={FILTER_OPTIONS}
                    placeholder="Tất cả"
                    value={unreadOnly ? 'unread' : ''}
                    onChange={handleFilterChange}
                    className="mb-0"
                />
                {data && (
                    <Pager
                        page={data.page}
                        limit={data.limit}
                        total={data.total}
                        onChange={handlePageChange}
                    />
                )}
            </PageHeader>

            <DataTable
                columns={columns}
                data={data?.items ?? []}
                loading={!data}
                emptyMessage={unreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                onRowClick={handleOpen}
            />

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
