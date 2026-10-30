// API của module roomType (UC-20): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

// BE đã làm xong trên nhánh be/feature/roomType nhưng chưa gộp vào main_iter_1
// Gộp xong: xóa MOCK, mockRoomTypes, mockUsage, fake, fail, các hàm mock* và các nhánh giả
const MOCK = true;

let mockRoomTypes = [
  { _id: 't1', name: 'Phòng đơn', createdAt: '2026-09-01T08:00:00.000Z' },
  { _id: 't2', name: 'Phòng đôi', createdAt: '2026-09-01T08:05:00.000Z' },
  { _id: 't3', name: 'Studio', createdAt: '2026-09-02T09:00:00.000Z' },
].map((type) => ({ ...type, updatedAt: type.createdAt }));

// số phòng chưa xóa đang dùng mỗi loại – chỉ để giả lập lỗi xóa (BR-054), BE thật không trả
const mockUsage = { t1: 3, t2: 1, t3: 1 };

const fake = (data, message = '') => Promise.resolve({ success: true, data, message });
const fail = (status, message) => Promise.reject({ status, message, errors: null });

// BR-053: tên duy nhất, so không phân biệt hoa thường, loại đã xóa không tính
const isDuplicateName = (name, exceptId) =>
  mockRoomTypes.some(
    (type) => type._id !== exceptId && type.name.toLowerCase() === name.trim().toLowerCase(),
  );

const mockCreate = ({ name }) => {
  if (isDuplicateName(name)) return fail(409, 'Tên loại phòng đã tồn tại');
  const now = new Date().toISOString();
  const roomType = { _id: String(Date.now()), name: name.trim(), createdAt: now, updatedAt: now };
  mockRoomTypes = [roomType, ...mockRoomTypes];
  return fake(roomType, 'Tạo loại phòng thành công');
};

const mockUpdate = (id, { name }) => {
  if (!mockRoomTypes.some((type) => type._id === id)) return fail(404, 'Loại phòng không tồn tại');
  if (isDuplicateName(name, id)) return fail(409, 'Tên loại phòng đã tồn tại');
  mockRoomTypes = mockRoomTypes.map((type) =>
    type._id === id ? { ...type, name: name.trim(), updatedAt: new Date().toISOString() } : type,
  );
  return fake(
    mockRoomTypes.find((type) => type._id === id),
    'Cập nhật loại phòng thành công',
  );
};

const mockRemove = (id) => {
  if (!mockRoomTypes.some((type) => type._id === id)) return fail(404, 'Loại phòng không tồn tại');
  if (mockUsage[id] > 0) {
    return fail(400, `Không thể xóa loại phòng vì đang có ${mockUsage[id]} phòng sử dụng`);
  }
  mockRoomTypes = mockRoomTypes.filter((type) => type._id !== id);
  return fake(null, 'Xóa loại phòng thành công');
};

const roomTypeApi = {
  // loại chưa xóa, mới tạo trước; không phân trang
  list: () => (MOCK ? fake(mockRoomTypes) : api.get('/room-types')),
  create: (data) => (MOCK ? mockCreate(data) : api.post('/room-types', data)),
  update: (id, data) => (MOCK ? mockUpdate(id, data) : api.put(`/room-types/${id}`, data)),
  remove: (id) => (MOCK ? mockRemove(id) : api.delete(`/room-types/${id}`)),
};

export default roomTypeApi;
