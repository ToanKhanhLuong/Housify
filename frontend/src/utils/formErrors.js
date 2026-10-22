// Lỗi 422 của backend có dạng [{ field, message }] → đổi thành { field: message } để gắn vào ô nhập
// Dùng: catch (err) { setErrors(toFieldErrors(err.errors)); if (!err.errors) toast.error(err.message); }
export const toFieldErrors = (errors) =>
    Array.isArray(errors) ? Object.fromEntries(errors.map(({ field, message }) => [field, message])) : {};