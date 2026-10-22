// API của module auth (UC-01..05): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const authApi = {
  // UC-01: { identifier, password, remember } → data: { token, user }
  login: (data) => api.post('/auth/login', data),
  // UC-03: { currentPassword, newPassword }
  changePassword: (data) => api.put('/auth/change-password', data),
  // UC-04 bước 1: { email } – email có tồn tại hay không cũng trả cùng một câu
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  // UC-04 bước 2: { email, otp } → data: { resetToken }
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  // UC-04 bước 3: { resetToken, newPassword }
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export default authApi;
