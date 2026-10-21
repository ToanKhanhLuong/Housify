// Instance axios dùng chung: gắn token, trả thẳng { success, data, message }, gặp 401 thì đăng xuất
// Mỗi module gọi API qua modules/<module>/<module>.api.js. Component không import axios trực tiếp
import axios from 'axios';
import { getToken, clearToken } from '../utils/session';

const api = axios.create({
  // dev: Vite proxy /api sang backend. Deploy: đặt VITE_API_URL trên trang hosting
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

    // đã gửi token mà BE vẫn từ chối → phiên đã chết; AuthContext bắt sự kiện, ProtectedRoute đưa về /login
    if (status === 401 && error.config?.headers?.Authorization) {
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
    }


    // nơi gọi nhận { status, message, errors }; errors là mảng lỗi từng ô khi 422
    return Promise.reject({
      status,
      message: error.response?.data?.message || 'Không kết nối được máy chủ',
      errors: error.response?.data?.errors || null,
    });
  },
);

export default api;