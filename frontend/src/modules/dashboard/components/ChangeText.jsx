// UC-07, 48: mức tăng / giảm so với kỳ trước, vd "▲ 12% so với tháng 10/2026" hoặc "+3 so với quý 3/2026"
// upIsGood = false khi tăng là xấu (vd hợp đồng kết thúc) để đổi màu xanh / đỏ cho đúng
import { BiDownArrowAlt, BiUpArrowAlt } from 'react-icons/bi';

const ChangeText = ({ current, previous, label, asCount = false, upIsGood = true }) => {
  if (typeof current !== 'number' || typeof previous !== 'number') return null;

  const diff = current - previous;
  if (diff === 0) return <span className="small text-secondary">Không đổi so với {label}</span>;
  // kỳ trước bằng 0 thì không tính được %, chỉ ghi kỳ trước chưa có
  if (!asCount && previous === 0) {
    return <span className="small text-secondary">{label}: chưa phát sinh</span>;
  }

  const isUp = diff > 0;
  const Icon = isUp ? BiUpArrowAlt : BiDownArrowAlt;
  const amount = asCount
    ? `${isUp ? '+' : '−'}${Math.abs(diff)}`
    : `${Math.abs(Math.round((diff / previous) * 100))}%`;

  return (
    <span
      className={`small inline-flex items-center gap-1 text-${isUp === upIsGood ? 'success' : 'danger'}`}
    >
      <Icon aria-hidden="true" />
      {amount} so với {label}
    </span>
  );
};

export default ChangeText;
