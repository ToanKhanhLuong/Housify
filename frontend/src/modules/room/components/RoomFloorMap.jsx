// UC-19: sơ đồ phòng theo tòa → tầng (tầng cao nhất ở trên), mỗi phòng một ô tô màu theo trạng thái, bấm ô mở phòng
// Dùng ở danh sách phòng (chế độ "Sơ đồ") và ở chi tiết phòng (khối "Phòng cùng tầng", currentId đánh dấu phòng đang xem)
// Cùng kiểu ô với sơ đồ tầng ở trang tòa nhà để hai nơi nhìn như một
import { Link } from 'react-router-dom';
import { formatMoney } from '../../../utils/format';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';

const byNumber = (a, b) => a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true });

// gom phòng: tòa → tầng (giảm dần) → phòng (theo mã)
const groupRooms = (rooms) => {
  const buildings = new Map();
  rooms.forEach((room) => {
    const key = room.building?._id ?? room.buildingId;
    if (!buildings.has(key))
      buildings.set(key, { key, name: room.building?.name, floors: new Map() });
    const floors = buildings.get(key).floors;
    if (!floors.has(room.floorNumber)) floors.set(room.floorNumber, []);
    floors.get(room.floorNumber).push(room);
  });
  return [...buildings.values()].map((building) => ({
    ...building,
    floors: [...building.floors.entries()]
      .sort(([a], [b]) => b - a)
      .map(([floorNumber, floorRooms]) => ({ floorNumber, rooms: floorRooms.sort(byNumber) })),
  }));
};

const RoomCell = ({ room, isCurrent }) => {
  const { label, variant } = ROOM_STATUS_LABEL[room.status] ?? {};
  return (
    <Link
      to={`/rooms/${room._id}`}
      title={`Phòng ${room.roomNumber} · ${label}${room.rentPrice ? ` · ${formatMoney(room.rentPrice)}` : ''}`}
      aria-current={isCurrent ? 'page' : undefined}
      className={`flex flex-col justify-center w-24 h-14 px-2 rounded border bg-${variant}-subtle text-${variant}-emphasis hover:no-underline transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none ${isCurrent ? `border-2 border-${variant}` : `border-${variant}-subtle`}`}
    >
      <span className="fw-semibold">{room.roomNumber}</span>
      <span className="small">{label}</span>
    </Link>
  );
};

// framed=false: chỉ hiện hàng ô phòng (dùng trong khung đã có tiêu đề, vd "Phòng cùng tầng")
const RoomFloorMap = ({ rooms, currentId, showBuilding = true, framed = true }) => {
  if (!framed) {
    return (
      <div className="flex flex-wrap gap-2">
        {[...rooms].sort(byNumber).map((room) => (
          <RoomCell key={room._id} room={room} isCurrent={room._id === currentId} />
        ))}
      </div>
    );
  }
  const groups = groupRooms(rooms);
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.key} className="border rounded bg-body">
          {showBuilding && groups.length > 0 && group.name && (
            <div className="px-3 py-2 border-bottom fw-semibold">{group.name}</div>
          )}
          {group.floors.map((floor, index) => (
            <div
              key={floor.floorNumber}
              className={`flex flex-col sm:flex-row gap-2 sm:gap-3 px-3 py-3 ${index < group.floors.length - 1 ? 'border-bottom' : ''}`}
            >
              <div className="flex-none sm:w-24">
                <div className="fw-semibold">Tầng {floor.floorNumber}</div>
                <div className="small text-secondary">{floor.rooms.length} phòng</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {floor.rooms.map((room) => (
                  <RoomCell key={room._id} room={room} isCurrent={room._id === currentId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default RoomFloorMap;
