// Hiển thị chung của module payment (UC-39): kỳ tháng, màu nhãn Đúng hạn / Quá hạn, đổi chữ ở ô tìm thành khoảng ngày

// "2026-11" → "11/2026"
export const monthLabel = (month) => {
  if (!month) return '—';
  const [year, monthNumber] = month.split('-');
  return `${monthNumber}/${year}`;
};

// BE trả sẵn statusLabel "Đúng hạn" / "Quá hạn X ngày" / "Chuyển thiếu (chưa gạch nợ)" / "Chuyển thừa (chưa gạch nợ)"
export const onTimeVariant = (statusLabel) => {
  if (statusLabel?.startsWith('Chuyển thiếu') || statusLabel?.startsWith('Chuyển thừa')) {
    return 'danger';
  }
  return statusLabel === 'Đúng hạn' ? 'success' : 'warning';
};

const pad = (number) => String(number).padStart(2, '0');

// ô tìm: "11/2026" → cả tháng; "3/11/2026" → đúng ngày đó. Không khớp hoặc ngày không có thật → null
// API không có ?q nên FE đổi chữ gõ sang from / to (ngày trả)
export const searchToRange = (keyword) => {
  const monthMatch = keyword.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthMatch) {
    const month = Number(monthMatch[1]);
    const year = Number(monthMatch[2]);
    if (month < 1 || month > 12) return null;
    const lastDay = new Date(year, month, 0).getDate(); // ngày 0 của tháng sau = ngày cuối tháng này
    return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
  }

  const dayMatch = keyword.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayMatch) {
    const [day, month, year] = dayMatch.slice(1).map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return null; // vd 31/02
    const value = `${year}-${pad(month)}-${pad(day)}`;
    return { from: value, to: value };
  }

  return null;
};
