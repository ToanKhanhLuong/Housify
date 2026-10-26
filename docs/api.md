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
- Việc chính xong nhưng việc phụ lỗi (vd gửi mail thất bại): vẫn trả thành công, kèm `data.warning` là câu tiếng Việt.
- Cần người dùng xác nhận thêm: trả 409, `message` là câu hỏi. Chỉ áp dụng ở API có ghi cờ xác nhận bên dưới (vd `confirmReplace`); FE gửi lại kèm cờ đó = true. 409 ở chỗ khác là trùng dữ liệ
- Prefix: `/api`
- Xác thực: header `Authorization: Bearer <token>`
- Thành công: `{ success: true, data, message }` · Lỗi: `{ success: false, message, errors }`
- Phân trang: `?page=1&limit=10` → `data: { items, total, page, limit }`
- Role viết tắt: **A** Admin · **M** Manager · **C** Customer · **—** không cần đăng nhập
- Manager chỉ thao tác trên tòa mình phụ trách, Customer chỉ trên hợp đồng của mình – BE kiểm ở service, không tin FE.
- Các field tiền (`totalAmount`, `amount`, `unitPrice`), trạng thái, `dueDate`, mã (`invoiceCode`, `incidentCode`) do **server tự đặt**, không nhận từ client.

## Tài khoản – `auth` (UC-01..05)

| Method    | Path                      | Role  | Ghi chú                                                                                                                                                                                                                                                                                               |
| --------- | ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST      | `/auth/login`           | —    | `{ identifier, password, remember }` – identifier là email (Admin/Manager) hoặc CCCD (Customer)                                                                                                                                                                                                   |
| GET       | `/auth/me`              | A M C |                                                                                                                                                                                                                                                                                                        |
| PUT       | `/auth/change-password` | A M C | `{ currentPassword, newPassword, confirmPassword }` – `confirmPassword` phải khớp `newPassword`. Lỗi: 400 "Mật khẩu hiện tại không đúng"; 400 "Mật khẩu mới không được trùng mật khẩu hiện tại"; 422 "Xác nhận mật khẩu không khớp"; 422 sai định dạng           |
| POST      | `/auth/forgot-password` | —    | `{ email }` – luôn trả cùng một câu (BR-008)                                                                                                                                                                                                                                                   |
| POST      | `/auth/verify-otp`      | —    | `{ email, otp }` → `{ resetToken }`                                                                                                                                                                                                                                                               |
| POST      | `/auth/reset-password`  | —    | `{ resetToken, newPassword }`                                                                                                                                                                                                                                                                        |
| GET / PUT | `/profile`              | M     | Hồ sơ Manager. Chỉ điền lần đầu các trường đang trống (BR-011). GET trả kèm `cccdFrontUrl`, `cccdBackUrl` (xem mục Upload). PUT gửi ảnh là publicId `cccdFrontImage`, `cccdBackImage` lấy từ `POST /uploads/cccd`. Customer sửa hồ sơ qua `/occupants/:id` (UC-31) |

## Kích hoạt – `activation` (UC-06, 08)

Link trong email (BE ghép link, FE khai báo route khớp theo):

| Email                                               | Link BE gửi                                | Route FE                      |
| --------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| Kích hoạt Manager (UC-08, gửi lại ở UC-09)     | `${CLIENT_URL}/activate/manager/<token>`  | `/activate/manager/:token`  |
| Mời ký hợp đồng (UC-24, gửi lại ở UC-24 A2) | `${CLIENT_URL}/activate/contract/<token>` | `/activate/contract/:token` |

- Trang công khai, không cần đăng nhập. FE lấy token bằng `useParams()` rồi gửi kèm khi gọi API bên dưới.
- Link hết hạn, đã dùng hoặc không tồn tại → API trả lỗi, FE hiện "Link đã hết hạn" / "Link không tồn tại" (UC-08 E06, UC-06 E01, UC-46 E02).

