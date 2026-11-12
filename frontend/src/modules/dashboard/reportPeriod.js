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

// kỳ đang diễn ra: tháng / quý / năm hiện tại (giá trị mặc định khi mở trang Báo cáo)
export const currentPeriod = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  return {
    type: PERIOD_TYPE.MONTH,
    month: `${now.getFullYear()}-${pad(month)}`,
    quarter: Math.ceil(month / 3),
    year: now.getFullYear(),
  };
};

// kỳ liền trước cùng loại để so sánh: tháng trước / quý trước / năm trước
export const previousPeriod = (period) => {
  if (period.type === PERIOD_TYPE.MONTH) {
    const [year, month] = period.month.split('-').map(Number);
    return month === 1
      ? { ...period, month: `${year - 1}-12` }
      : { ...period, month: `${year}-${pad(month - 1)}` };
  }
  if (period.type === PERIOD_TYPE.QUARTER) {
    return period.quarter === 1
      ? { ...period, quarter: 4, year: period.year - 1 }
      : { ...period, quarter: period.quarter - 1 };
  }
  return { ...period, year: period.year - 1 };
};

// "tháng 11/2026" · "quý 4/2026" · "năm 2026"
export const periodLabel = (period) => {
  if (period.type === PERIOD_TYPE.MONTH) return `tháng ${monthLabel(period.month)}`;
  if (period.type === PERIOD_TYPE.QUARTER) return `quý ${period.quarter}/${period.year}`;
  return `năm ${period.year}`;
};

// khoảng cho biểu đồ xu hướng: ít nhất 6 tháng, tính lùi từ tháng cuối của kỳ (kỳ dài hơn thì lấy đúng kỳ)
// để chọn 1 tháng hay 1 quý vẫn thấy được xu hướng, không chỉ 1 cột
export const TREND_MONTHS = 6;
export const trendRange = (period) => {
  const range = periodRange(period);
  const [endYear, endMonth] = range.to.split('-').map(Number);
  const start = new Date(endYear, endMonth - TREND_MONTHS, 1);
  const from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;
  return { from: from < range.from ? from : range.from, to: range.to };
};
