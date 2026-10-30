// Helper đọc và chuẩn hóa tham số bộ lọc query dùng chung giữa các module
import Joi from 'joi';

// Thoát ký tự đặc biệt của regex trước khi đưa vào RegExp (q tìm kiếm gần đúng)
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Schema cho danh sách enum cách nhau bằng dấu phẩy, ví dụ: status=AVAILABLE,MAINTENANCE
export const commaSeparatedEnum = (validValues, message = 'Giá trị lọc không hợp lệ') =>
  Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) return undefined;
      const items = value.split(',').map((v) => v.trim()).filter(Boolean);
      if (items.length === 0) return undefined;
      for (const item of items) {
        if (!validValues.includes(item)) {
          return helpers.message(message);
        }
      }
      return items;
    });

// Schema cho danh sách số nguyên cách nhau bằng dấu phẩy, ví dụ: floor=1,2,3
export const commaSeparatedIntegers = ({ min, max, message = 'Giá trị lọc không hợp lệ' } = {}) =>
  Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) return undefined;
      const items = value.split(',').map((v) => v.trim()).filter(Boolean);
      if (items.length === 0) return undefined;
      const numbers = [];
      for (const item of items) {
        const num = Number(item);
        if (!Number.isInteger(num)) {
          return helpers.message(message);
        }
        if (min !== undefined && num < min) {
          return helpers.message(message);
        }
        if (max !== undefined && num > max) {
          return helpers.message(message);
        }
        numbers.push(num);
      }
      return numbers;
    });

// Schema cho danh sách ObjectId cách nhau bằng dấu phẩy
export const commaSeparatedObjectIds = (message = 'Giá trị lọc không hợp lệ') =>
  Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) return undefined;
      const items = value.split(',').map((v) => v.trim()).filter(Boolean);
      if (items.length === 0) return undefined;
      for (const item of items) {
        if (!OBJECT_ID_REGEX.test(item)) {
          return helpers.message(message);
        }
      }
      return items;
    });

// Schema cho boolean gửi dạng chữ "true" / "false", tự động chuyển về boolean
export const booleanString = (message = 'Giá trị lọc không hợp lệ') =>
  Joi.any()
    .custom((value, helpers) => {
      if (value === undefined || value === null || value === '') return undefined;
      const str = String(value).trim();
      if (str === 'true') return true;
      if (str === 'false') return false;
      return helpers.message(message);
    });
