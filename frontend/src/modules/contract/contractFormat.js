// Tính toán / hiển thị chung của module contract (UC-24..27)

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
