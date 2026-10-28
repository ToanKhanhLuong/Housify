// Tải 1 ảnh lên BE. Thường dùng qua component ImageUpload, ít khi gọi thẳng
import api from './axios';

const uploadApi = {
    // PUBLIC (ảnh tòa, phòng, sự cố): POST /uploads, cần đăng nhập → data: { url, publicId }
    // CCCD: POST /uploads/cccd, không cần đăng nhập (UC-06) → data: { publicId }
    // Tên field file phải là 'file' (khớp upload.single('file') bên BE)
    upload: (file, kind = 'PUBLIC') => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(kind === 'CCCD' ? '/uploads/cccd' : '/uploads', formData);
    },
};

export default uploadApi;