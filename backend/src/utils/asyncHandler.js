// Bọc controller async, đẩy lỗi sang errorHandler
// Dùng: export const create = asyncHandler(async (req, res) => { ... })
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
