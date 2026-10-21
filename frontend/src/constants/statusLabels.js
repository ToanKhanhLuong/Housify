// Nhãn tiếng Việt + màu Badge cho các enum trong enums.js. Trang không tự viết nhãn, dùng <StatusBadge group="..." value={...} />
import {
  ROLE,
  USER_STATUS,
  ROOM_STATUS,
  CONTRACT_TYPE,
  CONTRACT_STATUS,
  OCCUPANT_STATUS,
  TERMINATION_TYPE,
  TERMINATION_STATUS,
  INVOICE_ITEM_TYPE,
  INVOICE_STATUS,
  NOTIFICATION_TYPE,
  INCIDENT_TYPE,
  INCIDENT_STATUS,
} from './enums.js';

export const ROLE_LABELS = {
  [ROLE.ADMIN]: 'Quản trị viên',
  [ROLE.MANAGER]: 'Quản lý tòa nhà',
  [ROLE.CUSTOMER]: 'Khách thuê',
};

// bg: màu Badge của Bootstrap (primary, secondary, success, danger, warning, info, dark)
export const STATUS_LABELS = {
  USER_STATUS: {
    [USER_STATUS.ACTIVE]: { label: 'Đang hoạt động', bg: 'success' },
    [USER_STATUS.INACTIVE]: { label: 'Ngừng hoạt động', bg: 'secondary' },
    [USER_STATUS.PENDING]: { label: 'Chưa kích hoạt', bg: 'warning' },
    [USER_STATUS.LOCKED]: { label: 'Đã khóa', bg: 'danger' },
  },
  ROOM_STATUS: {
    [ROOM_STATUS.AVAILABLE]: { label: 'Trống', bg: 'success' },
    [ROOM_STATUS.OCCUPIED]: { label: 'Đang thuê', bg: 'primary' },
    [ROOM_STATUS.MAINTENANCE]: { label: 'Bảo trì', bg: 'warning' },
  },
  CONTRACT_TYPE: {
    [CONTRACT_TYPE.SINGLE]: { label: 'Thuê một người', bg: 'info' },
    [CONTRACT_TYPE.GROUP]: { label: 'Thuê nhóm', bg: 'primary' },
  },
  CONTRACT_STATUS: {
    [CONTRACT_STATUS.DRAFT]: { label: 'Nháp', bg: 'secondary' },
    [CONTRACT_STATUS.ACTIVE]: { label: 'Đang hiệu lực', bg: 'success' },
    [CONTRACT_STATUS.ENDED]: { label: 'Đã kết thúc', bg: 'dark' },
    [CONTRACT_STATUS.CANCELLED]: { label: 'Đã hủy', bg: 'danger' },
  },
  OCCUPANT_STATUS: {
    [OCCUPANT_STATUS.STAYED]: { label: 'Đang ở', bg: 'success' },
    [OCCUPANT_STATUS.LEFT]: { label: 'Đã chuyển đi', bg: 'secondary' },
  },
  TERMINATION_TYPE: {
    [TERMINATION_TYPE.MUTUAL]: { label: 'Hai bên thỏa thuận', bg: 'info' },
    [TERMINATION_TYPE.UNILATERAL]: { label: 'Đơn phương', bg: 'warning' },
  },
  TERMINATION_STATUS: {
    [TERMINATION_STATUS.PENDING]: { label: 'Chờ xác nhận', bg: 'warning' },
    [TERMINATION_STATUS.CONFIRMED]: { label: 'Đã xác nhận', bg: 'success' },
    [TERMINATION_STATUS.REJECTED]: { label: 'Bị từ chối', bg: 'danger' },
    [TERMINATION_STATUS.CANCELLED]: { label: 'Đã hủy', bg: 'secondary' },
  },
  INVOICE_ITEM_TYPE: {
    [INVOICE_ITEM_TYPE.RENT]: { label: 'Tiền phòng', bg: 'primary' },
    [INVOICE_ITEM_TYPE.METERED]: { label: 'Theo chỉ số', bg: 'info' },
    [INVOICE_ITEM_TYPE.FIXED]: { label: 'Phí cố định', bg: 'secondary' },
    [INVOICE_ITEM_TYPE.EXTRA]: { label: 'Phát sinh', bg: 'warning' },
  },
  INVOICE_STATUS: {
    [INVOICE_STATUS.DRAFT]: { label: 'Nháp', bg: 'secondary' },
    [INVOICE_STATUS.PENDING]: { label: 'Chờ thanh toán', bg: 'warning' },
    [INVOICE_STATUS.PAID]: { label: 'Đã thanh toán', bg: 'success' },
    [INVOICE_STATUS.CANCELLED]: { label: 'Đã hủy', bg: 'danger' },
  },
  NOTIFICATION_TYPE: {
    [NOTIFICATION_TYPE.INVOICE_SENT]: { label: 'Hóa đơn mới', bg: 'primary' },
    [NOTIFICATION_TYPE.INVOICE_CANCELLED]: { label: 'Hóa đơn bị hủy', bg: 'danger' },
    [NOTIFICATION_TYPE.PAYMENT_SUCCESS]: { label: 'Thanh toán thành công', bg: 'success' },
    [NOTIFICATION_TYPE.PAYMENT_REMINDER]: { label: 'Nhắc thanh toán', bg: 'warning' },
    [NOTIFICATION_TYPE.CONTRACT_RENEWED]: { label: 'Gia hạn hợp đồng', bg: 'info' },
    [NOTIFICATION_TYPE.CONTRACT_ENDED]: { label: 'Hợp đồng kết thúc', bg: 'dark' },
    [NOTIFICATION_TYPE.DEPOSIT_REFUNDED]: { label: 'Hoàn tiền cọc', bg: 'success' },
    [NOTIFICATION_TYPE.TERMINATION_REQUEST]: { label: 'Đơn chấm dứt', bg: 'warning' },
    [NOTIFICATION_TYPE.TERMINATION_CONFIRMED]: { label: 'Chấm dứt được xác nhận', bg: 'success' },
    [NOTIFICATION_TYPE.TERMINATION_REJECTED]: { label: 'Chấm dứt bị từ chối', bg: 'danger' },
    [NOTIFICATION_TYPE.TERMINATION_CANCELLED]: { label: 'Đơn chấm dứt bị hủy', bg: 'secondary' },
    [NOTIFICATION_TYPE.MANAGER_ASSIGNED]: { label: 'Được phân công tòa', bg: 'success' },
    [NOTIFICATION_TYPE.MANAGER_UNASSIGNED]: { label: 'Bị gỡ khỏi tòa', bg: 'secondary' },
    [NOTIFICATION_TYPE.INCIDENT_UPDATE]: { label: 'Cập nhật sự cố', bg: 'info' },
    [NOTIFICATION_TYPE.ANNOUNCEMENT]: { label: 'Thông báo chung', bg: 'primary' },
  },
  INCIDENT_TYPE: {
    [INCIDENT_TYPE.SERVICE]: { label: 'Dịch vụ', bg: 'info' },
    [INCIDENT_TYPE.EQUIPMENT]: { label: 'Thiết bị', bg: 'primary' },
    [INCIDENT_TYPE.VIOLATION]: { label: 'Vi phạm', bg: 'danger' },
    [INCIDENT_TYPE.OTHER]: { label: 'Khác', bg: 'secondary' },
  },
  INCIDENT_STATUS: {
    [INCIDENT_STATUS.PENDING]: { label: 'Chờ xử lý', bg: 'warning' },
    [INCIDENT_STATUS.IN_PROGRESS]: { label: 'Đang xử lý', bg: 'info' },
    [INCIDENT_STATUS.RESOLVED]: { label: 'Đã giải quyết', bg: 'success' },
    [INCIDENT_STATUS.REJECTED]: { label: 'Bị từ chối', bg: 'danger' },
  },
};

// Lấy { label, bg }; giá trị lạ thì hiện nguyên giá trị, màu xám
export const getStatusLabel = (group, value) =>
  STATUS_LABELS[group]?.[value] || { label: value ?? '', bg: 'secondary' };

// Danh sách { value, label } cho ô chọn / bộ lọc: toOptions('ROOM_STATUS')
export const toOptions = (group) =>
  Object.entries(STATUS_LABELS[group] || {}).map(([value, { label }]) => ({ value, label }));
