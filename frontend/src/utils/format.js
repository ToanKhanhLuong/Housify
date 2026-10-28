// Định dạng hiển thị. Mọi nơi hiện tiền và ngày đều dùng các hàm này cho giống nhau
const EMPTY = '—'; // không có dữ liệu

const toDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

// 1200000 → "1.200.000 đ"
export const formatMoney = (value) =>
    typeof value === 'number' ? `${new Intl.NumberFormat('vi-VN').format(value)} đ` : EMPTY;

// "2026-10-21T..." → "21/10/2026"
export const formatDate = (value) => toDate(value)?.toLocaleDateString('vi-VN') ?? EMPTY;

// "2026-10-21T13:45:00Z" → "21/10/2026 13:45"
export const formatDateTime = (value) => {
    const date = toDate(value);
    if (!date) return EMPTY;
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${date.toLocaleDateString('vi-VN')} ${time}`;
};

// kỳ hóa đơn: "2026-10-01" → "10/2026"
export const formatPeriod = (value) => {
    const date = toDate(value);
    return date ? `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` : EMPTY;
};

// đổ ngày từ API vào <input type="date"> (ô này chỉ nhận yyyy-MM-dd)
export const toDateInput = (value) => {
    const date = toDate(value);
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};