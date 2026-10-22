// Hộp xác nhận cho thao tác quan trọng (UC nào ghi "hiển thị xác nhận" thì dùng cái này)
// <ConfirmModal show={Boolean(deleting)} title="Xóa phòng" message="Bạn chắc chắn muốn xóa phòng P101?"
//   variant="danger" confirmText="Xóa" loading={submitting} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
// Cần nhập lý do (UC-10 khóa, UC-37 hủy hóa đơn...) thì đặt <Input as="textarea" ... /> làm children
import { Button, Modal, Spinner } from 'react-bootstrap';

const ConfirmModal = ({
    show,
    title = 'Xác nhận',
    message,
    children,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'primary',
    loading = false,
    onConfirm,
    onCancel,
}) => (
    <Modal
        show={show}
        onHide={onCancel}
        centered
        backdrop={loading ? 'static' : true}
        keyboard={!loading}
    >
        <Modal.Header closeButton={!loading}>
            <Modal.Title className="h5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            {message && <p className={children ? 'mb-3' : 'mb-0'}>{message}</p>}
            {children}
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
            <Button variant={variant} onClick={onConfirm} disabled={loading}>
                {loading && <Spinner animation="border" size="sm" className="me-2" />}
                {confirmText}
            </Button>
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
                {cancelText}
            </Button>
        </Modal.Footer>
    </Modal>
);

export default ConfirmModal;