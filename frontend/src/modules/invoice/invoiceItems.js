// Chuyển các dòng tiền của hóa đơn giữa dạng API và dạng ô nhập (UC-34 lập / sửa hóa đơn)
// Dùng chung cho trang tạo hóa đơn (dữ liệu prefill) và sửa hóa đơn nháp (trang chi tiết)
import { INVOICE_ITEM_TYPE } from '../../constants/enums';

// dòng đang sửa: bỏ tiền phòng (server tự thêm), số để dạng chuỗi cho ô nhập
export const toDraftItems = (items) =>
  items
    .filter((item) => item.type !== INVOICE_ITEM_TYPE.RENT)
    .map((item) => ({
      ...item,
      serviceId: item.serviceId ? String(item.serviceId) : undefined,
      oldReading: item.oldReading ?? '',
      newReading: item.newReading ?? '',
    }));

// body PUT: mỗi dòng cần type, description (BE bắt buộc); số đổi về Number
export const toPayloadItems = (items) =>
  items.map((item) => {
    const base = { type: item.type, description: String(item.description ?? '').trim() };
    if (item.type === INVOICE_ITEM_TYPE.EXTRA)
      return { ...base, quantity: 1, unitPrice: Number(item.unitPrice) };
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
