import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import {MSG} from '../../constants/messages.js'
import * as uploadService from './upload.service.js';

// Upload ảnh công khai (tòa nhà, phòng, sự cố)
export const uploadPublicFile = asyncHandler(async (req, res) => {
  const data = await uploadService.uploadPublic(req.file);
  return ok(res, data, MSG.FILE_UPLOAD_SUCCESS);
});

// Upload ảnh CCCD ở chế độ bảo mật
export const uploadCccdFile = asyncHandler(async (req, res) => {
  const data = await uploadService.uploadCccd(req.file);
  return ok(res, data, MSG.FILE_UPLOAD_SUCCESS);
});

// Tạo đường dẫn xem ảnh CCCD có thời hạn
export const getSignedImageUrl = asyncHandler(async (req, res) => {
  // Lấy publicId và thời gian hết hạn từ query
  const { publicId, expiresIn } = req.query;
  // Gọi service tạo đường dẫn xem ảnh
  const data = uploadService.getSignedUrl(publicId, expiresIn ? Number(expiresIn) : undefined
  );
  return ok(res, data, MSG.SIGNED_URL_SUCCESS);
});