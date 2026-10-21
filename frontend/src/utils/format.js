// Định dạng hiển thị: tiền dạng 000 000 000, ngày dd/MM/yyyy, ngày giờ dd/MM/yyyy HH:mm
const pad = (number) => String(number).padStart(2, '0');

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// 1500000 → "1 500 000"
export const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const number = Math.round(Number(value));
  if (Number.isNaN(number)) return '';
  const digits = String(Math.abs(number)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return number < 0 ? `-${digits}` : digits;
};
