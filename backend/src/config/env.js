// Đọc và kiểm tra biến môi trường, export object config
import 'dotenv/config';

// Hai biến bắt buộc: thiếu thì dừng server ngay, không chạy với cấu hình hỏng
const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}. Kiểm tra file .env`);
}

// Các biến còn lại có giá trị mặc định, khớp với .env.example
export const env = Object.freeze({
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: Number(process.env.PORT) || 5000,

    MONGO_URI: process.env.MONGO_URI,

    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES: process.env.JWT_EXPIRES || '1d',
    JWT_REMEMBER_EXPIRES: process.env.JWT_REMEMBER_EXPIRES || '7d',

    MAIL_USER: process.env.MAIL_USER || '',
    MAIL_PASS: process.env.MAIL_PASS || '',

    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

    BANK_ID: process.env.BANK_ID || '',
    BANK_ACCOUNT_NO: process.env.BANK_ACCOUNT_NO || '',
    BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME || '',

    SEPAY_API_KEY: process.env.SEPAY_API_KEY || '',

    ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
});