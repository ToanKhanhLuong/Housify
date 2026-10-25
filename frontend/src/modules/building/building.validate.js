// Kiểm tra dữ liệu nhập các form của module building (UC-12, 13, 15, 23). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại (trùng tên tòa, tầng còn phòng…)

// số tầng: số nguyên ≥ 1 (UC-12, UC-15 E01)
const floorCountError = (value) => {
  if (value === '' || value === null || value === undefined) return 'Vui lòng nhập số tầng';
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1)
    return 'Số tầng phải là số nguyên lớn hơn hoặc bằng 1';
  return '';
};

// UC-12 tạo: tên, địa chỉ, số tầng bắt buộc · UC-13 sửa: tên, địa chỉ bắt buộc (số tầng sửa ở UC-15)
export const validateBuilding = (form, isEdit) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Vui lòng nhập tên tòa nhà';
  if (!form.address.trim()) errors.address = 'Vui lòng nhập địa chỉ';
  if (!isEdit) {
    const floorError = floorCountError(form.floorCount);
    if (floorError) errors.floorCount = floorError;
  }
  return errors;
};

// UC-15: thêm BR-042, không giảm xuống dưới tầng cao nhất đang có phòng
export const validateFloorCount = ({ floorCount }, floors) => {
  const floorError = floorCountError(floorCount);
  if (floorError) return { floorCount: floorError };

  const blocked = floors.filter(
    (floor) => floor.floorNumber > Number(floorCount) && floor.roomCount > 0,
  );
  if (blocked.length > 0) {
    const roomTotal = blocked.reduce((sum, floor) => sum + floor.roomCount, 0);
    const highest = blocked[blocked.length - 1].floorNumber;
    return {
      floorCount: `Không thể giảm số tầng xuống dưới ${highest}: còn ${roomTotal} phòng ở các tầng bị bỏ`,
    };
  }
  return {};
};

// UC-23 E01
export const validateRules = ({ rules }) =>
  rules.trim() ? {} : { rules: 'Nội quy không được để trống' };
