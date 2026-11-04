// Kiểm tra form của module incident (UC-43). Trả { field: message }, rỗng là hợp lệ. Câu lỗi giống incident.validation.js BE
export const validateIncident = ({ type, title, description }) => {
  const errors = {};
  if (!type) errors.type = 'Vui lòng chọn loại sự cố';
  if (!title.trim()) errors.title = 'Vui lòng nhập tiêu đề';
  if (!description.trim()) errors.description = 'Vui lòng nhập mô tả chi tiết';
  return errors;
};
