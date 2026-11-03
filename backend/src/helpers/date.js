// Xử lý ngày theo giờ Việt Nam (UTC+7). Server deploy có thể chạy giờ UTC nên không dùng setHours theo giờ máy

// Việt Nam không đổi giờ mùa hè nên lệch cố định 7 tiếng
export const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Đưa một thời điểm về 00:00 giờ Việt Nam của chính ngày đó.
 * VD: '2026-11-01' (Joi đọc thành 2026-11-01T00:00Z) → 2026-10-31T17:00Z, tức 00:00 ngày 01/11 giờ Việt Nam.
 * Dùng cho các ngày chỉ có ý nghĩa theo ngày, như ngày bắt đầu áp dụng giá (UC-22).
 */
export const startOfVietnamDay = (value) => {
    const vietnamTime = new Date(new Date(value).getTime() + VIETNAM_OFFSET_MS);
    vietnamTime.setUTCHours(0, 0, 0, 0);
    return new Date(vietnamTime.getTime() - VIETNAM_OFFSET_MS);
};

/**
 * Đưa một thời điểm về 23:59:59.999 giờ Việt Nam của chính ngày đó.
 * VD: '2026-11-01' → 2026-11-01T16:59:59.999Z, tức 23:59:59.999 ngày 01/11 giờ Việt Nam.
 * Dùng cho ngày kết thúc hợp đồng (endDate) và kiểm tra hết hạn cuối ngày.
 */
export const endOfVietnamDay = (value) => {
    const vietnamTime = new Date(new Date(value).getTime() + VIETNAM_OFFSET_MS);
    vietnamTime.setUTCHours(23, 59, 59, 999);
    return new Date(vietnamTime.getTime() - VIETNAM_OFFSET_MS);
};
