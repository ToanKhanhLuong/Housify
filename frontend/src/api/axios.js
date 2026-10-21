// Instance axios dùng chung: gắn token, trả thẳng { success, data, message }, gặp 401 thì đăng xuất
// Mỗi module một file <module>.api.js trong thư mục này. Component không gọi axios trực tiếp
import axios from 'axios';
import { getToken, clearSession } from '../utils/session.js';

const api = axios.create({
  // dev: Vite proxy /api sang backend (xem vite.config.js)
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  // backend luôn trả { success, data, message } → nơi gọi dùng res.data, res.message
  (res) => res.data,
  (error) => {
    const status = error.response?.status;

    // Token hết hạn hoặc tài khoản bị khóa → xóa phiên, về trang đăng nhập
    if (status === 401) {
      clearSession();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }

    return Promise.reject({
      status,
      message: error.response?.data?.message || 'Không kết nối được máy chủ',
      errors: error.response?.data?.errors || null,
    });
  },
);

export default api;
