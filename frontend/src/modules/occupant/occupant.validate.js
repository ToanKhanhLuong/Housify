// Kiểm tra form của module occupant (UC-31 sửa, UC-32 thêm, UC-33 rời phòng). Trả { field: message }, rỗng là hợp lệ
// Câu lỗi giống occupant.validation.js của BE
import { CCCD_REGEX, PHONE_REGEX } from '../../constants/regex';

const pad = (value) => String(value).padStart(2, '0');

// hôm nay dạng yyyy-MM-dd (giờ máy) – so sánh được với giá trị ô <input type="date">
export const todayInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// họ tên, CCCD, SĐT, ngày sinh bắt buộc; địa chỉ, quan hệ không bắt buộc
export const validateOccupant = (form) => {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Vui lòng nhập họ tên';
  else if (name.length > 100) errors.name = 'Họ tên tối đa 100 ký tự';

  const cccd = form.cccd.trim();
  if (!cccd) errors.cccd = 'Vui lòng nhập số CCCD';
  else if (!CCCD_REGEX.test(cccd)) errors.cccd = 'Số CCCD phải gồm đúng 12 chữ số';

  const phone = form.phone.trim();
  if (!phone) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!PHONE_REGEX.test(phone))
    errors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';

  if (!form.dateOfBirth) errors.dateOfBirth = 'Vui lòng nhập ngày sinh';
  else if (form.dateOfBirth > todayInput()) errors.dateOfBirth = 'Ngày sinh không được ở tương lai';

  if (form.address.trim().length > 255) errors.address = 'Địa chỉ tối đa 255 ký tự';
  if (form.relationship.trim().length > 50)
    errors.relationship = 'Quan hệ với người đại diện tối đa 50 ký tự';
  return errors;
};

// UC-33: ngày chuyển ra không trước ngày vào ở; ghi chú ≤ 500
export const validateLeave = ({ exitDate, note }, joinDate) => {
  const errors = {};
  if (!exitDate) errors.exitDate = 'Vui lòng chọn ngày chuyển ra';
  else if (joinDate && exitDate < joinDate)
    errors.exitDate = 'Ngày chuyển ra không được trước ngày bắt đầu ở';
  if (note.length > 500) errors.note = 'Ghi chú tối đa 500 ký tự';
  return errors;
};
