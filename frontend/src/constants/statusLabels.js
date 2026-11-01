// Đổi giá trị enum thành chữ tiếng Việt + màu badge. Mỗi enum một bảng riêng vì giá trị trùng tên nhau
// (PENDING của hóa đơn khác PENDING của tài khoản). Dùng: <StatusBadge map={INVOICE_STATUS_LABEL} value={...} />
import {
    CONTRACT_STATUS, CONTRACT_TYPE, INCIDENT_STATUS, INCIDENT_TYPE, INVOICE_ITEM_TYPE,
    INVOICE_STATUS, NOTIFICATION_TYPE, OCCUPANT_STATUS, ROLE, ROOM_STATUS, TERMINATION_STATUS, TERMINATION_TYPE, USER_STATUS,
} from './enums';

export const ROLE_LABEL = {
    [ROLE.ADMIN]: 'Admin',
    [ROLE.MANAGER]: 'Quản lý tòa nhà',
    [ROLE.CUSTOMER]: 'Khách thuê',
};

export const USER_STATUS_LABEL = {
    [USER_STATUS.ACTIVE]: { label: 'Đang hoạt động', variant: 'success' },
    [USER_STATUS.PENDING]: { label: 'Chưa kích hoạt', variant: 'warning' },
    [USER_STATUS.INACTIVE]: { label: 'Ngưng hoạt động', variant: 'secondary' },
    [USER_STATUS.LOCKED]: { label: 'Đã khóa', variant: 'danger' },
};

export const ROOM_STATUS_LABEL = {
    [ROOM_STATUS.AVAILABLE]: { label: 'Trống', variant: 'success' },
    [ROOM_STATUS.OCCUPIED]: { label: 'Đang thuê', variant: 'primary' },
    [ROOM_STATUS.MAINTENANCE]: { label: 'Bảo trì', variant: 'warning' },
};

export const CONTRACT_STATUS_LABEL = {
    [CONTRACT_STATUS.DRAFT]: { label: 'Nháp', variant: 'warning' },
    [CONTRACT_STATUS.ACTIVE]: { label: 'Đang hiệu lực', variant: 'success' },
    [CONTRACT_STATUS.ENDED]: { label: 'Đã kết thúc', variant: 'secondary' },
    [CONTRACT_STATUS.CANCELLED]: { label: 'Đã hủy', variant: 'danger' },
};

export const CONTRACT_TYPE_LABEL = {
    [CONTRACT_TYPE.SINGLE]: { label: 'Đơn', variant: 'secondary' },
    [CONTRACT_TYPE.GROUP]: { label: 'Nhóm', variant: 'secondary' },
};

export const OCCUPANT_STATUS_LABEL = {
    [OCCUPANT_STATUS.STAYED]: { label: 'Đang ở', variant: 'success' },
    [OCCUPANT_STATUS.LEFT]: { label: 'Đã chuyển đi', variant: 'secondary' },
};

export const TERMINATION_TYPE_LABEL = {
    [TERMINATION_TYPE.MUTUAL]: { label: 'Hai bên thỏa thuận', variant: 'secondary' },
    [TERMINATION_TYPE.UNILATERAL]: { label: 'Đơn phương', variant: 'danger' },
};

export const TERMINATION_STATUS_LABEL = {
    [TERMINATION_STATUS.PENDING]: { label: 'Chờ xử lý', variant: 'warning' },
    [TERMINATION_STATUS.CONFIRMED]: { label: 'Đã xác nhận', variant: 'success' },
    [TERMINATION_STATUS.REJECTED]: { label: 'Bị từ chối', variant: 'danger' },
    [TERMINATION_STATUS.CANCELLED]: { label: 'Đã hủy', variant: 'secondary' },
};

export const INVOICE_STATUS_LABEL = {
    [INVOICE_STATUS.DRAFT]: { label: 'Nháp', variant: 'secondary' },
    [INVOICE_STATUS.PENDING]: { label: 'Chờ thanh toán', variant: 'warning' },
    [INVOICE_STATUS.PAID]: { label: 'Đã thanh toán', variant: 'success' },
    [INVOICE_STATUS.CANCELLED]: { label: 'Đã hủy', variant: 'danger' },
};