| Method | Path                            | Role | Ghi chú                                                                                                                                                             |
| ------ | ------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/activation/manager/:token`  | —   | Kiểm link còn hiệu lực                                                                                                                                           |
| POST   | `/activation/manager`         | —   | `{ token, password }`                                                                                                                                              |
| GET    | `/activation/contract/:token` | —   | Thông tin hợp đồng chỉ xem                                                                                                                                      |
| POST   | `/activation/contract`        | —   | `{ token, name, phone, dateOfBirth, address, password, agreed, cccdFrontImage, cccdBackImage }` – 2 ảnh là publicId, FE tải trước qua `POST /uploads/cccd` |

## Manager – `manager` (UC-08..11)

| Method             | Path                                  | Role | Ghi chú                                                                                                                                                                    |
| ------------------ | ------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST               | `/managers`                         | A    | `{ name, email, phone }`                                                                                                                                                  |
| GET                | `/managers`                         | A    | `?status=&q=`                                                                                                                                                             |
| GET / PUT / DELETE | `/managers/:id`                     | A    | Sửa: chỉ đã kích hoạt · Xóa: chỉ PENDING. GET trả kèm `cccdFrontUrl`, `cccdBackUrl`; PUT gửi ảnh là publicId                                              |
| POST               | `/managers/:id/resend-activation`   | A    |                                                                                                                                                                             |
| PATCH              | `/managers/:id/lock` · `/unlock` | A    | lock cần `{ reason }`                                                                                                                                                    |
| PUT                | `/buildings/:id/manager`            | A    | `{ managerId, confirmReplace? }` hoặc `managerId: null` để gỡ. Tòa đã có Manager mà chưa gửi `confirmReplace: true` → 409 hỏi xác nhận thay (UC-11 A1) |

- `:id` ở `/managers/:id` và `managerId` ở `/buildings/:id/manager` đều là `_id` của **users** (không phải của managers).

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

| Method | Path              | Role  | Ghi chú                                                                                                                                                                                 |
| ------ | ----------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/uploads`      | A M C | Ảnh công khai (tòa, phòng, sự cố). multipart, field `file`, 1 ảnh ≤ 5MB → `{ url, publicId }`. DB lưu `url`                                                              |
| POST   | `/uploads/cccd` | —    | Ảnh CCCD. multipart, field `file`, 1 ảnh ≤ 5MB, tối thiểu 500×500, không mờ → `{ publicId }`. Không cần đăng nhập vì khách kích hoạt (UC-06) chưa có tài khoản |

- Mỗi lần gửi 1 ảnh. CCCD 2 mặt thì gọi 2 lần.
- Ảnh CCCD là ảnh bảo vệ: DB chỉ lưu publicId (`cccdFrontImage`, `cccdBackImage`). **Không có API lấy link xem ảnh riêng.** API chi tiết hồ sơ (`GET /profile`, `GET /managers/:id`, `GET /occupants/:id`) tự kiểm quyền rồi trả kèm `cccdFrontUrl`, `cccdBackUrl` (tính ra, không lưu DB; `null` nếu chưa có ảnh). API danh sách không trả link ảnh.
- Ai được xem ảnh CCCD (theo `docs/database.md`): ảnh Manager → chính Manager đó và Admin; ảnh cư dân → người đại diện phòng và Manager của tòa.
- FE xem trước ảnh vừa chọn bằng file trên máy, không cần link từ BE.
- Lỗi 400: không gửi file "Vui lòng chọn file ảnh" / "Vui lòng chọn file ảnh CCCD" · không phải ảnh "Chỉ chấp nhận file ảnh" · quá 5MB "Ảnh vượt quá 5MB" · ảnh CCCD nhỏ "Độ phân giải ảnh quá thấp, vui lòng chụp ảnh rõ nét hơn" · ảnh CCCD mờ "Ảnh chụp bị mờ hoặc không đủ rõ nét, vui lòng chụp lại" (UC-05 E04, UC-06 E04).

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

