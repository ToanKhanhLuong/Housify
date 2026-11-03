// Avatar tròn chữ viết tắt của cư dân (lớp hf-av chung): người đại diện màu tím mận, người ở cùng màu xám
// size: 'sm' (dòng thành viên) | 'md' (ô thành viên trang Phòng của tôi) | 'lg' (đầu trang chi tiết)
import { initialsOf } from '../occupantFormat';

const SIZE = { sm: 'w-9 h-9 text-xs', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 fs-4' };

const OccupantAvatar = ({ name, isRepresentative, size = 'sm' }) => (
  <span
    className={`hf-av ${SIZE[size]} ${isRepresentative ? '' : 'bg-body-tertiary text-secondary border'}`}
    aria-hidden="true"
  >
    {initialsOf(name)}
  </span>
);

export default OccupantAvatar;
