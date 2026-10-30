// Modal form chuẩn theo phong cách Odoo (theo Main.dc.html & BuildingDetail.dc.html):
// - Tiêu đề rõ ràng, nút đóng ✕
// - Body hỗ trợ chia 2 cột chuẩn
// - Footer: Nút chính bên trái (Lưu, Hủy), nút Xóa (nếu có) bên phải variant danger
import { Button, Modal, Spinner } from 'react-bootstrap';
import { BiX } from 'react-icons/bi';

const ModalForm = ({
    show,
    onHide,
    title,
    onSubmit,
    submitText = 'Lưu',
    cancelText = 'Hủy',
    loading = false,
    onDelete,
    deleteText = 'Xóa',
    size = 'lg',
    children,
}) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit && !loading) {
            onSubmit(e);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size={size} centered backdrop="static">
            <form onSubmit={handleSubmit}>
                <Modal.Header className="py-3 px-4 border-b border-[#eef0f2] flex items-center justify-between">
                    <Modal.Title className="text-base font-bold text-gray-900 m-0">
                        {title}
                    </Modal.Title>
                    <button
                        type="button"
                        className="w-8 h-8 flex items-center justify-center border-0 bg-transparent text-gray-500 hover:text-gray-900 rounded"
                        onClick={onHide}
                        aria-label="Đóng"
                        disabled={loading}
                    >
                        <BiX size={20} />
                    </button>
                </Modal.Header>

                <Modal.Body className="p-4">
                    {children}
                </Modal.Body>

                <Modal.Footer className="py-3 px-4 border-t border-[#eef0f2] flex items-center justify-between">
                    {/* Nút thao tác chính luôn bên trái */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-1.5"
                        >
                            {loading && <Spinner animation="border" size="sm" />}
                            <span>{submitText}</span>
                        </Button>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={onHide}
                            disabled={loading}
                        >
                            {cancelText}
                        </Button>
                    </div>

                    {/* Nút xóa (nếu có) nằm bên phải */}
                    {onDelete && (
                        <Button
                            variant="danger"
                            type="button"
                            onClick={onDelete}
                            disabled={loading}
                        >
                            {deleteText}
                        </Button>
                    )}
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default ModalForm;
