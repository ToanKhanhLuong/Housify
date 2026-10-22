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

const serviceApi = {
    list: () => (MOCK ? fake(mockServices) : api.get('/services')),
    create: (data) => (MOCK ? mockCreate(data) : api.post('/services', data)),
    update: (id, data) => (MOCK ? mockUpdate(id, data) : api.put(`/services/${id}`, data)),
    remove: (id) => (MOCK ? mockRemove(id) : api.delete(`/services/${id}`)),
};

export default serviceApi;
