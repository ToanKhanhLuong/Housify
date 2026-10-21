// Modal xác nhận dùng chung: xóa, khóa, đăng xuất... children để chèn thêm ô nhập (vd lý do khóa)
// loading: đang gửi → khóa nút, không cho đóng
import { Modal, Button, Spinner } from 'react-bootstrap';

export default function ConfirmModal({
  show,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'primary',
  loading = false,
  disabled = false,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <Modal show={show} onHide={onCancel} centered backdrop={loading ? 'static' : true} keyboard={!loading}>
      <Modal.Header closeButton={!loading}>
        <Modal.Title as="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {message && <p className={children ? 'mb-3' : 'mb-0'}>{message}</p>}
        {children}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={loading || disabled}>
          {loading && <Spinner animation="border" size="sm" className="me-2" />}
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
