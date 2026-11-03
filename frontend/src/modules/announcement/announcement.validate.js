// Kiểm tra form gửi thông báo (UC-40). Trả { field: message }, rỗng là hợp lệ
// Theo announcement.md: tiêu đề, nội dung bắt buộc; chọn phòng thì phải chọn ít nhất 1 phòng
export const validateAnnouncement = ({ title, message, target, roomIds }) => {
  const errors = {};
  if (!title.trim()) errors.title = 'Vui lòng nhập tiêu đề';
  if (!message.trim()) errors.message = 'Vui lòng nhập nội dung';
  if (target === 'ROOMS' && roomIds.length === 0) errors.roomIds = 'Vui lòng chọn ít nhất 1 phòng';
  return errors;
};
