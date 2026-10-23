import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import { uploadPublicFile, uploadCccdFile } from "./upload.controller.js";
const router = Router();
// Upload ảnh chung (tòa nhà, phòng, sự cố) – cần đăng nhập
router.post("/uploads", auth, upload.single("file"), uploadPublicFile);
// Upload ảnh CCCD – không cần đăng nhập vì khách kích hoạt tài khoản (UC-06) chưa có tài khoản
// Chỉ trả publicId. Không có route lấy link xem ảnh: API hồ sơ tự kiểm quyền rồi trả link (xem getSignedUrl trong service)
router.post("/uploads/cccd", upload.single("file"), uploadCccdFile);
export default router;