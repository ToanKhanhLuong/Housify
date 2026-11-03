// API của module occupant (UC-30..33): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
// Danh sách có phân trang: data = { items, total, page, limit, totalPages }
import api from '../../api/axios';

const occupantApi = {
  // UC-30 (Manager): cư dân trong tòa. ?roomId=&status=STAYED,LEFT&page=&limit= (tối đa 50). Không truyền status → chỉ STAYED
  list: (params) => api.get('/occupants', { params }),

  // UC-30: chi tiết, kèm cccdFrontUrl / cccdBackUrl (link ảnh có ký, tạm thời), room, contract
  detail: (id) => api.get(`/occupants/${id}`),

  // UC-31: sửa – chỉ gửi field đổi { name?, cccd?, phone?, dateOfBirth?, address?, relationship?, cccdFrontImage?, cccdBackImage? }
  update: (id, data) => api.put(`/occupants/${id}`, data),

  // UC-32 (Manager): thêm người ở cùng vào hợp đồng ACTIVE { name, cccd, phone, dateOfBirth, address?, joinDate?, relationship?, ảnh? }
  add: (contractId, data) => api.post(`/contracts/${contractId}/occupants`, data),

  // UC-33 (Manager): người ở cùng rời phòng { exitDate?, note? } → LEFT + exitDate, không xóa bản ghi
  leave: (id, data) => api.patch(`/occupants/${id}/leave`, data),

  // UC-30 (Customer): thành viên hợp đồng ACTIVE của mình → { contractId, room{ roomNumber, floorNumber, status, capacity }, items[] }
  myRoomMembers: () => api.get('/me/room-members'),

  // (Customer) hợp đồng đang ở – tóm tắt giá thuê, thời hạn ở trang Phòng của tôi (GET /contracts/:id)
  contract: (id) => api.get(`/contracts/${id}`),

  // phòng của tòa Manager phụ trách – để tìm cư dân theo mã phòng (GET /buildings/:id/rooms)
  rooms: (buildingId) => api.get(`/buildings/${buildingId}/rooms`),

  // hợp đồng đang hiệu lực của tòa (tối đa 50) – để chọn phòng khi thêm người ở cùng
  activeContracts: () => api.get('/contracts', { params: { status: 'ACTIVE', limit: 50 } }),
};

export default occupantApi;
