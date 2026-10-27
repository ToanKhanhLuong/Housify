// API của module service (UC-21, 22): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const MOCK = true; // BE xong: xóa MOCK, mockServices, fake, fail, các hàm mock* và các nhánh giả
let mockServices = [
    { _id: '1', name: 'Điện', unit: 'kWh', isFixed: false },
    { _id: '2', name: 'Nước', unit: 'm³', isFixed: false },
    { _id: '3', name: 'Gửi xe', unit: 'xe/tháng', isFixed: true },
    { _id: '4', name: 'Wifi', unit: 'tháng', isFixed: true },
];
const fake = (data, message = '') => Promise.resolve({ success: true, data, message });
const fail = (status, message) => Promise.reject({ status, message, errors: null });

// giả lập BE: tên duy nhất trong các dịch vụ đang hoạt động (UC-21)
const isDuplicateName = (name, exceptId) =>
    mockServices.some(
        (service) =>
            service._id !== exceptId && service.name.toLowerCase() === name.trim().toLowerCase(),
    );

const mockCreate = (data) => {
    if (isDuplicateName(data.name)) return fail(409, 'Tên dịch vụ đã tồn tại');
    const service = { _id: String(Date.now()), ...data };
    mockServices = [...mockServices, service];
    return fake(service);
};

const mockUpdate = (id, data) => {
    if (isDuplicateName(data.name, id)) return fail(409, 'Tên dịch vụ đã tồn tại');
    mockServices = mockServices.map((service) =>
        service._id === id ? { ...service, ...data } : service,
    );
    return fake(mockServices.find((service) => service._id === id));
};

const mockRemove = (id) => {
    mockServices = mockServices.filter((service) => service._id !== id);
    return fake(null);
};

// UC-22. Hình dạng response chưa ghi trong api.md, đang tạm theo docs/database.md:
//   tòa: mảng buildings (giống dữ liệu giả của module building)
//   mức giá: [{ _id, serviceId, buildingId, unitPrice, effectiveFrom }]
const mockBuildings = [
    { _id: 'b1', name: 'Housify Cầu Giấy' },
    { _id: 'b2', name: 'Housify Thanh Xuân' },
];
let mockPrices = [
    { _id: 'p1', serviceId: '1', buildingId: 'b1', unitPrice: 3500, effectiveFrom: '2026-01-01' },
    { _id: 'p2', serviceId: '1', buildingId: 'b1', unitPrice: 4000, effectiveFrom: '2026-11-01' },
    { _id: 'p3', serviceId: '2', buildingId: 'b1', unitPrice: 25000, effectiveFrom: '2026-01-01' },
    { _id: 'p4', serviceId: '3', buildingId: 'b1', unitPrice: 100000, effectiveFrom: '2026-01-01' },
];

// giả lập BE: trùng ngày bắt đầu với mức đã có thì sửa mức đó, không tạo mới (UC-22 A1)
const mockSavePrice = (buildingId, data) => {
    const existed = mockPrices.find(
        (price) =>
            price.buildingId === buildingId &&
            price.serviceId === data.serviceId &&
            price.effectiveFrom === data.effectiveFrom,
    );
    if (existed) {
        const updated = { ...existed, unitPrice: data.unitPrice };
        mockPrices = mockPrices.map((price) => (price === existed ? updated : price));
        return fake(updated);
    }
    const price = { _id: String(Date.now()), buildingId, ...data };
    mockPrices = [...mockPrices, price];
    return fake(price);
};

const serviceApi = {
    list: () => (MOCK ? fake(mockServices) : api.get('/services')),
    create: (data) => (MOCK ? mockCreate(data) : api.post('/services', data)),
    update: (id, data) => (MOCK ? mockUpdate(id, data) : api.put(`/services/${id}`, data)),
    remove: (id) => (MOCK ? mockRemove(id) : api.delete(`/services/${id}`)),

    // UC-22: danh sách tòa để chọn, lịch sử giá của một tòa, thêm / sửa một mức giá
    listBuildings: () => (MOCK ? fake(mockBuildings) : api.get('/buildings')),
    listPrices: (buildingId) =>
        MOCK
            ? fake(mockPrices.filter((price) => price.buildingId === buildingId))
            : api.get(`/buildings/${buildingId}/service-prices`),
    savePrice: (buildingId, data) =>
        MOCK
            ? mockSavePrice(buildingId, data)
            : api.post(`/buildings/${buildingId}/service-prices`, data),
};

export default serviceApi;
