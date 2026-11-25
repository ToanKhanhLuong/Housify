// Regex & hàm kiểm tra định dạng dùng chung cho Joi schema các module

// SĐT Việt Nam: 10 số, bắt đầu bằng 0
export const PHONE_REGEX = /^0[0-9]{9}$/;

// CCCD: 12 chữ số
export const CCCD_REGEX = /^[0-9]{12}$/;

// Tên tòa: Chữ, số, khoảng trắng và dấu gạch ngang
export const BUILDING_NAME_REGEX = /^[a-zA-Z0-9\sÀ-ỹà-ỹ\-]+$/;

// Địa chỉ: Cho phép chữ, số, khoảng trắng và các dấu hợp lệ trong địa chỉ: , . / - ( ) #
export const ADDRESS_REGEX = /^[a-zA-Z0-9\sÀ-ỹà-ỹ,./\-()#]+$/;

// Mô tả: Cho phép mọi ký tự và xuống dòng, CHỈ CHẶN thẻ HTML < và >
export const SAFE_TEXT_REGEX = /^[^<>]*$/;

// Mật khẩu: tối thiểu 6 ký tự, có ít nhất 1 chữ cái và 1 chữ số (BR-005)
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

// Họ tên người (Manager, người đại diện, người ở cùng): chỉ chữ cái (kể cả có dấu tiếng Việt) và khoảng trắng
export const PERSON_NAME_REGEX = /^[\p{L}\p{M}\s]+$/u;
export const PERSON_NAME_MESSAGE = 'Họ tên chỉ được gồm chữ cái và khoảng trắng, không chứa số hoặc ký tự đặc biệt';

export const isPhone = (v) => PHONE_REGEX.test(v);
export const isCccd = (v) => CCCD_REGEX.test(v);
