// Hiển thị chung của module invoice: kỳ tháng, phòng, tình trạng hạn thanh toán (UC-36)
// Quá hạn / đúng hạn là giá trị tính ra, không lưu (BE trả sẵn isOverdue, isPaidLate; số ngày FE tự đếm)
import { INVOICE_STATUS } from '../../constants/enums';

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-11" → "11/2026"
export const monthLabel = (month) => {
  if (!month) return '—';
  const [year, monthNumber] = month.split('-');
  return `${monthNumber}/${year}`;
};

// danh sách và chi tiết đều populate contractId.roomId
export const roomOf = (invoice) => invoice.contractId?.roomId ?? null;

// tình trạng hạn: { text, variant } – variant theo màu Bootstrap
export const dueStatus = (invoice) => {
  const { status, dueDate, paidAt } = invoice;
  if (status === INVOICE_STATUS.DRAFT) return { text: 'Chưa gửi', variant: 'secondary' };
  if (status === INVOICE_STATUS.CANCELLED) return { text: 'Đã hủy', variant: 'secondary' };

  if (status === INVOICE_STATUS.PAID) {
    if (!invoice.isPaidLate) return { text: 'Đúng hạn', variant: 'success' };
    const lateDays = Math.ceil((new Date(paidAt) - new Date(dueDate)) / DAY_MS);
    return { text: `Quá hạn ${lateDays} ngày`, variant: 'warning' };
  }

  // PENDING
  if (invoice.isOverdue) {
    const overdueDays = Math.ceil((Date.now() - new Date(dueDate)) / DAY_MS);
    return { text: `Quá hạn ${overdueDays} ngày`, variant: 'danger' };
  }
  const leftDays = Math.ceil((new Date(dueDate) - Date.now()) / DAY_MS);
  return { text: leftDays <= 1 ? 'Hết hạn hôm nay' : `Còn ${leftDays} ngày`, variant: 'warning' };
};
