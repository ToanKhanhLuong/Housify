// Kiểm tra dữ liệu nhập của module invoice (UC-34 sửa nháp, UC-37 hủy). Trả { field: message }, rỗng là hợp lệ
// Khóa lỗi từng dòng giống BE: items.0.newReading … Câu lỗi giống invoice.validation.js / invoice.service.js
import { INVOICE_ITEM_TYPE } from '../../constants/enums';

const isBlank = (value) => value === '' || value === null || value === undefined;

// items: các dòng đang sửa (bỏ dòng tiền phòng), đúng thứ tự gửi lên BE
export const validateInvoiceItems = (items) => {
  const errors = {};
  items.forEach((item, index) => {
    const key = (field) => `items.${index}.${field}`;

    if (item.type === INVOICE_ITEM_TYPE.METERED) {
      if (isBlank(item.oldReading))
        errors[key('oldReading')] = `Vui lòng nhập chỉ số cũ của [${item.description}]`;
      else if (Number(item.oldReading) < 0) errors[key('oldReading')] = 'Chỉ số cũ không được âm';

      if (isBlank(item.newReading))
        errors[key('newReading')] = `Vui lòng nhập chỉ số mới của [${item.description}]`;
      else if (Number(item.newReading) < 0) errors[key('newReading')] = 'Chỉ số mới không được âm';
      else if (!isBlank(item.oldReading) && Number(item.newReading) < Number(item.oldReading))
        errors[key('newReading')] = 'Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ';
    }

    if (item.type === INVOICE_ITEM_TYPE.FIXED) {
      if (isBlank(item.quantity) || Number(item.quantity) < 0)
        errors[key('quantity')] = 'Số lượng không được âm';
    }

    if (item.type === INVOICE_ITEM_TYPE.EXTRA) {
      if (!String(item.description ?? '').trim())
        errors[key('description')] = 'Tên khoản thu không được để trống';
      if (isBlank(item.unitPrice)) errors[key('unitPrice')] = 'Vui lòng nhập số tiền';
      else if (Number(item.unitPrice) < 0) errors[key('unitPrice')] = 'Đơn giá không được âm';
    }
  });
  return errors;
};

// UC-37: lý do hủy bắt buộc, tối thiểu 3 ký tự như BE
export const validateCancelReason = (reason) => {
  const value = reason.trim();
  if (!value) return { reason: 'Vui lòng nhập lý do hủy hóa đơn' };
  if (value.length < 3) return { reason: 'Lý do hủy phải có ít nhất 3 ký tự' };
  return {};
};
