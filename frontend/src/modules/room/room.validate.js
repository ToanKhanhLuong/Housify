// Kiểm tra dữ liệu nhập form phòng (UC-16, UC-17). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại (trùng mã phòng, sức chứa < số người đang ở…)

const isBlank = (value) => value === '' || value === null || value === undefined;

// số > 0 (diện tích, giá thuê, tiền cọc – BR-045)
const positiveError = (value, name) => {
  if (isBlank(value)) return `Vui lòng nhập ${name}`;
  return Number(value) > 0 ? '' : `${name[0].toUpperCase()}${name.slice(1)} phải lớn hơn 0`;
};

export const validateRoom = (form, isEdit) => {
  const errors = {};
  if (!isEdit && !form.roomNumber.trim()) errors.roomNumber = 'Vui lòng nhập mã phòng';
  if (!form.floorNumber) errors.floorNumber = 'Vui lòng chọn tầng';
  if (!form.roomTypeId) errors.roomTypeId = 'Vui lòng chọn loại phòng';

  const fields = [
    ['area', 'diện tích'],
    ['rentPrice', 'giá thuê'],
    ['deposit', 'tiền cọc'],
  ];
  fields.forEach(([field, name]) => {
    const error = positiveError(form[field], name);
    if (error) errors[field] = error;
  });

  // BR-045: sức chứa là số nguyên ≥ 1
  if (isBlank(form.capacity)) errors.capacity = 'Vui lòng nhập sức chứa';
  else if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1)
    errors.capacity = 'Sức chứa phải là số nguyên lớn hơn hoặc bằng 1';

  return errors;
};
