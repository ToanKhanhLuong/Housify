// API upload ảnh lên Cloudinary qua backend. Ảnh công khai → { url, publicId }, ảnh CCCD → { publicId }
import api from './axios.js';

const toFormData = (file) => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

export const uploadApi = {
  // Ảnh tòa nhà, phòng, sự cố
  uploadPublic: (file) => api.post('/uploads', toFormData(file)),

  // Ảnh CCCD (bảo vệ) – chỉ trả publicId, không có đường dẫn công khai
  uploadCccd: (file) => api.post('/uploads/cccd', toFormData(file)),

  // Link xem ảnh CCCD có thời hạn → { url, expiresAt }
  getSignedUrl: (publicId) => api.get('/uploads/signed-url', { params: { publicId } }),
};

export default uploadApi;
