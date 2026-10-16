// Regex & hàm kiểm tra định dạng dùng chung cho Joi schema các module

// SĐT Việt Nam: 10 số, bắt đầu bằng 0
export const PHONE_REGEX = /^0[0-9]{9}$/;

// CCCD: 12 chữ số
export const CCCD_REGEX = /^[0-9]{12}$/;

export const isPhone = (v) => PHONE_REGEX.test(v);
export const isCccd = (v) => CCCD_REGEX.test(v);