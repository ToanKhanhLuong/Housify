// UC-44: popup nhập ghi chú bắt buộc khi Manager đánh dấu đã giải quyết (ghi chú kết quả) hoặc từ chối (lý do)
import { useState } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import Input from '../../../components/Input';

const ResultNoteModal = ({ title, message, label, placeholder, emptyMessage, confirmText, variant, loading, onConfirm, onCancel }) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!note.trim()) {
      setError(emptyMessage);
      return;
    }
    onConfirm(note.trim());
  };

  return (
    <ConfirmModal
      show
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText="Đóng"
      variant={variant}
      loading={loading}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <Input
        label={label}
        name="resultNote"
        as="textarea"
        rows={3}
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setError('');
        }}
        error={error}
        placeholder={placeholder}
        className="mb-0"
        required
        autoFocus
      />
    </ConfirmModal>
  );
};

export default ResultNoteModal;
