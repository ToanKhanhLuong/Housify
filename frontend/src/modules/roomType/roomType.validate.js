// Kiểm tra form loại phòng (UC-20). Trả { field: message }, rỗng là hợp lệ
export const validateRoomType = ({ name = '', capacity }) => {
  const errors = {};
  const trimmedName = String(name ?? '').trim();
  // BE chỉ bắt buộc có tên, không giới hạn độ dài → FE theo đúng BE
  if (!trimmedName) {
    errors.name = 'Tên loại phòng không được để trống';
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
