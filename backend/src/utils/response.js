// Chuẩn response cho MỌI API: { success, data, message }. Không tự res.json ở nơi khác.

export const ok = (res, data = null, message = 'Thành công') =>
  res.status(200).json({ success: true, data, message });

export const created = (res, data = null, message = 'Tạo thành công') =>
  res.status(201).json({ success: true, data, message });

export const fail = (res, statusCode = 400, message = 'Có lỗi xảy ra', errors = null) =>
  res.status(statusCode).json({ success: false, message, errors });
