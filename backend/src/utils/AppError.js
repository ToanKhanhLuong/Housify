// Lớp lỗi nghiệp vụ có statusCode
// Dùng trong service: throw new AppError('Phòng đã có người thuê', 409)
export class AppError extends Error {
  constructor(message, statusCode = 400, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
