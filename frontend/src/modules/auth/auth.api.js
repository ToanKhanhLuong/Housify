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

  // UC-05 hồ sơ Manager → data: { name, email, phone, address, dateOfBirth, cccdFrontImage, cccdBackImage, cccdFrontUrl, cccdBackUrl }
  getProfile: () => api.get('/profile'),
  // UC-05: chỉ gửi các trường đang trống vừa điền; ảnh là publicId lấy từ POST /uploads/cccd
  updateProfile: (data) => api.put('/profile', data),

  // Hồ sơ Customer (UC-31): tìm bản ghi của chính mình trong thành viên phòng (isRepresentative = true)
  getRoomMembers: () => api.get('/me/room-members'),
  // → data: hồ sơ cư dân kèm email, cccdFrontUrl, cccdBackUrl
  getOccupant: (id) => api.get(`/occupants/${id}`),
  updateOccupant: (id, data) => api.put(`/occupants/${id}`, data),
};

export default authApi;
