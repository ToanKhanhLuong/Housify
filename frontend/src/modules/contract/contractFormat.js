// Tính toán / hiển thị chung của module contract (UC-24..27)
import { CONTRACT_STATUS } from '../../constants/enums';

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" (ô ngày) hoặc Date → Date lúc 00:00 giờ máy
const toLocalDate = (value) => {
  if (value instanceof Date) return value;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Ngày kết thúc giống BE (calculateEndDate): ngày bắt đầu + số tháng − 1 ngày
export const endDateOf = (startDate, months) => {
  if (!startDate || !months || Number(months) < 1) return null;
  const end = toLocalDate(startDate);
  end.setMonth(end.getMonth() + Number(months));
  end.setDate(end.getDate() - 1);
  return end;
};

// số tháng của hợp đồng: kết thúc + 1 ngày − bắt đầu (ngược lại của endDateOf)
export const monthsOf = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const after = new Date(new Date(endDate).getTime() + DAY_MS);
  return (after.getFullYear() - start.getFullYear()) * 12 + (after.getMonth() - start.getMonth());
};

// người đại diện: Nháp chỉ có CCCD + email; đã kích hoạt có họ tên
export const representativeLabel = (representative) =>
  representative?.name || representative?.email || '—';

// link mời kích hoạt từ rawToken BE trả (để thử khi không có email thật)
export const inviteLinkOf = (rawToken) =>
  rawToken ? `${window.location.origin}/activate/contract/${rawToken}` : '';

// "Đỗ Minh Khang" → "MK" (giống avatar ở header); không có tên → "?"
export const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

// tiến độ thời hạn để hiện thanh + nhãn: { percent, text, variant } – variant theo màu Bootstrap
// now truyền vào từ trang (render phải thuần, không gọi Date.now trong render)
export const termOf = (contract, now) => {
  const { status } = contract;
  if (status === CONTRACT_STATUS.DRAFT) return { percent: 0, text: 'Chờ khách kích hoạt', variant: 'secondary' };
  if (status === CONTRACT_STATUS.CANCELLED) return { percent: 0, text: 'Đã hủy', variant: 'secondary' };
  const start = new Date(contract.startDate).getTime();
  const end = new Date(contract.endDate).getTime();
  const percent = end > start ? Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100) : 100;
  if (status === CONTRACT_STATUS.ENDED) return { percent: 100, text: 'Đã kết thúc', variant: 'secondary' };

  const daysLeft = Math.ceil((end - now) / DAY_MS);
  if (daysLeft < 0) return { percent, text: `Quá ngày kết thúc ${-daysLeft} ngày`, variant: 'danger' };
  if (daysLeft <= 30) return { percent, text: `Còn ${daysLeft} ngày – sắp hết hạn`, variant: 'warning' };
  if (now < start) return { percent: 0, text: `Bắt đầu sau ${Math.ceil((start - now) / DAY_MS)} ngày`, variant: 'info' };
  return { percent, text: `Còn ${daysLeft} ngày`, variant: 'success' };
};
