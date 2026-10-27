// Kiểm tra dữ liệu nhập các form của module service (UC-21, 22). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại (trùng tên…). Dùng: if (hasErrors(validateService(form))) …

// UC-21: tên, đơn vị tính, cách tính đều bắt buộc. isFixed trong form là chuỗi 'true' / 'false', '' là chưa chọn
export const validateService = ({ name, unit, isFixed }) => {
    const errors = {};
    if (!name.trim()) errors.name = 'Vui lòng nhập tên dịch vụ';
    if (!unit.trim()) errors.unit = 'Vui lòng nhập đơn vị tính';
    if (!isFixed) errors.isFixed = 'Vui lòng chọn cách tính';
    return errors;
};

// UC-22: đơn giá phải lớn hơn 0, ngày bắt đầu áp dụng bắt buộc. Ngày trong quá khứ vẫn cho lưu (chỉ cảnh báo)
export const validateServicePrice = ({ unitPrice, effectiveFrom }) => {
    const errors = {};
    if (unitPrice === '') errors.unitPrice = 'Vui lòng nhập đơn giá';
    else if (!(Number(unitPrice) > 0)) errors.unitPrice = 'Đơn giá phải lớn hơn 0';
    if (!effectiveFrom) errors.effectiveFrom = 'Vui lòng chọn ngày bắt đầu áp dụng';
    return errors;
};
