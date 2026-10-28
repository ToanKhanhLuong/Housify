// API của module notification (UC-41): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';
import { NOTIFICATION_TYPE } from '../../constants/enums';

// BE (An) xong: xóa MOCK, mockNotifications, fake, at, các hàm mock* và các nhánh giả
// Hình dạng response chưa ghi trong api.md, đang tạm theo quy ước chung + docs/database.md:
//   GET /notifications?page=&limit=&unread=true → { items, total, page, limit }, mới nhất trước
//   GET /notifications/unread-count → { count }
// Dữ liệu giả KHÔNG lọc theo role; BE thật chỉ trả thông báo của chính người đang đăng nhập
const MOCK = true;

const at = (day, time) => `2026-10-${day}T${time}:00+07:00`;
let mockNotifications = [
    {
        _id: 'n1',
        type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
        title: 'Đơn đơn phương chấm dứt chờ duyệt',
        message: 'Manager tòa Housify Cầu Giấy gửi đơn đơn phương chấm dứt hợp đồng phòng P203.',
        refId: 't1',
        isRead: false,
        createdAt: at(27, '09:15'),
    },
    {
        _id: 'n2',
        type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
        title: 'Thanh toán thành công',
        message: 'Hóa đơn HD2610K7QX phòng P101 đã được thanh toán 3.450.000 đ.',
        refId: 'i1',
        isRead: false,
        createdAt: at(27, '08:02'),
    },
    {
        _id: 'n3',
        type: NOTIFICATION_TYPE.INVOICE_SENT,
        title: 'Hóa đơn tháng 10/2026',
        message: 'Bạn có hóa đơn mới HD2610K7QX, hạn thanh toán 03/11/2026.',
        refId: 'i1',
        isRead: false,
        createdAt: at(26, '20:30'),
    },
    {
        _id: 'n4',
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: 'Cắt nước bảo trì',
        message:
            'Tòa sẽ cắt nước từ 8h đến 11h sáng thứ Bảy 01/11 để bảo trì bồn chứa.\nMọi người chủ động trữ nước giúp Ban quản lý.',
        refId: null,
        isRead: false,
        createdAt: at(26, '17:45'),
    },
    {
        _id: 'n5',
        type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
        title: 'Sự cố đang được xử lý',
        message: 'Sự cố "Vòi nước rò rỉ" phòng P101 đã được tiếp nhận và đang xử lý.',
        refId: 'inc1',
        isRead: true,
        createdAt: at(25, '10:20'),
    },
    {
        _id: 'n6',
        type: NOTIFICATION_TYPE.MANAGER_ASSIGNED,
        title: 'Được phân công tòa nhà',
        message: 'Bạn được phân công quản lý tòa Housify Cầu Giấy.',
        refId: 'b1',
        isRead: true,
        createdAt: at(24, '14:00'),
    },
    {
        _id: 'n7',
        type: NOTIFICATION_TYPE.CONTRACT_RENEWED,
        title: 'Hợp đồng được gia hạn',
        message: 'Hợp đồng phòng P101 được gia hạn đến 31/08/2027.',
        refId: 'c1',
        isRead: true,
        createdAt: at(23, '09:00'),
    },
    {
        _id: 'n8',
        type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
        title: 'Nhắc thanh toán',
        message: 'Hóa đơn HD2609A2BC còn 3 ngày nữa đến hạn thanh toán.',
        refId: 'i0',
        isRead: true,
        createdAt: at(22, '08:00'),
    },
    {
        _id: 'n9',
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: 'Nội quy mới',
        message: 'Tòa Housify Cầu Giấy vừa cập nhật nội quy.',
        refId: 'b1',
        isRead: true,
        createdAt: at(21, '16:10'),
    },
    {
        _id: 'n10',
        type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
        title: 'Sự cố mới',
        message: 'Phòng P205 báo sự cố "Điều hòa không lạnh".',
        refId: 'inc2',
        isRead: true,
        createdAt: at(20, '19:40'),
    },
    {
        _id: 'n11',
        type: NOTIFICATION_TYPE.INVOICE_CANCELLED,
        title: 'Hóa đơn bị hủy',
        message: 'Hóa đơn HD2609Z9XY đã bị hủy. Lý do: nhập sai chỉ số điện.',
        refId: 'i9',
        isRead: true,
        createdAt: at(19, '11:25'),
    },
    {
        _id: 'n12',
        type: NOTIFICATION_TYPE.DEPOSIT_REFUNDED,
        title: 'Đã hoàn tiền cọc',
        message: 'Ban quản lý đã ghi nhận hoàn 3.000.000 đ tiền cọc.',
        refId: 'c0',
        isRead: true,
        createdAt: at(18, '15:00'),
    },
];
const fake = (data, message = '') => Promise.resolve({ success: true, data, message });

const mockList = ({ page = 1, limit = 10, unread } = {}) => {
    const filtered = mockNotifications.filter((item) => !unread || !item.isRead);
    const items = filtered.slice((page - 1) * limit, page * limit);
    return fake({ items, total: filtered.length, page, limit });
};

const mockMarkRead = (id) => {
    mockNotifications = mockNotifications.map((item) =>
        item._id === id ? { ...item, isRead: true } : item,
    );
    return fake(mockNotifications.find((item) => item._id === id));
};

const mockMarkAllRead = () => {
    mockNotifications = mockNotifications.map((item) => ({ ...item, isRead: true }));
    return fake(null);
};

const notificationApi = {
    list: (params) => (MOCK ? mockList(params) : api.get('/notifications', { params })),
    unreadCount: () =>
        MOCK
            ? fake({ count: mockNotifications.filter((item) => !item.isRead).length })
            : api.get('/notifications/unread-count'),
    markRead: (id) => (MOCK ? mockMarkRead(id) : api.patch(`/notifications/${id}/read`)),
    markAllRead: () => (MOCK ? mockMarkAllRead() : api.patch('/notifications/read-all')),
};

export default notificationApi;
