// Kiểm tra dữ liệu nhập các form của module building (UC-12, 13, 15, 23). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại (trùng tên tòa, tầng còn phòng…)

// Câu lỗi giống Joi bên BE (building.validation.js) để FE hay BE bắt thì người dùng cũng thấy cùng một câu

// số tầng: số nguyên ≥ 1 (UC-12, UC-15 E01)
const floorCountError = (value) => {
  if (value === '' || value === null || value === undefined) return 'Vui lòng nhập số tầng';
  const number = Number(value);
  if (!Number.isInteger(number)) return 'Số tầng phải là số nguyên';
  if (number < 1) return 'Số tầng phải lớn hơn hoặc bằng 1';
  return '';
};

// UC-12 tạo: tên, địa chỉ, số tầng bắt buộc · UC-13 sửa: tên, địa chỉ bắt buộc (số tầng sửa ở UC-15)
export const validateBuilding = (form, isEdit) => {
  const errors = {};
  const name = form.name.trim();
  const address = form.address.trim();
  if (!name) errors.name = 'Vui lòng nhập tên tòa nhà';
  else if (name.length < 2) errors.name = 'Tên tòa nhà tối thiểu 2 ký tự';
  if (!address) errors.address = 'Vui lòng nhập địa chỉ tòa nhà';
  else if (address.length < 5) errors.address = 'Địa chỉ tối thiểu 5 ký tự';
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
