// Bắt mọi lỗi, trả về đúng format { success:false, message, errors }
// Phải khai báo đủ 4 tham số thì Express mới hiểu đây là error handler
import { fail } from '../utils/response.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi hệ thống';
  let errors = err.errors || null;

  // id sai định dạng ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Giá trị không hợp lệ';
  }

  // trùng khóa unique, VD mã phòng trùng trong cùng một tòa
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Dữ liệu đã tồn tại';
    errors = err.keyValue || null;
  }

  // lỗi validate của Mongoose
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    message = 'Dữ liệu không hợp lệ';
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // lỗi 500 thì in ra console để còn tìm, và không lộ chi tiết khi chạy thật
  if (statusCode >= 500) {
    console.error(err);
    if (env.NODE_ENV !== 'development') message = 'Lỗi hệ thống';
  }

  return fail(res, statusCode, message, errors);
};

export default errorHandler;
