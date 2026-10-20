// API module auth (UC-01..05) theo docs/api.md
import api from './axios';

export const authApi = {
  // UC-01: Đăng nhập { identifier, password, remember }
  login: async ({ identifier, password, remember }) => {
    try {
      const res = await api.post('/auth/login', { identifier, password, remember });
      return res;
    } catch (err) {
      // Khi backend chưa chạy hoặc route chưa mở, fallback mock cho FE test luồng
      if (!err.status || err.status === 404 || err.message === 'Không kết nối được máy chủ') {
        const idLower = identifier.trim().toLowerCase();

        // Tài khoản bị khóa (Demo trường hợp LOCKED)
        if (idLower === 'locked@housify.vn' || idLower === '001200000000') {
          throw { status: 403, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản lý.' };
        }

        // Manager PENDING (Demo trường hợp chưa kích hoạt)
        if (idLower === 'pending@housify.vn') {
          throw { status: 403, message: 'Tài khoản Quản lý chưa được kích hoạt. Vui lòng kiểm tra email để đặt mật khẩu.' };
        }

        // Customer INACTIVE (Demo trường hợp đã trả phòng chưa kích hoạt lại)
        if (idLower === 'inactive@housify.vn') {
          throw { status: 403, message: 'Hợp đồng của bạn chưa được kích hoạt lại. Vui lòng kiểm tra email kích hoạt.' };
        }

        // Sai mật khẩu hoặc tài khoản không tồn tại
        if (password !== '123456' && password !== 'Admin@123') {
          throw { status: 401, message: 'Tài khoản hoặc mật khẩu không chính xác' };
        }

        // Nhận diện vai trò từ identifier
        let roleId = 2; // Default Customer
        let roleName = 'Khách thuê';
        let name = 'Nguyễn Văn Đại Diện';

        if (idLower.includes('admin') || idLower === 'admin@housify.vn') {
          roleId = 0;
          roleName = 'Chủ nhà trọ (Admin)';
          name = 'Admin Housify';
        } else if (idLower.includes('manager') || idLower.includes('quanly')) {
          roleId = 1;
          roleName = 'Quản lý tòa nhà';
          name = 'Trần Quản Lý';
        }

        const mockData = {
          token: 'mock-jwt-token-' + Date.now(),
          user: {
            _id: 'usr-mock-' + roleId,
            name,
            email: idLower.includes('@') ? idLower : 'customer@housify.vn',
            cccd: !idLower.includes('@') ? idLower : '079203001234',
            roleId,
            roleName,
            status: 'ACTIVE'
          }
        };

        return { success: true, data: mockData, message: 'Đăng nhập thành công' };
      }
      throw err;
    }
  },

  // UC-03: Đổi mật khẩu { currentPassword, newPassword }
  changePassword: (data) => api.put('/auth/change-password', data),

  // UC-04: Quên mật khẩu - bước 1: gửi OTP { email }
  forgotPassword: (data) => api.post('/auth/forgot-password', data),

  // UC-04: Quên mật khẩu - bước 2: xác nhận OTP { email, otp }
  verifyOtp: (data) => api.post('/auth/verify-otp', data),

  // UC-04: Quên mật khẩu - bước 3: đặt lại mật khẩu mới { resetToken, newPassword }
  resetPassword: (data) => api.post('/auth/reset-password', data),

  // UC-05: Lấy thông tin hồ sơ
  getProfile: () => api.get('/profile'),

  // UC-05: Cập nhật thông tin hồ sơ
  updateProfile: (data) => api.put('/profile', data),
};

export default authApi;
