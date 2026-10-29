// Kiểm tra dữ liệu nhập các form của module activation (UC-08). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại. Dùng: const errors = validateActivateManager(form); if (hasErrors(errors)) …
import { PASSWORD_REGEX } from '../../constants/regex';

// UC-08 bước 7: mật khẩu tối thiểu 6 ký tự, có chữ và số (như UC-03), phải khớp ô xác nhận. Câu lỗi giống BE
export const validateActivateManager = ({ password, confirmPassword }) => {
  const errors = {};
  if (!password) errors.password = 'Vui lòng nhập mật khẩu';
  else if (!PASSWORD_REGEX.test(password))
    errors.password = 'Mật khẩu tối thiểu 6 ký tự, có chữ và số';

  if (!confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
  else if (confirmPassword !== password) errors.confirmPassword = 'Xác nhận mật khẩu không khớp';
  return errors;
};
