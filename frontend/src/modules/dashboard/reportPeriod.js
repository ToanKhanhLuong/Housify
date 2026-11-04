// Đổi kỳ báo cáo (tháng / quý / năm) thành from, to dạng YYYY-MM-DD để gọi GET /reports (UC-48)
export const PERIOD_TYPE = Object.freeze({ MONTH: 'MONTH', QUARTER: 'QUARTER', YEAR: 'YEAR' });

const pad = (value) => String(value).padStart(2, '0');

// tháng 1..12; ngày 0 của tháng sau = ngày cuối tháng này
const lastDayOf = (year, month) => new Date(year, month, 0).getDate();

const rangeOfMonths = (year, firstMonth, lastMonth) => ({
  from: `${year}-${pad(firstMonth)}-01`,
  to: `${year}-${pad(lastMonth)}-${pad(lastDayOf(year, lastMonth))}`,
});

// month: 'YYYY-MM'; quarter: 1..4; year: số
export const periodRange = ({ type, month, year, quarter }) => {
  if (type === PERIOD_TYPE.MONTH) {
    const [monthYear, monthNumber] = month.split('-').map(Number);
    return rangeOfMonths(monthYear, monthNumber, monthNumber);
  }
  if (type === PERIOD_TYPE.QUARTER) {
    const lastMonth = quarter * 3;
    return rangeOfMonths(year, lastMonth - 2, lastMonth);
  }
  return rangeOfMonths(year, 1, 12);
};

// "2026-11" → "11/2026"
export const monthLabel = (month) => {
  if (!month) return '—';
  const [year, monthNumber] = month.split('-');
  return `${monthNumber}/${year}`;
};
