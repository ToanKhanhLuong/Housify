// Hiển thị chung của module occupant: chữ viết tắt cho avatar, gom cư dân theo phòng (UC-30)
import { OCCUPANT_STATUS } from '../../constants/enums';

// "Đỗ Minh Khang" → "MK", "An" → "A" (giống avatar ở header)
export const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

// gom danh sách cư dân thành từng phòng: [{ room, contractId, members[] }], xếp theo tầng rồi mã phòng
// người đại diện luôn đứng đầu, người đang ở trước người đã chuyển đi
// roomsById: phòng lấy từ GET /buildings/:id/rooms (có roomType.capacity, occupantCount) để hiện sức chứa
export const groupByRoom = (occupants, roomsById = {}) => {
  const groups = new Map();
  occupants.forEach((occupant) => {
    const roomId = occupant.room?._id ?? 'none';
    if (!groups.has(roomId)) {
      groups.set(roomId, {
        room: { ...occupant.room, ...roomsById[roomId] },
        contractId: null,
        members: [],
      });
    }
    const group = groups.get(roomId);
    group.members.push(occupant);
    // hợp đồng để thêm người: lấy từ người đang ở (hợp đồng ACTIVE)
    if (occupant.status === OCCUPANT_STATUS.STAYED) group.contractId = occupant.contractId;
  });

  const rank = (member) => (member.isRepresentative ? 0 : 1) + (member.status === OCCUPANT_STATUS.STAYED ? 0 : 2);
  return [...groups.values()]
    .map((group) => ({ ...group, members: [...group.members].sort((a, b) => rank(a) - rank(b)) }))
    .sort(
      (a, b) =>
        (a.room.floorNumber ?? 0) - (b.room.floorNumber ?? 0) ||
        String(a.room.roomNumber).localeCompare(String(b.room.roomNumber), 'vi', { numeric: true }),
    );
};
