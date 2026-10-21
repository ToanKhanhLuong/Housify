// Hàm phụ cho mock module tòa nhà / phòng / loại phòng: trả về và ném lỗi ĐÚNG dạng như api/axios.js
//   thành công → { success: true, data, message }      lỗi → ném { status, message, errors }
import { getStoredUser } from '../utils/session.js';

const DELAY_MS = 300;
const sleep = () => new Promise((resolve) => setTimeout(resolve, DELAY_MS));

export const respond = async (data, message = 'Thành công') => {
  await sleep();
  // trả bản sao để trang có sửa object cũng không làm hỏng dữ liệu mock
  return { success: true, data: structuredClone(data), message };
};

export const reject = async (status, message, errors = null) => {
  await sleep();
  throw { status, message, errors };
};

// Lỗi validate kiểu Joi của backend: [{ field, message }]
export const invalid = (errors) => reject(422, 'Dữ liệu không hợp lệ', errors);

// Id giả dạng ObjectId 24 ký tự hex
export const newId = () =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

export const now = () => new Date().toISOString();

// So sánh tên không phân biệt hoa thường / khoảng trắng thừa (kiểm tra trùng tên)
export const sameText = (a, b) =>
  String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// Người đang đăng nhập (user lưu sau khi gọi /auth/me): { id, role, building? }
export const currentUser = () => getStoredUser();
