// Hiển thị chung của module occupant: chữ viết tắt cho avatar, gom cư dân theo phòng, tìm cư dân (UC-30)
import { OCCUPANT_STATUS } from '../../constants/enums';

// "Đỗ Minh Khang" → "MK", "An" → "A" (giống avatar ở header)
export const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ô tìm ở danh sách cư dân (UC-30): tìm theo trường nào. '' = tất cả
export const SEARCH_FIELD_OPTIONS = [
  { value: 'name', label: 'Họ tên' },
  { value: 'cccd', label: 'CCCD' },
  { value: 'phone', label: 'Số điện thoại' },
  { value: 'room', label: 'Mã phòng' },
];

// "Nguyễn  Văn Đức" → "nguyen van duc": gõ không dấu vẫn ra
const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // bỏ dấu (sau NFD dấu tách thành ký tự riêng)
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
const digitsOf = (value) => String(value ?? '').replace(/\D/g, '');

// một cư dân có khớp từ khóa không. field '' (tất cả): tên + mã phòng, thêm CCCD / SĐT khi từ khóa toàn là số
export const matchOccupant = (occupant, keyword, field = '') => {
  const text = normalizeText(keyword);
  if (!text) return true;
  const digits = digitsOf(keyword);
  const byName = () => normalizeText(occupant.name).includes(text);
  const byCccd = () => digits.length > 0 && digitsOf(occupant.cccd).includes(digits);
  const byPhone = () => digits.length > 0 && digitsOf(occupant.phone).includes(digits);
  const byRoom = () => normalizeText(occupant.room?.roomNumber).startsWith(text);

  if (field === 'name') return byName();
  if (field === 'cccd') return byCccd();
  if (field === 'phone') return byPhone();
  if (field === 'room') return byRoom();
  const onlyDigits = /^[\d\s.]+$/.test(keyword.trim());
  return byName() || byRoom() || (onlyDigits && (byCccd() || byPhone()));
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
