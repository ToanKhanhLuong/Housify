# Upload Module – Cloudinary

## 1. Mô tả

Module Upload chịu trách nhiệm tải ảnh lên Cloudinary và trả về URL hoặc `publicId` để các module khác sử dụng.

Module không trực tiếp lưu dữ liệu vào MongoDB.

## 2. Chức năng

- **Upload ảnh thường:** Sử dụng cho tòa nhà, phòng và sự cố.
- **Upload ảnh CCCD:** Sử dụng cho hồ sơ Manager và Occupant, lưu ảnh ở chế độ `authenticated`.
- **Lấy URL xem CCCD:** Tạo đường dẫn có chữ ký để truy cập ảnh CCCD.

## 3. Cấu trúc module

```text
upload/
├── upload.routes.js
├── upload.controller.js
├── upload.service.js
└── README.md
```

- `upload.routes.js`: Khai báo các API và middleware.
- `upload.controller.js`: Nhận request, gọi service và trả response.
- `upload.service.js`: Xử lý upload ảnh lên Cloudinary.

## 4. API

| Method | Endpoint                  | Chức năng              |
| ------ | ------------------------- | ---------------------- |
| POST   | `/api/uploads`            | Upload ảnh thường      |
| POST   | `/api/uploads/cccd`       | Upload ảnh CCCD        |
| GET    | `/api/uploads/signed-url` | Lấy đường dẫn xem CCCD |

Hai API upload sử dụng `multipart/form-data`, với tên trường file là `file`.

## 5. Lưu trữ trên Cloudinary

| Loại ảnh   | Folder            | Chế độ          |
| ---------- | ----------------- | --------------- |
| Ảnh thường | `housify/general` | `upload`        |
| Ảnh CCCD   | `housify/cccd`    | `authenticated` |

**Ảnh thường:** Trả về `url` và `publicId`.

**Ảnh CCCD:** Chỉ trả về `publicId`, không trả URL công khai.

Để lưu cả hai mặt CCCD, frontend gọi API upload CCCD hai lần, lần lượt cho mặt trước và mặt sau.

## 6. Lưu dữ liệu vào MongoDB

Các module sử dụng kết quả upload để lưu vào model tương ứng:

- `Building.images`: Lưu danh sách URL ảnh.
- `Manager.cccdFrontImage`, `Manager.cccdBackImage`: Lưu `publicId`.
- `Occupant.cccdFrontImage`, `Occupant.cccdBackImage`: Lưu `publicId`.

## 7. Cấu hình môi trường

Cần khai báo trong file `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Không commit file `.env` chứa thông tin bí mật lên GitHub.

## 8. Lưu ý

- Giới hạn dung lượng ảnh hiện tại: 5 MB/file.
- API Upload sử dụng middleware xác thực theo cấu hình của dự án.
- URL xem CCCD cần được kiểm tra và hoàn thiện cơ chế hết hạn thực tế.
- Chưa triển khai kiểm tra độ mờ của ảnh CCCD.
- Chưa triển khai cơ chế tự động xóa ảnh không còn sử dụng trên Cloudinary.
