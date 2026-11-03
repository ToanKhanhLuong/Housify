// Ô một thành viên ở trang Phòng của tôi (Customer): avatar, tên, Đại diện / quan hệ, SĐT, ngày vào ở. Bấm mở hồ sơ
// EmptySlotTile: ô "Chỗ trống" nét đứt cho chỗ còn lại theo sức chứa – thêm người do Manager làm
import { BiCalendar, BiPhone, BiUserPlus } from 'react-icons/bi';
import { OCCUPANT_STATUS } from '../../../constants/enums';
import { formatDate } from '../../../utils/format';
import OccupantAvatar from './OccupantAvatar';

export const EmptySlotTile = () => (
  <div className="hf-ph min-h-40 p-4 text-sm">
    <BiUserPlus size={30} />
    <span className="fs-6 fw-semibold">Chỗ trống</span>
    <span>Chưa có người cùng phòng</span>
  </div>
);

const MemberTile = ({ member, onClick }) => {
  const left = member.status === OCCUPANT_STATUS.LEFT;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onClick()}
      className={`hf-tcard min-h-40 p-4 gap-3 ${left ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <OccupantAvatar name={member.name} isRepresentative={member.isRepresentative} size="md" />
        <div className="flex flex-col min-w-0">
          <span className="fs-6 fw-semibold truncate">{member.name}</span>
          <span className="text-secondary truncate">
            {member.isRepresentative ? 'Người đại diện' : member.relationship || 'Người ở cùng'}
          </span>
        </div>
        {member.isRepresentative && <span className="hf-badge hf-b-plum ms-auto">Đại diện</span>}
      </div>
      <div className="flex flex-col gap-1 text-secondary mt-auto pt-2 border-top">
        <span className="flex items-center gap-2">
          <BiPhone />
          {member.phone}
        </span>
        <span className="flex items-center gap-2">
          <BiCalendar />
          {left ? `Đã chuyển đi ${formatDate(member.exitDate)}` : `Vào ở từ ${formatDate(member.joinDate)}`}
        </span>
      </div>
    </div>
  );
};

export default MemberTile;
