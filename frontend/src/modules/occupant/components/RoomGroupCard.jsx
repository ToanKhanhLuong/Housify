// Thẻ một phòng trong chế độ "Theo phòng" (UC-30): đầu thẻ số phòng + tầng + loại + chấm sức chứa,
// thân là danh sách thành viên (bấm mở hồ sơ), chân thẻ: Thêm người (còn chỗ, UC-32) và link sang hợp đồng
import { Button } from 'react-bootstrap';
import { BiFile, BiUserPlus } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import { OCCUPANT_STATUS } from '../../../constants/enums';
import CapacityDots from './CapacityDots';
import MemberRow from './MemberRow';

const RoomGroupCard = ({ group, onOpenMember, onAdd }) => {
  const { room, members, contractId } = group;
  const capacity = room.roomType?.capacity;
  const stayed = members.filter((member) => member.status === OCCUPANT_STATUS.STAYED).length;
  const hasSlot = contractId && capacity && stayed < capacity;

  return (
    <div className="hf-card flex flex-col">
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2 border-bottom">
        <div className="flex flex-col">
          <span className="fs-5 fw-bold leading-tight">Phòng {room.roomNumber ?? '—'}</span>
          <span className="small text-secondary">
            Tầng {room.floorNumber ?? '—'}
            {room.roomType?.name ? ` · ${room.roomType.name}` : ''}
          </span>
        </div>
        <CapacityDots count={stayed} capacity={capacity} />
      </div>

      <div className="flex flex-col gap-1 p-2 flex-1">
        {members.map((member) => (
          <MemberRow key={member._id} member={member} onClick={() => onOpenMember(member)} />
        ))}
      </div>

      {contractId && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-top small">
          {hasSlot ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => onAdd({ _id: contractId, roomNumber: room.roomNumber })}
            >
              <BiUserPlus />
              Thêm người
            </Button>
          ) : (
            <span className="hf-badge hf-b-gray">Đã đủ người</span>
          )}
          <Link to={`/contracts/${contractId}`} className="flex items-center gap-1 text-secondary">
            <BiFile />
            Hợp đồng
          </Link>
        </div>
      )}
    </div>
  );
};

export default RoomGroupCard;
