// Kiểm tra form loại phòng (UC-20). Trả { field: message }, rỗng là hợp lệ. BE vẫn kiểm lại (trùng tên…)

// tên 2–50 ký tự (docs/api.md)
export const validateRoomType = ({ name }) => {
  const value = name.trim();
  if (!value) return { name: 'Vui lòng nhập tên loại phòng' };
  if (value.length < 2 || value.length > 50) {
    return { name: 'Tên loại phòng từ 2 đến 50 ký tự' };
  }
  return {};
};
