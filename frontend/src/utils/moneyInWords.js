// Đọc số tiền thành chữ tiếng Việt để in vào hợp đồng (UC-06), vd 1800000 → "Một triệu tám trăm nghìn đồng"
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const UNITS = ['', 'nghìn', 'triệu', 'tỷ'];

// đọc một nhóm 3 chữ số; full = đọc đủ "không trăm", "linh" khi nhóm không đứng đầu
const readTriple = (number, full) => {
  const hundreds = Math.floor(number / 100);
  const tens = Math.floor((number % 100) / 10);
  const units = number % 10;
  const words = [];

  if (full || hundreds > 0) words.push(DIGITS[hundreds], 'trăm');

  if (tens === 0 && units > 0 && (full || hundreds > 0)) words.push('linh');
  else if (tens === 1) words.push('mười');
  else if (tens > 1) words.push(DIGITS[tens], 'mươi');

  if (units === 1 && tens > 1) words.push('mốt');
  else if (units === 5 && tens > 0) words.push('lăm');
  else if (units > 0) words.push(DIGITS[units]);

  return words.join(' ');
};

export const moneyInWords = (value) => {
  let number = Math.round(Number(value));
  if (!Number.isFinite(number) || number < 0) return '';
  if (number === 0) return 'Không đồng';

  // tách thành nhóm 3 số từ phải sang trái; quá "tỷ" thì lặp lại thang nghìn/triệu/tỷ
  const groups = [];
  while (number > 0) {
    groups.push(number % 1000);
    number = Math.floor(number / 1000);
  }

  const parts = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    if (groups[index] === 0) continue;
    const isFirst = parts.length === 0;
    const unit = index === 0 ? '' : UNITS[((index - 1) % 3) + 1];
    parts.push([readTriple(groups[index], !isFirst), unit].filter(Boolean).join(' '));
  }

  const text = `${parts.join(' ')} đồng`;
  return text.charAt(0).toUpperCase() + text.slice(1);
};
