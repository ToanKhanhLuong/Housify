// UC-46: hủy hợp đồng nháp – lý do tùy chọn (tối đa 500 ký tự). Link mời hết hiệu lực, người ở cùng chuyển đi,
// phòng vẫn Trống (tạo hợp đồng mới được ngay), khách nhận email "Lời mời ký hợp đồng phòng X đã bị hủy"
import { useState } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import Input from '../../../components/Input';

const CancelContractModal = ({ contract, loading, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');

  return (
    <ConfirmModal
      show
      title="Hủy hợp đồng nháp"
      message={`Hủy hợp đồng nháp phòng ${contract.room?.roomNumber}? Link mời sẽ hết hiệu lực và khách nhận email báo hủy. Phòng vẫn Trống để tạo hợp đồng mới.`}
      confirmText="Hủy hợp đồng"
      cancelText="Đóng"
      variant="danger"
      loading={loading}
      onConfirm={() => onConfirm(reason.trim())}
      onCancel={onCancel}
    >
      <Input
        label="Lý do hủy"
        name="reason"
        as="textarea"
        rows={2}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Không bắt buộc, vd: khách đổi kế hoạch"
        maxLength={500}
        className="mb-0"
      />
    </ConfirmModal>
  );
};

export default CancelContractModal;
