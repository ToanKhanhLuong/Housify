// Chuyển các dòng tiền của hóa đơn giữa dạng API và dạng ô nhập (UC-34 lập / sửa hóa đơn)
// Dùng chung cho trang tạo hóa đơn (dữ liệu prefill) và sửa hóa đơn nháp (trang chi tiết)
import { INVOICE_ITEM_TYPE } from '../../constants/enums';

// dòng đang sửa: bỏ tiền phòng (server tự thêm), số để dạng chuỗi cho ô nhập
// EXTRA có unitPrice < 0 là khoản khấu trừ tiền chuyển thừa → giữ dấu isDeduction và hiện số dương ở ô nhập
export const toDraftItems = (items) =>
  items
    .filter((item) => item.type !== INVOICE_ITEM_TYPE.RENT)
    .map((item) => {
      const isDeduction = item.type === INVOICE_ITEM_TYPE.EXTRA && Number(item.unitPrice) < 0;
      return {
        ...item,
        isDeduction,
        unitPrice: isDeduction ? Math.abs(Number(item.unitPrice)) : item.unitPrice,
        serviceId: item.serviceId ? String(item.serviceId) : undefined,
        oldReading: item.oldReading ?? '',
        newReading: item.newReading ?? '',
      };
    });

// body PUT/POST: mỗi dòng cần type, description (BE bắt buộc); số đổi về Number
// nếu isDeduction thì gửi unitPrice âm về BE
export const toPayloadItems = (items) =>
  items.map((item) => {
    const base = { type: item.type, description: String(item.description ?? '').trim() };
    if (item.type === INVOICE_ITEM_TYPE.EXTRA) {
      const absPrice = Math.abs(Number(item.unitPrice));
      return { ...base, quantity: 1, unitPrice: item.isDeduction ? -absPrice : absPrice };
    }
    if (item.type === INVOICE_ITEM_TYPE.FIXED) {
      return { ...base, serviceId: item.serviceId, quantity: Number(item.quantity) };
    }
    return {
      ...base,
      serviceId: item.serviceId,
      oldReading: Number(item.oldReading),
      newReading: Number(item.newReading),
    };
  });
