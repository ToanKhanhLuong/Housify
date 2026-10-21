// Đổi lỗi API thành lỗi từng ô của form
// Lỗi từ api/axios.js có dạng { status, message, errors }. Lỗi validate (422) và lỗi trùng (409) có
// errors = [{ field, message }] → trả về { field: message } để hiện dưới đúng ô
export const toFieldErrors = (err) => {
  if (!Array.isArray(err?.errors)) return {};
  return err.errors.reduce((acc, { field, message }) => {
    if (field && !acc[field]) acc[field] = message;
    return acc;
  }, {});
};

// Form có lỗi từng ô thì hiện dưới ô, không có thì toast message
export const hasFieldErrors = (err) => Object.keys(toFieldErrors(err)).length > 0;
