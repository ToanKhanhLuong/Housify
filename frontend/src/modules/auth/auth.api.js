// API của module auth (UC-01..05): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const authApi = {
  // UC-01: { identifier, password, remember } → data: { token, user }
  login: (data) => api.post('/auth/login', data),
  // UC-03: { currentPassword, newPassword }
  changePassword: (data) => api.put('/auth/change-password', data),
};

export default authApi;
