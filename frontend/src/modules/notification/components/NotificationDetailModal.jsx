// UC-41 bước 3: nội dung đầy đủ của thông báo không gắn trang liên quan (vd thông báo chung)
// Thông báo có trang liên quan thì chuông và trang Thông báo chuyển thẳng tới đó, không mở hộp này
import { Button, Modal } from 'react-bootstrap';
import { formatDateTime } from '../../../utils/format';

const NotificationDetailModal = ({ notification, onHide }) => (
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
            <Button variant="secondary" onClick={onHide}>
                Đóng
            </Button>
        </Modal.Footer>
    </Modal>
);

export default NotificationDetailModal;