export const INVOICE_ITEM_TYPE_LABEL = {
    [INVOICE_ITEM_TYPE.RENT]: { label: 'Tiền phòng', variant: 'secondary' },
    [INVOICE_ITEM_TYPE.METERED]: { label: 'Theo chỉ số', variant: 'secondary' },
    [INVOICE_ITEM_TYPE.FIXED]: { label: 'Phí cố định', variant: 'secondary' },
    [INVOICE_ITEM_TYPE.EXTRA]: { label: 'Phát sinh', variant: 'secondary' },
};

export const INCIDENT_TYPE_LABEL = {
    [INCIDENT_TYPE.SERVICE]: { label: 'Dịch vụ', variant: 'secondary' },
    [INCIDENT_TYPE.EQUIPMENT]: { label: 'Thiết bị', variant: 'secondary' },
    [INCIDENT_TYPE.VIOLATION]: { label: 'Vi phạm', variant: 'secondary' },
    [INCIDENT_TYPE.OTHER]: { label: 'Khác', variant: 'secondary' },
};

export const INCIDENT_STATUS_LABEL = {
    [INCIDENT_STATUS.PENDING]: { label: 'Chờ tiếp nhận', variant: 'warning' },
    [INCIDENT_STATUS.IN_PROGRESS]: { label: 'Đang xử lý', variant: 'info' },
    [INCIDENT_STATUS.RESOLVED]: { label: 'Đã giải quyết', variant: 'success' },
    [INCIDENT_STATUS.REJECTED]: { label: 'Từ chối', variant: 'danger' },
};

// Nhóm loại thông báo cho nhãn ở trang Thông báo (UC-41, chữ theo mockup Notifications.dc.html)
export const NOTIFICATION_TYPE_LABEL = {
    [NOTIFICATION_TYPE.INVOICE_SENT]: { label: 'Hóa đơn', variant: 'secondary' },
    [NOTIFICATION_TYPE.INVOICE_CANCELLED]: { label: 'Hóa đơn', variant: 'secondary' },
    [NOTIFICATION_TYPE.PAYMENT_SUCCESS]: { label: 'Thanh toán', variant: 'secondary' },
    [NOTIFICATION_TYPE.PAYMENT_REMINDER]: { label: 'Thanh toán', variant: 'secondary' },
    [NOTIFICATION_TYPE.CONTRACT_RENEWED]: { label: 'Hợp đồng', variant: 'secondary' },
    [NOTIFICATION_TYPE.CONTRACT_ENDED]: { label: 'Hợp đồng', variant: 'secondary' },
    [NOTIFICATION_TYPE.DEPOSIT_REFUNDED]: { label: 'Hợp đồng', variant: 'secondary' },
    [NOTIFICATION_TYPE.TERMINATION_REQUEST]: { label: 'Đơn chấm dứt', variant: 'secondary' },
    [NOTIFICATION_TYPE.TERMINATION_CONFIRMED]: { label: 'Đơn chấm dứt', variant: 'secondary' },
    [NOTIFICATION_TYPE.TERMINATION_REJECTED]: { label: 'Đơn chấm dứt', variant: 'secondary' },
    [NOTIFICATION_TYPE.TERMINATION_CANCELLED]: { label: 'Đơn chấm dứt', variant: 'secondary' },
    [NOTIFICATION_TYPE.MANAGER_ASSIGNED]: { label: 'Phân công', variant: 'secondary' },
    [NOTIFICATION_TYPE.MANAGER_UNASSIGNED]: { label: 'Phân công', variant: 'secondary' },
    [NOTIFICATION_TYPE.INCIDENT_UPDATE]: { label: 'Sự cố', variant: 'secondary' },
    [NOTIFICATION_TYPE.ANNOUNCEMENT]: { label: 'Thông báo chung', variant: 'secondary' },
};

// Đổi bảng nhãn thành options cho <Select>: toOptions(ROOM_STATUS_LABEL) → [{ value: 'AVAILABLE', label: 'Trống' }, ...]
export const toOptions = (map) =>
    Object.entries(map).map(([value, item]) => ({
        value,
        label: typeof item === 'string' ? item : item.label,
    }));