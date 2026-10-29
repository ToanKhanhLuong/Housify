// UC-41 bước 1: chuông trên Header. Số đỏ = số chưa đọc; bấm chuông xổ ra bảng 5 thông báo mới nhất (tab Tất cả / Chưa đọc)
// Bấm 1 thông báo: đánh dấu đã đọc rồi mở trang liên quan; không có trang liên quan thì mở trang Thông báo, hiện sẵn nội dung
// Số chưa đọc tải lại khi đổi trang, khi vừa đánh dấu đã đọc, và mỗi 30 giây; tab trình duyệt ẩn thì tạm dừng (theo docs/api.md)
import { forwardRef, useCallback, useEffect, useState } from 'react';
import { Badge, Button, Dropdown, Nav, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { BiBell } from 'react-icons/bi';
import { toast } from 'react-toastify';
import EmptyState from '../../../components/EmptyState';
import Loading from '../../../components/Loading';
import { useAuth } from '../../../context/AuthContext';
import notificationApi from '../notification.api';
import {
    NOTIFICATIONS_CHANGED,
    emitNotificationsChanged,
    formatRelative,
    renderNotificationIcon,
    getNotificationLink,
    isRecent,
} from '../notification.utils';

const REFRESH_MS = 30 * 1000;
const LATEST_LIMIT = 5; // docs/api.md: dropdown dùng ?limit=5
const TAB = { ALL: 'all', UNREAD: 'unread' };

// Nút chuông tự làm thay nút mặc định của Dropdown để không có mũi tên ▾
const BellToggle = forwardRef(({ onClick, count, 'aria-expanded': expanded }, ref) => (
    <Button
        ref={ref}
        variant="secondary"
        size="sm"
        className="flex position-relative bg-transparent border-0 text-secondary"
        aria-label={count > 0 ? `Thông báo, ${count} chưa đọc` : 'Thông báo'}
        aria-expanded={expanded}
        onClick={onClick}
    >
        <BiBell size={20} />
        {count > 0 && (
            <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                {count > 99 ? '99+' : count}
            </Badge>
        )}
    </Button>
));
BellToggle.displayName = 'BellToggle';

// Một dòng thông báo: biểu tượng theo loại, tiêu đề đậm nếu chưa đọc, thời gian tương đối, 2 dòng nội dung
const BellItem = ({ notification, onOpen }) => {
    return (
        <Dropdown.Item
            as="div"
            role="button"
            onClick={() => onOpen(notification)}
            className={`flex gap-3 px-3 py-2 text-wrap border-bottom ${notification.isRead ? '' : 'bg-primary-subtle'}`}
        >
            <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded bg-white border text-primary">
                {renderNotificationIcon(notification.type, { size: 18 })}
            </span>
            <span className="min-w-0">
                <span className="flex flex-wrap items-baseline column-gap-2">
                    <span className={notification.isRead ? '' : 'fw-semibold'}>
                        {notification.title}
                    </span>
                    <span className="small text-secondary">
                        {formatRelative(notification.createdAt)}
                    </span>
                </span>
                <span className="d-block small text-secondary line-clamp-2">
                    {notification.message}
                </span>
            </span>
        </Dropdown.Item>
    );
};

const NotificationBell = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [count, setCount] = useState(0);
    const [show, setShow] = useState(false);
    const [tab, setTab] = useState(TAB.ALL);
    const [items, setItems] = useState(null); // null: đang tải
    const [total, setTotal] = useState(0); // tổng tất cả thông báo, cho nhãn tab "Tất cả (n)"
    const [loadError, setLoadError] = useState('');
    const [markingAll, setMarkingAll] = useState(false);

    // lỗi thì giữ số cũ: số trên chuông không báo lỗi, bảng xổ xuống mới báo (UC-41 E)
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

    const loadLatest = async (nextTab) => {
        setItems(null);
        setLoadError('');
        try {
            const unread = nextTab === TAB.UNREAD;
            const response = await notificationApi.list({
                page: 1,
                limit: LATEST_LIMIT,
                unread: unread || undefined,
            });
            setItems(response.data.items);
            if (!unread) setTotal(response.data.total);
        } catch (error) {
            setLoadError(error.message);
        }
    };

    // mỗi lần mở chuông: về tab Tất cả, tải 5 thông báo mới nhất và số chưa đọc
    const handleToggle = (nextShow) => {
        setShow(nextShow);
        if (!nextShow) return;
        setTab(TAB.ALL);
        loadLatest(TAB.ALL);
        loadCount();
    };

    const handleTabChange = (nextTab) => {
        if (nextTab === tab) return;
        setTab(nextTab);
        loadLatest(nextTab);
    };

    // UC-41 bước 3: đánh dấu đã đọc rồi mở trang liên quan; không có thì mở trang Thông báo, hiện sẵn nội dung đầy đủ
    const handleOpen = async (notification) => {
        setShow(false);
        if (!notification.isRead) {
            try {
                await notificationApi.markRead(notification._id);
                emitNotificationsChanged();
            } catch (error) {
                toast.error(error.message);
            }
        }
        const link = getNotificationLink(notification, user.role);
        if (link) navigate(link);
        else
            navigate('/notifications', {
                state: { notification: { ...notification, isRead: true } },
            });
    };

    // UC-41 bước 4
    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await notificationApi.markAllRead();
            setItems((current) =>
                tab === TAB.UNREAD ? [] : current?.map((item) => ({ ...item, isRead: true })),
            );
            emitNotificationsChanged();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setMarkingAll(false);
        }
    };

    const handleViewAll = () => {
        setShow(false);
        navigate('/notifications');
    };

    const renderList = () => {
        if (loadError) return <div className="px-3 py-4 small text-danger">{loadError}</div>;
        if (!items) return <Loading />;
        if (items.length === 0)
            return (
                <EmptyState
                    message={
                        tab === TAB.UNREAD ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'
                    }
                />
            );

        const recent = items.filter((item) => isRecent(item.createdAt));
        const older = items.filter((item) => !isRecent(item.createdAt));
        return [
            ['Gần đây', recent],
            ['Cũ hơn', older],
        ]
            .filter(([, group]) => group.length > 0)
            .map(([label, group]) => (
                <div key={label}>
                    <div className="px-3 pt-2 pb-1 small fw-semibold text-secondary">{label}</div>
                    {group.map((notification) => (
                        <BellItem
                            key={notification._id}
                            notification={notification}
                            onOpen={handleOpen}
                        />
                    ))}
                </div>
            ));
    };

    return (
        <Dropdown show={show} onToggle={handleToggle} align="end" autoClose="outside">
            <Dropdown.Toggle as={BellToggle} count={count} />

            <Dropdown.Menu className="w-96 max-w-[90vw] p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                    <span className="fw-semibold">Thông báo</span>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="ms-auto"
                        onClick={handleMarkAllRead}
                        disabled={markingAll || count === 0}
                    >
                        {markingAll && <Spinner animation="border" size="sm" className="me-2" />}
                        Đánh dấu tất cả đã đọc
                    </Button>
                </div>

                <Nav
                    variant="underline"
                    activeKey={tab}
                    onSelect={handleTabChange}
                    className="px-3"
                >
                    <Nav.Item>
                        <Nav.Link eventKey={TAB.ALL}>Tất cả ({total})</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey={TAB.UNREAD}>Chưa đọc ({count})</Nav.Link>
                    </Nav.Item>
                </Nav>

                <div className="max-h-96 overflow-y-auto border-top">{renderList()}</div>

                <div className="p-2 border-top">
                    <Button variant="secondary" size="sm" className="w-100" onClick={handleViewAll}>
                        Xem tất cả
                    </Button>
                </div>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default NotificationBell;
