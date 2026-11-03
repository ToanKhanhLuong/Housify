// Popup nhập lý do bắt buộc: Manager hủy đơn đang chờ (UC-28, 29), Admin từ chối đơn đơn phương (UC-29)
import { useState } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import Input from '../../../components/Input';
import { validateReason } from '../termination.validate';

const ReasonModal = ({ title, message, label, placeholder, emptyMessage, confirmText, loading, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const nextError = validateReason(reason, emptyMessage);
    setError(nextError);
    if (!nextError) onConfirm(reason.trim());
  };

  return (
    <ConfirmModal
      show
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText="Đóng"
      variant="danger"
      loading={loading}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <Input
        label={label}
        name="reason"
        as="textarea"
        rows={3}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          setError('');
        }}
        error={error}
        placeholder={placeholder}
        maxLength={1000}
        className="mb-0"
        required
        autoFocus
      />
    </ConfirmModal>
  );
};

export default ReasonModal;
