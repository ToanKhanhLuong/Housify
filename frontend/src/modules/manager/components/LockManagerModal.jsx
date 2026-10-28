// UC-10: khóa Manager đang hoạt động, bắt buộc nhập lý do. Tòa còn hợp đồng hiệu lực thì cảnh báo nhưng vẫn cho khóa
import { useState } from 'react';
import { Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ConfirmModal from '../../../components/ConfirmModal';
import Input from '../../../components/Input';
import { hasErrors } from '../../../utils/formErrors';
import managerApi from '../manager.api';
import { validateLockReason } from '../manager.validate';

const LockManagerModal = ({ manager, onHide, onDone }) => {
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // BE trả số hợp đồng ACTIVE trong building: { _id, name, address, activeContractCount }
  const { building } = manager;
  const hasActiveContracts = building?.activeContractCount > 0;

  const handleLock = async () => {
    const clientErrors = validateLockReason({ reason });
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const response = await managerApi.lock(manager._id, { reason: reason.trim() });
      // gửi mail báo Manager lỗi: tài khoản vẫn bị khóa
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Đã khóa tài khoản Manager');
      onDone();
    } catch (error) {
      if (error.errors) setErrors({ reason: error.errors[0]?.message });
      else toast.error(error.message);
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      show
      title="Khóa tài khoản Manager"
      message={`Khóa tài khoản của ${manager.name}? Manager sẽ bị đăng xuất ngay và không đăng nhập được nữa.`}
      confirmText="Khóa"
      variant="danger"
      loading={submitting}
      onConfirm={handleLock}
      onCancel={onHide}
    >
      {hasActiveContracts && (
        <Alert variant="warning">
          {building.name} đang có {building.activeContractCount} hợp đồng đang hiệu lực. Khóa xong
          vẫn giữ phân công tòa, hãy phân công Manager khác tiếp quản.
        </Alert>
      )}
      <Input
        label="Lý do khóa"
        name="reason"
        as="textarea"
        rows={3}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={errors.reason}
        className="mb-0"
        required
      />
    </ConfirmModal>
  );
};

export default LockManagerModal;
