// Tiện ích của module notification (UC-41): bấm thông báo thì mở trang nào, báo chuông cập nhật số chưa đọc
import { NOTIFICATION_TYPE as TYPE, ROLE } from '../../constants/enums';

// Trang mở ra theo type + role người nhận. Path gốc lấy đúng constants/menus.js, trang chi tiết theo quy ước <path gốc>/:id
// refId là id bản ghi liên quan (hóa đơn, hợp đồng, đơn chấm dứt, sự cố, tòa)
// Không có trong bảng = không gắn trang cụ thể (vd thông báo chung) → chỉ xem nội dung (UC-41)
// Trang chi tiết của module iter 2, 3 chưa có: module đó làm route khác thì sửa lại ở đây
const LINKS = {
    [TYPE.INVOICE_SENT]: { [ROLE.CUSTOMER]: (id) => `/my-invoices/${id}` },
    [TYPE.INVOICE_CANCELLED]: { [ROLE.CUSTOMER]: (id) => `/my-invoices/${id}` },
    [TYPE.PAYMENT_REMINDER]: { [ROLE.CUSTOMER]: (id) => `/my-invoices/${id}` },
    [TYPE.PAYMENT_SUCCESS]: {
        [ROLE.CUSTOMER]: (id) => `/my-invoices/${id}`,
        [ROLE.MANAGER]: (id) => `/invoices/${id}`,
    },
    [TYPE.CONTRACT_RENEWED]: { [ROLE.CUSTOMER]: () => '/my-contract' },
    [TYPE.CONTRACT_ENDED]: {
        [ROLE.CUSTOMER]: () => '/my-contract',
        [ROLE.MANAGER]: (id) => `/contracts/${id}`,
    },
    [TYPE.DEPOSIT_REFUNDED]: { [ROLE.CUSTOMER]: () => '/my-contract' },
    [TYPE.TERMINATION_REQUEST]: {
        [ROLE.CUSTOMER]: () => '/my-contract',
        [ROLE.ADMIN]: (id) => `/terminations/${id}`,
    },
    [TYPE.TERMINATION_CONFIRMED]: { [ROLE.CUSTOMER]: () => '/my-contract' },
    [TYPE.TERMINATION_CANCELLED]: { [ROLE.CUSTOMER]: () => '/my-contract' },
    [TYPE.MANAGER_ASSIGNED]: { [ROLE.MANAGER]: () => '/my-building' },
    [TYPE.INCIDENT_UPDATE]: {
        [ROLE.CUSTOMER]: (id) => `/my-incidents/${id}`,
        [ROLE.MANAGER]: (id) => `/incidents/${id}`,
    },
    // Manager nhận khi Admin lưu nội quy mới (UC-23), refId là tòa; Customer nhận thông báo chung, chỉ xem nội dung
    [TYPE.ANNOUNCEMENT]: { [ROLE.MANAGER]: () => '/my-building' },
};

export const getNotificationLink = (notification, role) => {
    const build = LINKS[notification.type]?.[role];
    return build ? build(notification.refId) : null;
};

// Đọc thông báo ở trang Thông báo xong thì báo chuông trên Header tải lại số chưa đọc (cùng kiểu 'auth:logout')
export const NOTIFICATIONS_CHANGED = 'notifications:changed';
export const emitNotificationsChanged = () =>
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
