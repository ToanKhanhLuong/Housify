// Kiểm tra form của module termination (UC-28, 29). Trả { field: message }, rỗng là hợp lệ. Câu lỗi giống termination.validation.js BE
import { toDateInput } from '../../utils/format';

const MAX_TEXT = 1000;

// tạo đơn: loại, lý do (bắt buộc), ngày hiệu lực (bắt buộc, không ở quá khứ, nằm trong thời hạn hợp đồng), ghi chú bàn giao (tùy chọn)
export const validateCreateTermination = ({ type, reason, effectiveDate, note }, contract = null) => {
  const errors = {};
  if (!type) errors.type = 'Vui lòng chọn loại đơn chấm dứt';
  if (!reason.trim()) errors.reason = 'Vui lòng nhập lý do chấm dứt hợp đồng';
  else if (reason.trim().length > MAX_TEXT) errors.reason = 'Lý do chấm dứt hợp đồng tối đa 1000 ký tự';
  if (!effectiveDate) {
    errors.effectiveDate = 'Vui lòng chọn ngày hiệu lực chấm dứt hợp đồng';
  } else {
    const todayStr = toDateInput(new Date());
    const startStr = toDateInput(contract?.startDate);
    const endStr = toDateInput(contract?.endDate);
    if (todayStr && effectiveDate < todayStr) {
      errors.effectiveDate = 'Ngày hiệu lực không được ở quá khứ';
    } else if (startStr && effectiveDate < startStr) {
      errors.effectiveDate = 'Ngày hiệu lực không được trước ngày bắt đầu hợp đồng';
    } else if (endStr && effectiveDate > endStr) {
      errors.effectiveDate = 'Ngày hiệu lực không được vượt quá ngày kết thúc hợp đồng';
    }
  }
  if (note.trim().length > MAX_TEXT) errors.note = 'Ghi chú bàn giao tối đa 1000 ký tự';
  return errors;
};

// lý do hủy (Manager) / từ chối (Admin): bắt buộc, ≤ 1000
export const validateReason = (reason, emptyMessage) => {
  const value = reason.trim();
  if (!value) return emptyMessage;
  if (value.length > MAX_TEXT) return 'Lý do tối đa 1000 ký tự';
  return '';
};
