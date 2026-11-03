// UC-37: hủy hóa đơn Nháp / Chờ thanh toán, lý do bắt buộc (≥ 3 ký tự như BE). Đang chờ thanh toán thì khách được báo
import { useState } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import Input from '../../../components/Input';
import { INVOICE_STATUS } from '../../../constants/enums';
import { validateCancelReason } from '../invoice.validate';

const CancelInvoiceModal = ({ invoice, show, loading, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const errors = validateCancelReason(reason);
    setError(errors.reason ?? '');
    if (errors.reason) return;
    onConfirm(reason.trim());
  };

  const message =
    invoice.status === INVOICE_STATUS.PENDING
      ? `Hủy hóa đơn ${invoice.invoiceCode}? Khách đang chờ thanh toán sẽ nhận thông báo hóa đơn bị hủy, mã QR cũ hết dùng.`
      : `Hủy hóa đơn nháp ${invoice.invoiceCode}?`;

  return (
    <ConfirmModal
      show={show}
      title="Hủy hóa đơn"
      message={message}
      confirmText="Hủy hóa đơn"
      cancelText="Đóng"
      variant="danger"
      loading={loading}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <Input
        label="Lý do hủy"
        name="reason"
        as="textarea"
        rows={3}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          setError('');
        }}
        error={error}
        placeholder="Vd: nhập sai chỉ số điện"
        helpText="Lý do được lưu cùng hóa đơn. Hủy xong có thể lập lại hóa đơn đúng."
        maxLength={500}
        className="mb-0"
        required
        autoFocus
      />
    </ConfirmModal>
  );
};

export default CancelInvoiceModal;
