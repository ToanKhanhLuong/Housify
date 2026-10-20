import { Readable } from 'stream';
import cloudinary from '../../config/cloudinary.js';
import { AppError } from '../../utils/AppError.js';
import sharp from 'sharp';


// Ngưỡng độ nét tối thiểu (ảnh có variance dưới mức này được coi là mờ)
// Thông thường ngưỡng từ 70 - 100 là hợp lý cho ảnh chụp điện thoại
const BLUR_THRESHOLD = 80;
/**
 * Kiểm tra ảnh có bị mờ không dựa trên phương sai Laplace
 * @param {Buffer} buffer - Buffer file ảnh từ memoryStorage
 */


const validateImageQuality = async (buffer) => {
  // 1. Kiểm tra kích thước cơ bản (tránh trường hợp ảnh quá nhỏ, độ phân giải kém)
  const metadata = await sharp(buffer).metadata();
  if (metadata.width < 500 || metadata.height < 500) {
    throw new AppError('Độ phân giải ảnh quá thấp, vui lòng chụp ảnh rõ nét hơn', 400);
  }
  // 2. Chuyển sang grayscale và áp ma trận lọc cạnh Laplacian
  // Ma trận 3x3: [ [0, 1, 0], [1, -4, 1], [0, 1, 0] ]
  const laplacianKernel = {
    width: 3,
    height: 3,
    kernel: [
      0,  1,  0,
      1, -4,  1,
      0,  1,  0
    ]
  };
  const { data } = await sharp(buffer)
    .greyscale()
    .convolve(laplacianKernel)
    .raw()
    .toBuffer({ resolveWithObject: true });
  // 3. Tính Mean và Variance của các pixel sau khi lọc cạnh
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  const mean = sum / data.length;
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const diff = data[i] - mean;
    sumSquares += diff * diff;
  }
  const variance = sumSquares / data.length;
  // 4. Nếu variance < ngưỡng -> ảnh bị mờ
  if (variance < BLUR_THRESHOLD) {
    throw new AppError('Ảnh chụp bị mờ hoặc không đủ rõ nét, vui lòng chụp lại', 400);
  }
};

// Hàm hỗ trợ upload ảnh từ RAM lên Cloudinary
// Chuyển upload_stream thành Promise để sử dụng await
const uploadStreamToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(new AppError('Tải ảnh lên máy chủ thất bại', 500));
      resolve(result);
    });

    Readable.from(buffer).pipe(stream);
  });
};

// Upload ảnh công khai (tòa nhà, phòng, sự cố)
export const uploadPublic = async (file) => {
  if (!file) throw new AppError('Vui lòng chọn file ảnh', 400);
  const result = await uploadStreamToCloudinary(file.buffer, {
    folder: 'housify/general',
    resource_type: 'image',
    type: 'upload',
  });

  // Trả về URL và publicId của ảnh
  return { url: result.secure_url, publicId: result.public_id };
};

// Upload ảnh CCCD ở chế độ bảo mật
export const uploadCccd = async (file) => {
  if (!file) throw new AppError('Vui lòng chọn file ảnh CCCD', 400);
  // 1. Kiểm tra chất lượng ảnh trước (mờ thì ném lỗi dừng lại luôn)
  await validateImageQuality(file.buffer);
  // 2. Ảnh nét rồi mới đẩy lên Cloudinary
  const result = await uploadStreamToCloudinary(file.buffer, {
    folder: 'housify/cccd',
    resource_type: 'image',
    type: 'authenticated',
  });

  return { publicId: result.public_id };
};

// Tạo đường dẫn có chữ ký để xem ảnh CCCD
export const getSignedUrl = (publicId, expiresInSeconds = 600) => {
  if (!publicId) throw new AppError('Thiếu publicId của ảnh', 400);
  // Tính thời điểm hết hạn dự kiến (mặc định 600 giây)
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  // Tạo URL có chữ ký cho ảnh authenticated
  const url = cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    expires_at: expiresAt,
    secure: true,
  });

  return { url, expiresAt };
};