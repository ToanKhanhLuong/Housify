// Định tuyến API tải ảnh chung và ảnh CCCD lên Cloudinary (UC-05, UC-06, UC-16, UC-42)
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';
import { createRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import { uploadPublicFile, uploadCccdFile } from './upload.controller.js';

const router = Router();

const cccdUploadLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Bạn đã tải ảnh CCCD quá nhiều lần, vui lòng thử lại sau 15 phút',
});

// Upload ảnh chung (tòa nhà, phòng, sự cố) – cần đăng nhập
router.post('/uploads', auth, upload.single('file'), uploadPublicFile);

// Upload ảnh CCCD – không cần đăng nhập vì khách kích hoạt tài khoản (UC-06) chưa có tài khoản; giới hạn 30 lần / 15 phút / IP
// Chỉ trả publicId. Không có route lấy link xem ảnh: API hồ sơ tự kiểm quyền rồi trả link (xem getSignedUrl trong service)
router.post('/uploads/cccd', cccdUploadLimiter, upload.single('file'), uploadCccdFile);

export default router;
