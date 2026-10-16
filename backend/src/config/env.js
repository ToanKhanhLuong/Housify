// Đọc và kiểm tra biến môi trường, export object config
import 'dotenv/config';

// Hai biến bắt buộc: thiếu thì dừng server ngay, không chạy với cấu hình hỏng
const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}. Kiểm tra file .env`);
}

// Các biến còn lại có giá trị mặc định, thiếu vẫn chạy được
export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 8686,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  MONGO_URI: process.env.MONGO_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '1d',
  JWT_REMEMBER_EXPIRES: process.env.JWT_REMEMBER_EXPIRES || '7d',

  // Brevo: thiếu key thì sendMail in mail ra console thay vì gửi
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  MAIL_FROM: process.env.MAIL_FROM || '',

  // Cloudinary: thiếu thì chỉ API upload ảnh lỗi, phần khác vẫn chạy
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  SEPAY_API_KEY: process.env.SEPAY_API_KEY || '',
  BANK_ID: process.env.BANK_ID || '',
  BANK_ACCOUNT_NO: process.env.BANK_ACCOUNT_NO || '',
  BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME || '',

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',

  // Chỉ bật khi giá trị đúng bằng chuỗi 'true'
  ENABLE_DEV_ROUTES: process.env.ENABLE_DEV_ROUTES === 'true',
});