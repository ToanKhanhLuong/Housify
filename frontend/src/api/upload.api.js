// Tải ảnh lên Cloudinary qua backend (POST /uploads). Component ImageUpload gọi hàm này
// kind = 'PUBLIC': ảnh công khai (tòa, phòng, sự cố) → trả { url }
// kind = 'CCCD'  : ảnh bảo vệ → trả { publicId }, chỉ người có quyền mới xem được
import api from './axios';

const uploadApi = {
    upload: (file, kind = 'PUBLIC') => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('kind', kind);
        return api.post('/uploads', formData);
    },
};

export default uploadApi;