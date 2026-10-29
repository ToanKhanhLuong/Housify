// Avatar chữ của Manager (2 chữ cái đầu của 2 tiếng cuối), dùng ở danh sách và chi tiết Manager (UC-09)
// <ManagerAvatar name="Nguyễn Minh Anh" /> → "MA" · size="lg" ở thẻ danh tính trang chi tiết
const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?';

// md ~35px (dòng bảng), lg ~56px (thẻ danh tính)
const SIZE_CLASS = {
  md: 'w-10 h-10 small',
  lg: 'w-16 h-16 fs-4',
};

const ManagerAvatar = ({ name, size = 'md' }) => (
  <span
    className={`flex items-center justify-center shrink-0 rounded-circle bg-primary-subtle text-primary-emphasis fw-semibold ${SIZE_CLASS[size]}`}
  >
    {initialsOf(name)}
  </span>
);

export default ManagerAvatar;
