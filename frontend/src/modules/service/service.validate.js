// Kiểm tra dữ liệu nhập các form của module service (UC-21). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại (trùng tên…). Dùng: if (hasErrors(validateService(form))) …

// UC-21: tên, đơn vị tính, cách tính đều bắt buộc. isFixed trong form là chuỗi 'true' / 'false', '' là chưa chọn
export const validateService = ({ name, unit, isFixed }) => {
    const errors = {};
    if (!name.trim()) errors.name = 'Vui lòng nhập tên dịch vụ';
    if (!unit.trim()) errors.unit = 'Vui lòng nhập đơn vị tính';
    if (!isFixed) errors.isFixed = 'Vui lòng chọn cách tính';
    return errors;
};
