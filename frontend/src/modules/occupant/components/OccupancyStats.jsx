// Dải số liệu đầu trang Cư dân (UC-30): người đang ở, phòng có người, chỗ còn trống trong phòng đang thuê, phòng trống
// Tính từ danh sách phòng của tòa (GET /buildings/:id/rooms có occupantCount, roomType.capacity) – không gọi API riêng
import { BiBed, BiDoorOpen, BiGroup, BiHome } from 'react-icons/bi';
import { ROOM_STATUS } from '../../../constants/enums';

const Stat = ({ icon: Icon, label, value, hint }) => (
  <div className="hf-card flex items-center gap-3 px-3 py-2">
    <span className="hf-av w-10 h-10">
      <Icon size={20} />
    </span>
    <span className="flex flex-col">
      <span className="fs-5 fw-bold leading-tight tabular-nums">{value}</span>
      <span className="small text-secondary">
        {label}
        {hint && <span className="ms-1">· {hint}</span>}
      </span>
    </span>
  </div>
);

const OccupancyStats = ({ rooms }) => {
  const occupied = rooms.filter((room) => room.status === ROOM_STATUS.OCCUPIED);
  const people = rooms.reduce((sum, room) => sum + (room.occupantCount ?? 0), 0);
  const capacityOfOccupied = occupied.reduce((sum, room) => sum + (room.roomType?.capacity ?? 0), 0);
  const peopleInOccupied = occupied.reduce((sum, room) => sum + (room.occupantCount ?? 0), 0);
  const freeSlots = Math.max(capacityOfOccupied - peopleInOccupied, 0);
  const available = rooms.filter((room) => room.status === ROOM_STATUS.AVAILABLE).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      <Stat icon={BiGroup} label="Người đang ở" value={people} />
      <Stat icon={BiHome} label="Phòng có người" value={occupied.length} hint={`/${rooms.length} phòng`} />
      <Stat icon={BiBed} label="Chỗ còn trống" value={freeSlots} hint="trong phòng đang thuê" />
      <Stat icon={BiDoorOpen} label="Phòng trống" value={available} />
    </div>
  );
};

export default OccupancyStats;
