// Nhãn "Đúng hạn" (xanh) / "Quá hạn X ngày" (vàng) của một giao dịch – BE tính sẵn statusLabel (UC-39)
// Cùng kiểu với StatusBadge (nền nhạt, chữ đậm) nhưng chữ lấy thẳng từ BE vì có số ngày
import { Badge } from 'react-bootstrap';
import { onTimeVariant } from '../paymentFormat';

const OnTimeBadge = ({ label }) => {
  const variant = onTimeVariant(label);
  return (
    <Badge
      pill
      bg={`${variant}-subtle`}
      text={`${variant}-emphasis`}
      className={`border border-${variant}-subtle`}
    >
      {label || '—'}
    </Badge>
  );
};

export default OnTimeBadge;
