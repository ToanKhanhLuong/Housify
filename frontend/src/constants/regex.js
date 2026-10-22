// Regex dùng chung cho form. Giữ GIỐNG backend/src/helpers/validators.js
export const PHONE_REGEX = /^0\d{9}$/; // 10 số, bắt đầu bằng 0
export const CCCD_REGEX = /^\d{12}$/; // đúng 12 số
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/; // BR-005: từ 6 ký tự, có chữ và số