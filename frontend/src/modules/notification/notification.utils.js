// Tiện ích của module notification (UC-41): trang mở khi bấm thông báo, biểu tượng, thời gian tương đối, báo chuông cập nhật
import { createElement } from 'react';
import {
    BiBell,
    BiBuildings,
    BiErrorCircle,
    BiFile,
    BiReceipt,
    BiSend,
    BiTime,
    BiWallet,
    BiXCircle,
} from 'react-icons/bi';
import { NOTIFICATION_TYPE as TYPE, ROLE } from '../../constants/enums';
import { formatDate } from '../../utils/format';

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

// Biểu tượng theo loại thông báo, hiện ở bảng xổ xuống của chuông (chỉ dùng bộ icon bi)
const ICONS = {
    [TYPE.INVOICE_SENT]: BiReceipt,
    [TYPE.INVOICE_CANCELLED]: BiReceipt,
    [TYPE.PAYMENT_REMINDER]: BiTime,
    [TYPE.PAYMENT_SUCCESS]: BiWallet,
    [TYPE.CONTRACT_RENEWED]: BiFile,
    [TYPE.CONTRACT_ENDED]: BiFile,
    [TYPE.DEPOSIT_REFUNDED]: BiWallet,
    [TYPE.TERMINATION_REQUEST]: BiXCircle,
    [TYPE.TERMINATION_CONFIRMED]: BiXCircle,
    [TYPE.TERMINATION_REJECTED]: BiXCircle,
    [TYPE.TERMINATION_CANCELLED]: BiXCircle,
    [TYPE.MANAGER_ASSIGNED]: BiBuildings,
    [TYPE.MANAGER_UNASSIGNED]: BiBuildings,
    [TYPE.INCIDENT_UPDATE]: BiErrorCircle,
    [TYPE.ANNOUNCEMENT]: BiSend,
};
// Trả về phần tử icon đã dựng sẵn (không trả component để tránh lỗi react-hooks/static-components)
export const renderNotificationIcon = (type, props) => createElement(ICONS[type] ?? BiBell, props);

// Thông báo trong 24 giờ gần nhất xếp nhóm "Gần đây", còn lại "Cũ hơn"
const DAY_MS = 24 * 60 * 60 * 1000;
export const isRecent = (createdAt) => Date.now() - new Date(createdAt).getTime() < DAY_MS;

// "Vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước"; quá 7 ngày thì hiện ngày
export const formatRelative = (createdAt) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return days <= 7 ? `${days} ngày trước` : formatDate(createdAt);
};
