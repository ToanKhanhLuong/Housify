// Dữ liệu giả cho loại phòng (UC-20) khi BE chưa có API – quy tắc theo backend/src/modules/roomType/roomType.md
import { roomTypes, rooms } from './housing.data.js';
import { respond, reject, invalid, newId, now, sameText } from './mockHelpers.js';

const activeTypes = () => roomTypes.filter((t) => !t.isDeleted);
const roomCountOf = (typeId) => rooms.filter((r) => !r.isDeleted && r.roomTypeId === typeId).length;
const withCount = (t) => ({ ...t, roomCount: roomCountOf(t._id) });

const validateName = (name, exceptId) => {
  if (!String(name || '').trim()) return invalid([{ field: 'name', message: 'Tên loại phòng không được để trống' }]);
  if (activeTypes().some((t) => t._id !== exceptId && sameText(t.name, name))) {
    return reject(409, 'Tên loại phòng đã tồn tại', [{ field: 'name', message: 'Tên loại phòng đã tồn tại' }]);
  }
  return null;
};

export const roomTypeMock = {
  list: () => respond(activeTypes().map(withCount)),

  create: ({ name }) => {
    const error = validateName(name);
    if (error) return error;
    const type = { _id: newId(), name: name.trim(), isDeleted: false, createdAt: now(), updatedAt: now() };
    roomTypes.push(type);
    return respond(withCount(type), 'Thêm loại phòng thành công');
  },

  update: (id, { name }) => {
    const type = activeTypes().find((t) => t._id === id);
    if (!type) return reject(404, 'Loại phòng không tồn tại');
    const error = validateName(name, id);
    if (error) return error;
    Object.assign(type, { name: name.trim(), updatedAt: now() });
    return respond(withCount(type), 'Cập nhật loại phòng thành công');
  },

  remove: (id) => {
    const type = activeTypes().find((t) => t._id === id);
    if (!type) return reject(404, 'Loại phòng không tồn tại');
    const count = roomCountOf(id);
    if (count > 0) {
      return reject(409, `Không thể xóa: đang có ${count} phòng dùng loại này. Hãy đổi loại cho các phòng đó trước.`);
    }
    type.isDeleted = true;
    return respond(null, 'Đã xóa loại phòng');
  },
};

export default roomTypeMock;