| Method    | Path                         | Role | Ghi chú                                                                                                                                                                                                                                                             |
| --------- | ---------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET       | `/occupants`               | M    | `?roomId=&status=`                                                                                                                                                                                                                                                 |
| GET / PUT | `/occupants/:id`           | M C  | Đại diện sửa được hồ sơ mình (kèm `email`, lưu ở users) và người ở cùng phòng mình. GET trả kèm `cccdFrontUrl`, `cccdBackUrl` (chỉ Manager của tòa và người đại diện phòng gọi được API này); ảnh gửi lên là publicId |
| GET       | `/me/room-members`         | C    |                                                                                                                                                                                                                                                                      |
| POST      | `/contracts/:id/occupants` | M    | Thêm người ở cùng: `{ name, cccd, phone, dateOfBirth, joinDate, relationship }`                                                                                                                                                                               |
| PATCH     | `/occupants/:id/leave`     | M    | `{ exitDate, note }`                                                                                                                                                                                                                                               |

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
- 403 `Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để đặt mật khẩu và kích hoạt tài khoản` – Manager PENDING hoặc chưa có mật khẩu (kiểm trước khi so mật khẩu)
- 403 `Tài khoản đã bị khóa` – LOCKED (sau khi đúng mật khẩu)
- 403 `Tài khoản đã ngưng hoạt động. Vui lòng kiểm tra email kích hoạt nếu bạn vừa có hợp đồng mới` – INACTIVE (sau khi đúng mật khẩu)
- 403 `Tài khoản không ở trạng thái hoạt động` – trạng thái khác ACTIVE (sau khi đúng mật khẩu)
- 422 Thiếu hoặc sai định dạng
- 401 `Tài khoản hoặc mật khẩu không đúng` – không tìm thấy tài khoản, sai mật khẩu, hoặc Customer nhập email thay vì CCCD (bị chặn theo BR-001, báo cùng một câu)

### GET /api/auth/me — cần token, mọi role

Response 200:
{ "success": true, "data": {
  "_id": "...", "email": "...", "role": 0 | 1 | 2, "status": "ACTIVE", "name": "...",
  "phone": "...",                                   // Manager, Customer
  "building": { "_id", "name", "address" } | null,  // mọi role đều có; Admin, Customer luôn null; Manager chưa được phân công cũng null (BR-023)
  "cccd": "..."                                     // chỉ Customer
} }
Lỗi: 401 token sai, hết hạn, hoặc tài khoản vừa bị khóa → FE tự đăng xuất

## Helper dùng chung (BE gọi trong service)

Tạo chuông và ghi nhật ký **chỉ qua 2 helper này**, không tự insert vào `notifications` / `audit_logs`. Đang trong `withTransaction` thì truyền `session` làm tham số thứ 2.

### notify – tạo thông báo chuông (không gửi mail; cần mail thì tự gọi `sendMail` sau khi lưu xong)

```js
import { notify } from '../../helpers/notify.js';
import { NOTIFICATION_TYPE } from '../../constants/enums.js';

await notify({
    userIds: building.managerId,          // 1 id hoặc mảng id người nhận
    type: NOTIFICATION_TYPE.ANNOUNCEMENT, // xem bảng NOTIFICATION_TYPE trong housify-database.md
    title: 'Nội quy mới',
    message: `Tòa ${building.name} vừa cập nhật nội quy`,
    refId: building._id,                  // id bản ghi liên quan để FE mở đúng trang; không có thì bỏ
    createdBy: request.user.id,           // hệ thống tự tạo thì bỏ
}, session);
```

### audit – ghi nhật ký thao tác

```js
import { audit } from '../../helpers/audit.js';
import { AUDIT_ACTION } from '../../constants/enums.js';

await audit({
    actorId: request.user.id,        // hệ thống tự chạy thì bỏ
    action: AUDIT_ACTION.LOCK_USER,  // xem bảng AUDIT_ACTION trong housify-database.md
    targetType: 'users',             // tên collection bị tác động
    targetId: user._id,
    reason: 'Vi phạm quy định',      // bắt buộc khi LOCK_USER
    metadata: { before, after },     // tùy chọn
}, session);
```
