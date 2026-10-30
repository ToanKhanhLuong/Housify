// Kiểm tra dữ liệu nhập form phòng (UC-16, UC-17). Trả { field: message }, rỗng là hợp lệ
// Sức chứa đã chuyển sang loại phòng, phòng không còn capacity

const isBlank = (value) => value === '' || value === null || value === undefined;

export const validateRoom = (form, isEdit) => {
  const errors = {};
  if (!isEdit && !String(form.roomNumber ?? '').trim()) {
    errors.roomNumber = 'Vui lòng nhập mã phòng';
  }
  if (!form.floorNumber) {
    errors.floorNumber = 'Vui lòng chọn tầng';
  }
  if (!form.roomTypeId) {
    errors.roomTypeId = 'Vui lòng chọn loại phòng';
  }

  // Diện tích > 0
  if (isBlank(form.area)) {
    errors.area = 'Vui lòng nhập diện tích';
  } else if (!(Number(form.area) > 0)) {
    errors.area = 'Diện tích phải lớn hơn 0';
  }

  // Giá thuê > 0
  if (isBlank(form.rentPrice)) {
    errors.rentPrice = 'Vui lòng nhập giá thuê';
  } else if (!(Number(form.rentPrice) > 0)) {
    errors.rentPrice = 'Giá thuê phải lớn hơn 0';
  }

  // Tiền cọc > 0
  if (isBlank(form.deposit)) {
    errors.deposit = 'Vui lòng nhập tiền cọc';
  } else if (!(Number(form.deposit) > 0)) {
    errors.deposit = 'Tiền cọc phải lớn hơn 0';
  }

  return errors;
};
