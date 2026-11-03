// Sức chứa phòng dạng chấm: ●●○ 2/3 người – chấm đặc là người đang ở, chấm rỗng là chỗ còn trống (lớp hf-dot chung)
// size 'lg': chấm và số to hơn (đầu trang Phòng của tôi)
const CapacityDots = ({ count = 0, capacity, size = 'sm' }) => {
  if (!capacity) return <span className="small text-secondary">{count} người</span>;
  const full = count >= capacity;
  const large = size === 'lg';
  return (
    <span
      className={`flex items-center ${large ? 'gap-2' : 'gap-1'}`}
      title={full ? 'Phòng đã đủ người' : `Còn ${capacity - count} chỗ`}
    >
      {Array.from({ length: capacity }, (_, index) => (
        <span
          key={index}
          className={`hf-dot ${large ? 'w-3.5 h-3.5' : ''} ${index < count ? 'hf-dot-plum' : 'hf-dot-gray'}`}
        />
      ))}
      <span className={`fw-semibold ms-1 tabular-nums ${large ? 'fs-4' : 'small'}`}>
        {count}/{capacity}
      </span>
    </span>
  );
};

export default CapacityDots;
