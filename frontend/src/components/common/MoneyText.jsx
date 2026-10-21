// Hiện số tiền dạng 1 500 000 đ. Không có giá trị thì hiện "—"
import { formatMoney } from '../../utils/format.js';

export default function MoneyText({ value, unit = 'đ', className = '' }) {
  if (value === null || value === undefined || value === '') return <span className={className}>—</span>;
  return (
    <span className={`text-nowrap ${className}`}>
      {formatMoney(value)}
      {unit ? ` ${unit}` : ''}
    </span>
  );
}
