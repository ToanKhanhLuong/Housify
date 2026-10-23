// Kiểm tra dữ liệu nhập các form của module auth (UC-01, 03, 04). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại. Dùng: const errors = validateLogin(form); if (hasErrors(errors)) …
import { EMAIL_REGEX, PASSWORD_REGEX } from '../../constants/regex';

const OTP_REGEX = /^\d{4}$/; // OTP 4 chữ số (UC-04)

// Mật khẩu mới + ô xác nhận: tối thiểu 6 ký tự, có cả chữ và số (UC-03), dùng chung cho UC-03 và UC-04
const validateNewPassword = ({ newPassword, confirmPassword }) => {
  const errors = {};
  if (!newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới';
  else if (!PASSWORD_REGEX.test(newPassword))
    errors.newPassword = 'Mật khẩu tối thiểu 6 ký tự, có cả chữ và số';

  if (!confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  return errors;
};

// UC-01: một ô định danh chung (email hoặc CCCD), BE tự nhận biết nên FE chỉ kiểm trống
export const validateLogin = ({ identifier, password }) => {
  const errors = {};
  if (!identifier.trim()) errors.identifier = 'Vui lòng nhập email hoặc số CCCD';
  if (!password) errors.password = 'Vui lòng nhập mật khẩu';
  return errors;
};

// UC-03: thêm điều kiện mật khẩu mới khác mật khẩu hiện tại
export const validateChangePassword = (form) => {
  const errors = validateNewPassword(form);
  if (!form.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
  if (!errors.newPassword && form.newPassword === form.currentPassword)
    errors.newPassword = 'Mật khẩu mới không được trùng mật khẩu hiện tại';
  return errors;
};

// UC-04 bước 1
export const validateForgotEmail = ({ email }) => {
  const errors = {};
  if (!email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Email không đúng định dạng';
  return errors;
};

// UC-04 bước 2
export const validateOtp = ({ otp }) => {
  const errors = {};
  if (!otp) errors.otp = 'Vui lòng nhập mã OTP';
  else if (!OTP_REGEX.test(otp)) errors.otp = 'Mã OTP gồm 4 chữ số';
  return errors;
};

// UC-04 bước 3: trùng mật khẩu cũ do BE kiểm (FE không biết mật khẩu cũ)
export const validateResetPassword = validateNewPassword;
