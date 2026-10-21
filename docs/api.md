# Danh sách API

BE chốt lại ở đầu mỗi iteration, FE code theo file này (kể cả khi dùng mock).
Sửa endpoint thì sửa ở đây trước, báo nhóm. Field gửi lên / trả về đặt tên đúng như `docs/database.md`.

## Quy ước

- Prefix: `/api`
- Xác thực: header `Authorization: Bearer <token>`
- Thành công: `{ success: true, data, message }` · Lỗi: `{ success: false, message, errors }`
- Phân trang: `?page=1&limit=10` → `data: { items, total, page, limit }`
- Role viết tắt: **A** Admin · **M** Manager · **C** Customer · **—** không cần đăng nhập
- Manager chỉ thao tác trên tòa mình phụ trách, Customer chỉ trên hợp đồng của mình – BE kiểm ở service, không tin FE.
- Các field tiền (`totalAmount`, `amount`, `unitPrice`), trạng thái, `dueDate`, mã (`invoiceCode`, `incidentCode`) do **server tự đặt**, không nhận từ client.

## Tài khoản – `auth` (UC-01..05)

| Method    | Path                      | Role  | Ghi chú                                                                                                                          |
| --------- | ------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| POST      | `/auth/login`           | —    | `{ identifier, password, remember }` – identifier là email (Admin/Manager) hoặc CCCD (Customer)                              |
| GET       | `/auth/me`              | A M C |                                                                                                                                   |
| PUT       | `/auth/change-password` | A M C | `{ currentPassword, newPassword }`                                                                                              |
| POST      | `/auth/forgot-password` | —    | `{ email }` – luôn trả cùng một câu (BR-008)                                                                              |
| POST      | `/auth/verify-otp`      | —    | `{ email, otp }` → `{ resetToken }`                                                                                          |
| POST      | `/auth/reset-password`  | —    | `{ resetToken, newPassword }`                                                                                                   |
| GET / PUT | `/profile`              | M     | Hồ sơ Manager. Chỉ điền lần đầu các trường đang trống (BR-011). Customer sửa hồ sơ qua `/occupants/:id` (UC-31) |

## Kích hoạt – `activation` (UC-06, 08)

Link trong email (BE ghép link, FE khai báo route khớp theo):

| Email                                               | Link BE gửi                                | Route FE                      |
| --------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| Kích hoạt Manager (UC-08, gửi lại ở UC-09)     | `${CLIENT_URL}/activate/manager/<token>`  | `/activate/manager/:token`  |
| Mời ký hợp đồng (UC-24, gửi lại ở UC-24 A2) | `${CLIENT_URL}/activate/contract/<token>` | `/activate/contract/:token` |

- Trang công khai, không cần đăng nhập. FE lấy token bằng `useParams()` rồi gửi kèm khi gọi API bên dưới.
- Link hết hạn, đã dùng hoặc không tồn tại → API trả lỗi, FE hiện "Link đã hết hạn" / "Link không tồn tại" (UC-08 E06, UC-06 E01, UC-46 E02).

