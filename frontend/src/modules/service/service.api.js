// API của module service (UC-21, 22): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const serviceApi = {
  // UC-21: danh sách dịch vụ (?q=&isFixed=)
  list: (params) => api.get('/services', { params }),

  // UC-21: tạo dịch vụ { name, unit, isFixed }
  create: (data) => api.post('/services', data),

  // UC-21: sửa dịch vụ
  update: (id, data) => api.put(`/services/${id}`, data),

  // UC-21: xóa mềm dịch vụ
  remove: (id) => api.delete(`/services/${id}`),

  // UC-22: danh sách tòa nhà để chọn thiết lập giá
  listBuildings: () => api.get('/buildings'),

  // UC-22: lịch sử giá dịch vụ của một tòa
  listPrices: (buildingId) => api.get(`/buildings/${buildingId}/service-prices`),

  // UC-22: thêm / sửa mức giá { serviceId, unitPrice, effectiveFrom }
  savePrice: (buildingId, data) =>
    api.post(`/buildings/${buildingId}/service-prices`, data),
};

export default serviceApi;
