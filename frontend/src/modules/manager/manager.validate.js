// Kiểm tra dữ liệu nhập các form của module manager (UC-08..11). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại (trùng email, SĐT…). Dùng: if (hasErrors(validateManagerCreate(form))) …
import { EMAIL_REGEX, PHONE_REGEX } from '../../constants/regex';

// họ tên, email, SĐT: bắt buộc cả ba (UC-08 bước 1), Admin sửa cũng theo quy tắc này (UC-09)
const validateContact = ({ name, email, phone }) => {
  const errors = {};
  if (!name.trim()) errors.name = 'Vui lòng nhập họ tên';

  if (!email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Email không hợp lệ';

  if (!phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!PHONE_REGEX.test(phone.trim())) errors.phone = 'Số điện thoại không hợp lệ';
  return errors;
};

// UC-08
export const validateManagerCreate = validateContact;

// UC-09
export const validateManagerEdit = (form) => {
  const errors = validateContact(form);
  if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date())
    errors.dateOfBirth = 'Ngày sinh không hợp lệ';
  return errors;
};

// UC-10: lý do khóa bắt buộc
export const validateLockReason = ({ reason }) =>
  reason.trim() ? {} : { reason: 'Vui lòng nhập lý do khóa' };

// UC-11
export const validateAssignBuilding = ({ buildingId }) =>
  buildingId ? {} : { buildingId: 'Vui lòng chọn tòa nhà' };
