// Kiểm tra form loại phòng (UC-20). Trả { field: message }, rỗng là hợp lệ
export const validateRoomType = ({ name = '', capacity }) => {
  const errors = {};
  const trimmedName = String(name ?? '').trim();
  if (!trimmedName) {
    errors.name = 'Tên loại phòng không được để trống';
  } else if (trimmedName.length < 2 || trimmedName.length > 50) {
    errors.name = 'Tên loại phòng từ 2 đến 50 ký tự';
  }

  const capNum = Number(capacity);
  if (
    capacity === '' ||
    capacity === null ||
    capacity === undefined ||
    !Number.isInteger(capNum) ||
    capNum < 1
  ) {
    errors.capacity = 'Sức chứa phải là số nguyên lớn hơn hoặc bằng 1';
  }

  return errors;
};
