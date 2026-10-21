// Enum dùng chung toàn hệ thống theo docs/database.md
// Backend và frontend giữ GIỐNG HỆT nhau: sửa ở backend rồi chép đè sang frontend/src/constants/enums.js
// Nhãn tiếng Việt để hiển thị KHÔNG để ở đây (frontend dùng constants/statusLabels.js)


// Cách dùng:
//   import { ROOM_STATUS, values } from '../constants/enums.js';
//   Mongoose: status: { type: String, enum: values(ROOM_STATUS), default: ROOM_STATUS.AVAILABLE }
//   Joi:      Joi.string().valid(...values(ROOM_STATUS))
//   So sánh:  if (room.status === ROOM_STATUS.AVAILABLE) { ... }   // KHÔNG viết chuỗi 'AVAILABLE'



// Lấy mảng giá trị của một enum – dùng cho Mongoose `enum` và Joi `.valid()`
export const values = (obj) => Object.values(obj);

// ===== Tài khoản =====

// Vai trò – roles._id, users.roleId
export const ROLE = Object.freeze({
    ADMIN: 0,
    MANAGER: 1,
    CUSTOMER: 2,
});

// Trạng thái tài khoản – users.status
export const USER_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE', // đang hoạt động
    INACTIVE: 'INACTIVE', // chỉ Customer: đã trả phòng, thuê lại thì mở lại
    PENDING: 'PENDING', // Manager chưa kích hoạt
    LOCKED: 'LOCKED', // Admin khóa Manager / Customer bị chấm dứt đơn phương
});

// Trạng thái OTP và link kích hoạt – otp_tokens.status, activation_tokens.status (để trống = chưa dùng)
export const TOKEN_STATUS = Object.freeze({
    USED: 'USED',
    EXPIRED: 'EXPIRED',
});

// Loại link kích hoạt – activation_tokens.type
export const ACTIVATION_TYPE = Object.freeze({
    CUSTOMER_INVITE: 'CUSTOMER_INVITE', // mời Customer ký hợp đồng (UC-24, UC-06)
    MANAGER_ACTIVATION: 'MANAGER_ACTIVATION', // Manager tự đặt mật khẩu (UC-08)
});

// ===== Tòa nhà & phòng =====

// Trạng thái phòng – rooms.status
export const ROOM_STATUS = Object.freeze({
    AVAILABLE: 'AVAILABLE', // trống
    OCCUPIED: 'OCCUPIED', // đang thuê – chỉ hệ thống đặt
    MAINTENANCE: 'MAINTENANCE', // bảo trì – Admin đặt (UC-17)
});

// ===== Hợp đồng & cư dân =====

// Loại hợp đồng – contracts.contractType
export const CONTRACT_TYPE = Object.freeze({
    SINGLE: 'SINGLE', // 1 người
    GROUP: 'GROUP', // 2 người trở lên
});

// Trạng thái hợp đồng – contracts.status (có đơn chấm dứt thì vẫn ACTIVE)
export const CONTRACT_STATUS = Object.freeze({
    DRAFT: 'DRAFT', // nháp, chờ khách kích hoạt
    ACTIVE: 'ACTIVE', // đang hiệu lực
    ENDED: 'ENDED', // đã kết thúc
    CANCELLED: 'CANCELLED', // hủy khi còn nháp
});

// Trạng thái cư dân – occupants.status
export const OCCUPANT_STATUS = Object.freeze({
    STAYED: 'STAYED', // đang ở
    LEFT: 'LEFT', // đã chuyển đi
});

// Loại đơn chấm dứt – termination_requests.type
export const TERMINATION_TYPE = Object.freeze({
    MUTUAL: 'MUTUAL', // hai bên thỏa thuận – Customer xác nhận (UC-28)
    UNILATERAL: 'UNILATERAL', // đơn phương – Admin duyệt (UC-29)
});

// Trạng thái đơn chấm dứt – termination_requests.status
export const TERMINATION_STATUS = Object.freeze({
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    REJECTED: 'REJECTED', // chỉ UNILATERAL
    CANCELLED: 'CANCELLED', // Manager hủy
});

// ===== Hóa đơn =====

// Loại dòng tiền trong hóa đơn – invoices.items[].type
export const INVOICE_ITEM_TYPE = Object.freeze({
    RENT: 'RENT', // tiền phòng
    METERED: 'METERED', // điện, nước theo chỉ số
    FIXED: 'FIXED', // phí cố định
    EXTRA: 'EXTRA', // chi phí phát sinh
});

