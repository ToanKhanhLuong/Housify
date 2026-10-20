import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/requireRole.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import { ROLE } from "../../constants/enums.js";

import {uploadPublicFile, uploadCccdFile, getSignedImageUrl} from "./upload.controller.js";

const router = Router();

// Upload ảnh chung (tòa nhà, phòng, sự cố)
router.post( "/uploads", auth, upload.single("file"), uploadPublicFile);

// Upload ảnh CCCD
router.post("/uploads/cccd", upload.single("file"), uploadCccdFile);

// Lấy link xem ảnh CCCD
router.get("/uploads/signed-url", auth, requireRole(ROLE.ADMIN, ROLE.MANAGER),getSignedImageUrl);

export default router;