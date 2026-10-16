export const MSG = Object.freeze({
    // Auth
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    LOGOUT_SUCCESS: 'Đăng xuất thành công',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
    ACCOUNT_LOCKED: 'Tài khoản đã bị khóa',
    ACCOUNT_NOT_ACTIVATED: 'Tài khoản chưa được kích hoạt',
    TOKEN_EXPIRED: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại',
    TOKEN_INVALID: 'Token không hợp lệ',
    UNAUTHORIZED: 'Bạn chưa đăng nhập',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',

    // CRUD chung
    NOT_FOUND: (resource) => `${resource} không tồn tại`,
    CREATED: (resource) => `Tạo ${resource} thành công`,
    UPDATED: (resource) => `Cập nhật ${resource} thành công`,
    DELETED: (resource) => `Xóa ${resource} thành công`,
    ALREADY_EXISTS: (resource) => `${resource} đã tồn tại`,

    // Validation
    REQUIRED: (field) => `${field} là bắt buộc`,
    INVALID: (field) => `${field} không hợp lệ`,

    // Contract
    CONTRACT_ACTIVE: 'Hợp đồng đang hoạt động',
    CONTRACT_EXPIRED: 'Hợp đồng đã hết hạn',

    // Invoice / Payment
    INVOICE_PAID: 'Hóa đơn đã thanh toán',
    INVOICE_NOT_FOUND: 'Hóa đơn không tồn tại',

    // File upload
    FILE_TOO_LARGE: 'File vượt quá dung lượng cho phép',
    INVALID_FILE_TYPE: 'Loại file không được hỗ trợ',

    // Server
    SERVER_ERROR: 'Đã xảy ra lỗi, vui lòng thử lại sau',
});