| Method | Path                            | Role | Ghi chú                                                                                                                                   |
| ------ | ------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/activation/manager/:token`  | —   | Kiểm link còn hiệu lực                                                                                                                 |
| POST   | `/activation/manager`         | —   | `{ token, password }`                                                                                                                    |
| GET    | `/activation/contract/:token` | —   | Thông tin hợp đồng chỉ xem                                                                                                            |
| POST   | `/activation/contract`        | —   | **multipart/form-data**: `token, name, phone, dateOfBirth, address, password, agreed` + file `cccdFrontImage`, `cccdBackImage` |

## Manager – `manager` (UC-08..11)

| Method             | Path                                  | Role | Ghi chú                                          |
| ------------------ | ------------------------------------- | ---- | ------------------------------------------------- |
| POST               | `/managers`                         | A    | `{ name, email, phone }`                        |
| GET                | `/managers`                         | A    | `?status=&q=`                                   |
| GET / PUT / DELETE | `/managers/:id`                     | A    | Sửa: chỉ đã kích hoạt · Xóa: chỉ PENDING |
| POST               | `/managers/:id/resend-activation`   | A    |                                                   |
| PATCH              | `/managers/:id/lock` · `/unlock` | A    | lock cần `{ reason }`                          |
| PUT                | `/buildings/:id/manager`            | A    | `{ managerId }` hoặc `null` để gỡ         |

## Tòa nhà – `building` (UC-12..15, 23)

| Method             | Path                           | Role           | Ghi chú                                   |
| ------------------ | ------------------------------ | -------------- | ------------------------------------------ |
| GET                | `/buildings`                 | A M            | Manager chỉ thấy tòa mình              |
| POST               | `/buildings`                 | A              | `{ name, address, description, images }` |
| GET / PUT / DELETE | `/buildings/:id`             | A (GET: A M)   |                                            |
| GET                | `/buildings/:id/floors`      | A M            | Tầng 1..n + số phòng theo trạng thái  |
| PATCH              | `/buildings/:id/floor-count` | A              | `{ floorCount }`                         |
| GET / PUT          | `/buildings/:id/rules`       | A (GET: A M C) | `{ rules }`                              |

## Phòng, loại phòng – `room`, `roomType` (UC-16..20)

| Method             | Path                             | Role         | Ghi chú                                                                          |
| ------------------ | -------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| GET / POST         | `/buildings/:buildingId/rooms` | A (GET: A M) | `?floor=&status=&roomTypeId=`                                                   |
| GET / PUT / DELETE | `/rooms/:id`                   | A (GET: A M) | PUT không sửa `roomNumber`; `status` chỉ chọn AVAILABLE hoặc MAINTENANCE |
| GET                | `/room-types`                  | A M          |                                                                                   |
| POST               | `/room-types`                  | A            |                                                                                   |
| PUT / DELETE       | `/room-types/:id`              | A            |                                                                                   |

## Dịch vụ – `service` (UC-21, 22)

| Method       | Path                              | Role | Ghi chú                                                                                  |
| ------------ | --------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| GET / POST   | `/services`                     | A    | `{ name, unit, isFixed }`                                                               |
| PUT / DELETE | `/services/:id`                 | A    |                                                                                           |
| GET / POST   | `/buildings/:id/service-prices` | A    | `{ serviceId, unitPrice, effectiveFrom }` – trùng ngày hiệu lực thì sửa bản cũ |

## Upload – `upload`

| Method | Path         | Role  | Ghi chú                                   |
| ------ | ------------ | ----- | ------------------------------------------ |
| POST   | `/uploads` | A M C | multipart, chỉ ảnh ≤ 5MB → `{ url }` |

## Thông báo – `notification`, `announcement` (UC-40, 41)

| Method | Path                                                       | Role  | Ghi chú                                          |
| ------ | ---------------------------------------------------------- | ----- | ------------------------------------------------- |
| GET    | `/notifications`                                         | A M C | `?unread=true`                                  |
| GET    | `/notifications/unread-count`                            | A M C |                                                   |
| PATCH  | `/notifications/:id/read` · `/notifications/read-all` | A M C |                                                   |
| POST   | `/announcements`                                         | M     | `{ title, message, target: 'ALL' \| roomIds[] }` |

## Hợp đồng – `contract` (UC-24..27, 45, 46)

| Method    | Path                              | Role         | Ghi chú                                                                                                                                                                     |
| --------- | --------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST      | `/contracts`                    | M            | `{ roomId, startDate, durationMonths, representativeCccd, representativeEmail, contractType, coOccupants[] }` – `coOccupants[]`: `{ name, cccd, phone, dateOfBirth }` |
| GET       | `/contracts`                    | M C          | `?status=&roomId=`                                                                                                                                                         |
| GET / PUT | `/contracts/:id`                | M (GET: M C) | Sau ACTIVE khóa giá, cọc, CCCD đại diện, ngày bắt đầu (BR-067)                                                                                                     |
| POST      | `/contracts/:id/resend-invite`  | M            |                                                                                                                                                                              |
| POST      | `/contracts/:id/renew`          | M            | `{ months }`                                                                                                                                                               |
| POST      | `/contracts/:id/cancel`         | M            | `{ reason? }` – lý do tùy chọn, chỉ DRAFT                                                                                                                             |
| GET       | `/contracts/:id/refund-preview` | M            | Tiền cọc + hóa đơn chưa thanh toán                                                                                                                                    |
| POST      | `/contracts/:id/refund-deposit` | M            |                                                                                                                                                                              |

## Chấm dứt – `termination` (UC-28, 29)

| Method | Path                                         | Role  | Ghi chú                                  |
| ------ | -------------------------------------------- | ----- | ----------------------------------------- |
| POST   | `/contracts/:id/terminations`              | M     | `{ type, reason, effectiveDate, note }` |
| GET    | `/terminations`                            | A M C | `?status=&type=`                        |
| GET    | `/terminations/:id`                        | A M C | kèm `signatureValid`                   |
| POST   | `/terminations/:id/confirm`                | C     | `{ agreed: true }`                      |
| POST   | `/terminations/:id/approve` · `/reject` | A     | reject cần `{ reason }`                |
| POST   | `/terminations/:id/cancel`                 | M     | `{ reason }`                            |

## Cư dân – `occupant` (UC-30..33)

| Method    | Path                         | Role | Ghi chú                                                                                                 |
| --------- | ---------------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| GET       | `/occupants`               | M    | `?roomId=&status=`                                                                                     |
| GET / PUT | `/occupants/:id`           | M C  | Đại diện sửa được hồ sơ mình (kèm `email`, lưu ở users) và người ở cùng phòng mình |
| GET       | `/me/room-members`         | C    |                                                                                                          |
| POST      | `/contracts/:id/occupants` | M    | Thêm người ở cùng: `{ name, cccd, phone, dateOfBirth, joinDate, relationship }`                   |
| PATCH     | `/occupants/:id/leave`     | M    | `{ exitDate, note }`                                                                                   |

## Hóa đơn – `invoice` (UC-34..37)

| Method    | Path                     | Role         | Ghi chú                                                                                                                                                                                            |
| --------- | ------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET       | `/invoices/prefill`    | M            | `?contractId=&month=` → `items[]` gợi ý: tiền phòng, điện nước kèm chỉ số cũ, phí cố định                                                                                      |
| POST      | `/invoices`            | M            | `{ contractId, month, items[] }` – `items[]` lấy từ prefill, điền thêm `newReading`, sửa `quantity` phí cố định, thêm dòng EXTRA `{ type: 'EXTRA', description, unitPrice }` |
| POST      | `/invoices/bulk`       | M            | `{ contractIds[], month }` – tạo DRAFT hàng loạt, chỉ số điện nước nhập sau (UC-34 A1)                                                                                                 |
| GET       | `/invoices`            | M C          | `?status=&month=&roomId=`                                                                                                                                                                         |
| GET / PUT | `/invoices/:id`        | M (GET: M C) | PUT chỉ khi DRAFT, body như POST                                                                                                                                                                  |
| POST      | `/invoices/:id/send`   | M            | Sinh QR, đặt `dueDate` = lúc gửi + 7 ngày                                                                                                                                                    |
| POST      | `/invoices/:id/cancel` | M            | `{ reason }`                                                                                                                                                                                      |

## Thanh toán – `payment` (UC-38, 39, 42)

| Method | Path                | Role | Ghi chú                                 |
| ------ | ------------------- | ---- | ---------------------------------------- |
| POST   | `/webhooks/sepay` | —   | xác thực bằng API key (`sepayAuth`) |
| GET    | `/payments`       | M C  | `?from=&to=`                           |

## Sự cố – `incident` (UC-43, 44)

| Method | Path                                                     | Role | Ghi chú                                 |
| ------ | -------------------------------------------------------- | ---- | ---------------------------------------- |
| POST   | `/incidents`                                           | C    | `{ type, title, description, images }` |
| GET    | `/incidents`                                           | M C  | `?status=&type=&roomId=`               |
| GET    | `/incidents/:id`                                       | M C  |                                          |
| PATCH  | `/incidents/:id/accept` · `/resolve` · `/reject` | M    | resolve / reject cần `{ resultNote }` |

## Dashboard – `dashboard` (UC-07, 47, 48)

| Method | Path                   | Role | Ghi chú                   |
| ------ | ---------------------- | ---- | -------------------------- |
| GET    | `/dashboard/admin`   | A    | `?buildingId=`           |
| GET    | `/dashboard/manager` | M    |                            |
| GET    | `/reports`           | A M  | `?from=&to=&buildingId=` |

## OCR – `ocr` (làm nếu kịp)

| Method | Path          | Role | Ghi chú             |
| ------ | ------------- | ---- | -------------------- |
| POST   | `/ocr/cccd` | M C  | ảnh → `{ cccd }` |

## Dev – chỉ khi dev / demo (`devOnly`)

| Method | Path                    | Role | Ghi chú                                      |
| ------ | ----------------------- | ---- | --------------------------------------------- |
| POST   | `/dev/jobs/:name/run` | A    | chạy job ngay, không phải đợi            |
| POST   | `/dev/sepay-simulate` | A    | `{ invoiceCode, amount }` giả lập webhook |

> Quy ước: mọi id trong response là `_id`. Lỗi 401 chỉ dùng khi phiên không hợp lệ (FE tự đăng xuất).

### POST /api/auth/login — UC-01 (không cần token)

Request:
{ "identifier": "admin@housify.vn", "password": "Admin123", "remember": true }

- identifier: email (Admin/Manager) hoặc đúng 12 số CCCD (Customer)
- remember: true → token 7 ngày; false hoặc không gửi → 1 ngày
  Response 200:
  { "success": true, "message": "...", "data": { "token": "eyJ...", "user": <giống GET /auth/me> } }
  Lỗi:
- 401 Tài khoản hoặc mật khẩu không đúng
- 403 Manager chưa kích hoạt / tài khoản bị khóa / đã ngưng hoạt động
- 422 Thiếu hoặc sai định dạng

### GET /api/auth/me — cần token, mọi role

Response 200:
{ "success": true, "data": {
  "_id": "...", "email": "...", "role": 0 | 1 | 2, "status": "ACTIVE", "name": "...",
  "phone": "...",                                   // Manager, Customer
  "building": { "_id", "name", "address" } | null,  // chỉ Manager; null = chưa được phân công (BR-023)
  "cccd": "..."                                     // chỉ Customer
} }
Lỗi: 401 token sai, hết hạn, hoặc tài khoản vừa bị khóa → FE tự đăng xuất