// Trạng thái hóa đơn – invoices.status
export const INVOICE_STATUS = Object.freeze({
    DRAFT: 'DRAFT', // nháp, sửa được
    PENDING: 'PENDING', // đã gửi, chờ thanh toán
    PAID: 'PAID', // đã thanh toán
    CANCELLED: 'CANCELLED', // đã hủy
});

// ===== Thông báo =====

// Loại thông báo – notifications.type (người nhận: xem docs/database.md)
export const NOTIFICATION_TYPE = Object.freeze({
    INVOICE_SENT: 'INVOICE_SENT',                   // Hóa đơn đã gửi
    INVOICE_CANCELLED: 'INVOICE_CANCELLED',         // Hủy hóa đơn
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',             // Thanh toán thành công
    PAYMENT_REMINDER: 'PAYMENT_REMINDER',           // Nhắc nhở thanh toán
    CONTRACT_RENEWED: 'CONTRACT_RENEWED',           // Gia hạn hợp đồng
    CONTRACT_ENDED: 'CONTRACT_ENDED',               // Hợp đồng hết hạn
    DEPOSIT_REFUNDED: 'DEPOSIT_REFUNDED',           // Hoàn tiền đặt cọc
    TERMINATION_REQUEST: 'TERMINATION_REQUEST',     // YÊU CẦU CHẤM DỨT, Nhắc nhở mỗi ngày
    TERMINATION_CONFIRMED: 'TERMINATION_CONFIRMED', // Xác nhận chấm dứt hợp đồng
    TERMINATION_REJECTED: 'TERMINATION_REJECTED',   // Từ chối chấm dứt hợp đồng
    TERMINATION_CANCELLED: 'TERMINATION_CANCELLED', // Hủy chấm dứt hợp đồng
    MANAGER_ASSIGNED: 'MANAGER_ASSIGNED',           // Gán quản lý cho tòa nhà
    MANAGER_UNASSIGNED: 'MANAGER_UNASSIGNED',       // Gỡ quản lý tòa nhà
    INCIDENT_UPDATE: 'INCIDENT_UPDATE',             // Cập nhật sự cố
    ANNOUNCEMENT: 'ANNOUNCEMENT',                   // Thông báo chung
});

// ===== Sự cố =====

// Loại sự cố – incidents.type
export const INCIDENT_TYPE = Object.freeze({
    SERVICE: 'SERVICE', // dịch vụ
    EQUIPMENT: 'EQUIPMENT', // thiết bị
    VIOLATION: 'VIOLATION', // vi phạm
    OTHER: 'OTHER', // khác
});

// Trạng thái sự cố – incidents.status
export const INCIDENT_STATUS = Object.freeze({
    PENDING: 'PENDING', // chờ tiếp nhận
    IN_PROGRESS: 'IN_PROGRESS', // đang xử lý
    RESOLVED: 'RESOLVED', // đã giải quyết
    REJECTED: 'REJECTED', // từ chối
});

// ===== Nhật ký =====

// Thao tác ghi nhật ký – audit_logs.action
export const AUDIT_ACTION = Object.freeze({
    LOCK_USER: 'LOCK_USER', // bắt buộc có reason
    UNLOCK_USER: 'UNLOCK_USER',
    DEACTIVATE_USER: 'DEACTIVATE_USER', // Customer → INACTIVE sau trả phòng
    REACTIVATE_USER: 'REACTIVATE_USER', // Customer thuê lại → ACTIVE
    ASSIGN_MANAGER: 'ASSIGN_MANAGER',
    UNASSIGN_MANAGER: 'UNASSIGN_MANAGER',
    RESEND_ACTIVATION: 'RESEND_ACTIVATION',
    UPDATE_MANAGER: 'UPDATE_MANAGER',
    DELETE_MANAGER: 'DELETE_MANAGER',
    UPDATE_CONTRACT: 'UPDATE_CONTRACT', // sửa, gia hạn, hủy hợp đồng nháp
    ADD_OCCUPANT: 'ADD_OCCUPANT',
    UPDATE_OCCUPANT: 'UPDATE_OCCUPANT',
    REMOVE_OCCUPANT: 'REMOVE_OCCUPANT',
});


