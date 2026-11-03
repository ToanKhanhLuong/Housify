// UC-33: người ở cùng chuyển ra khi hợp đồng vẫn hiệu lực → Đã chuyển đi + ngày ra. Không xóa hồ sơ (giữ lịch sử cư trú)
// Ngày chuyển ra mặc định hôm nay, không trước ngày vào ở; ghi chú tùy chọn
import { useState } from 'react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../../components/ConfirmModal';
import Input from '../../../components/Input';
import { formatDate, toDateInput } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import occupantApi from '../occupant.api';
import { todayInput, validateLeave } from '../occupant.validate';

const LeaveOccupantModal = ({ occupant, onHide, onSaved }) => {
  const joinDate = toDateInput(occupant.joinDate);
  const [form, setForm] = useState(() => ({ exitDate: todayInput(), note: '' }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setErrors({});
  };

  const handleConfirm = async () => {
    const clientErrors = validateLeave(form, joinDate);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    const note = form.note.trim();
    setSubmitting(true);
    try {
      const response = await occupantApi.leave(occupant._id, {
        exitDate: form.exitDate,
        ...(note && { note }),
      });
      toast.success(response.message || `${occupant.name} đã chuyển đi`);
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors));
      if (!error.errors) toast.error(error.message);
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      show
      title="Cho người ở cùng rời phòng"
      message={`${occupant.name} sẽ chuyển sang "Đã chuyển đi" và không còn tính vào số người đang ở của phòng ${occupant.room?.roomNumber ?? ''}. Hồ sơ vẫn được giữ lại.`}
      confirmText="Xác nhận rời phòng"
      cancelText="Đóng"
      variant="danger"
      loading={submitting}
      onConfirm={handleConfirm}
      onCancel={onHide}
    >
      <Input
        label="Ngày chuyển ra"
        name="exitDate"
        type="date"
        min={joinDate}
        value={form.exitDate}
        onChange={handleChange}
        error={errors.exitDate}
        helpText={`Không trước ngày vào ở (${formatDate(occupant.joinDate)})`}
        required
      />
      <Input
        label="Ghi chú"
        name="note"
        as="textarea"
        rows={2}
        value={form.note}
        onChange={handleChange}
        error={errors.note}
        placeholder="Vd: chuyển về quê, đã bàn giao chìa khóa"
        maxLength={500}
        className="mb-0"
      />
    </ConfirmModal>
  );
};

export default LeaveOccupantModal;
