// UC-41 bước 3: nội dung đầy đủ của một thông báo. Có trang liên quan (theo type + refId) thì có nút mở trang đó
import { Button, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { formatDateTime } from '../../../utils/format';
import { getNotificationLink } from '../notification.utils';

const NotificationDetailModal = ({ notification, onHide }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const link = getNotificationLink(notification, user.role);

    return (
        <Modal show onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title className="h5">{notification.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="small text-secondary mb-3">
                    {formatDateTime(notification.createdAt)}
                </div>
                <div className="whitespace-pre-line">{notification.message}</div>
            </Modal.Body>
            <Modal.Footer className="justify-content-start">
                {link && (
                    <Button variant="primary" onClick={() => navigate(link)}>
                        Xem chi tiết
                    </Button>
                )}
                <Button variant="secondary" onClick={onHide}>
                    Đóng
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default NotificationDetailModal;
