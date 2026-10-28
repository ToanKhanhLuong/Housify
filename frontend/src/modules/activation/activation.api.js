// API của module activation: mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
// Trang công khai, chưa đăng nhập nên không có token đăng nhập; token ở đây là mã trong link email
import api from '../../api/axios';

const activationApi = {
  // UC-08 bước 6: kiểm tra link kích hoạt Manager còn hiệu lực (hết hạn / đã dùng / không tồn tại → lỗi)
  checkManagerToken: (token) => api.get(`/activation/manager/${token}`),
  // UC-08 bước 7–8: { token, password } → tài khoản PENDING → ACTIVE, link hết hiệu lực
  activateManager: (data) => api.post('/activation/manager', data),
};

export default activationApi;
