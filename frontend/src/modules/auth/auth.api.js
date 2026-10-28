// API của module auth (UC-01..05): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const authApi = {
  // UC-01: { identifier, password, remember } → data: { token, user }
  login: (data) => api.post('/auth/login', data),
  // UC-03: { currentPassword, newPassword, confirmPassword } – sai mật khẩu hiện tại trả 400
  changePassword: (data) => api.put('/auth/change-password', data),
  // UC-04 bước 1: { email } – email có tồn tại hay không cũng trả cùng một câu
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  // UC-04 bước 2: { email, otp } – đúng thì chuyển bước, không trả token
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  // UC-04 bước 3: { email, otp, newPassword, confirmPassword }
  resetPassword: (data) => api.post('/auth/reset-password', data),

  // Hồ sơ của chính mình (Manager, Customer; Admin không có) → data: { _id, email, role, name, phone, dateOfBirth, address,
  // cccdFrontUrl, cccdBackUrl }; Customer có thêm cccd (chỉ xem). Không trả publicId ảnh, có link xem tức là đã có ảnh
  getProfile: () => api.get('/profile'),
  // gửi các field muốn đổi; ảnh là publicId lấy từ POST /uploads/cccd. Không đổi gì → message "Không có thông tin nào thay đổi"
  // Manager: chỉ điền lần đầu address, dateOfBirth, ảnh CCCD. Customer: sửa name, email, phone, dateOfBirth, address, ảnh; không sửa cccd
  updateProfile: (data) => api.put('/profile', data),
};

export default authApi;
