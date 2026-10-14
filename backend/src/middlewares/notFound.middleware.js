// Trả 404 cho đường dẫn không tồn tại
import { fail } from '../utils/response.js';

export const notFound = (req, res) =>
  fail(res, 404, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`);

export default notFound;
