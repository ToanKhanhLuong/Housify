// Một dòng thành viên trong thẻ phòng: avatar, họ tên, vai trò (Đại diện nổi bật / quan hệ của người ở cùng), SĐT
// Người đã chuyển đi hiện mờ kèm ngày ra. Bấm cả dòng để mở hồ sơ
import { Button } from 'react-bootstrap';
import { BiChevronRight } from 'react-icons/bi';
import { OCCUPANT_STATUS } from '../../../constants/enums';
import { formatDate } from '../../../utils/format';
import OccupantAvatar from './OccupantAvatar';

const MemberRow = ({ member, onClick }) => {
  const left = member.status === OCCUPANT_STATUS.LEFT;
  return (
    // nút không nền (hf-btn-ghost): chỉ hiện xám khi rê chuột
    <Button
      variant="secondary"
      onClick={onClick}
      className={`hf-btn-ghost w-full flex items-center gap-3 px-2 py-2 text-start ${left ? 'opacity-60' : ''}`}
    >
      <OccupantAvatar name={member.name} isRepresentative={member.isRepresentative} />
      <span className="flex flex-col min-w-0 flex-1">
        <span className="flex items-center gap-2 min-w-0">
          <span className="fw-semibold text-body truncate">{member.name}</span>
          {member.isRepresentative && <span className="hf-badge hf-b-plum">Đại diện</span>}
        </span>
        <span className="small text-secondary truncate">
          {left
            ? `Đã chuyển đi ${formatDate(member.exitDate)}`
            : [member.isRepresentative ? null : member.relationship || 'Ở cùng', member.phone]
                .filter(Boolean)
                .join(' · ')}
        </span>
      </span>
      <BiChevronRight className="text-secondary shrink-0" />
    </Button>
  );
};

export default MemberRow;
