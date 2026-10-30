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
- Cần người dùng xác nhận thêm: trả 409, `message` là câu hỏi. Chỉ áp dụng ở API có ghi cờ xác nhận bên dưới (vd `confirmReplace`); FE gửi lại kèm cờ đó = true. 409 ở chỗ khác là trùng dữ liệu.

## Tài khoản – `auth` (UC-01..05)

| Method    | Path                      | Role  | Ghi chú                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------- | ------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST      | `/auth/login`           | —    | `{ identifier, password, remember }` – identifier là email (Admin/Manager) hoặc CCCD (Customer)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| GET       | `/auth/me`              | A M C |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| PUT       | `/auth/change-password` | A M C | `{ currentPassword, newPassword, confirmPassword }` – `confirmPassword` phải khớp `newPassword`. Lỗi: 400 "Mật khẩu hiện tại không đúng"; 400 "Mật khẩu mới không được trùng mật khẩu hiện tại"; 422 "Xác nhận mật khẩu không khớp"; 422 sai định dạng                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| POST      | `/auth/forgot-password` | —    | `{ email }` – luôn trả cùng một câu dù email có tồn tại hay không (BR-008); Manager chưa kích hoạt không nhận OTP (BR-021). OTP 4 số, sống 5 phút, gửi lại thì OTP cũ hết hiệu lực. Lỗi: 500 "Gửi email thất bại, vui lòng thử lại sau" (E04)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| POST      | `/auth/verify-otp`      | —    | `{ email, otp }` – chỉ kiểm OTP, đúng thì FE chuyển sang trang đặt mật khẩu mới (giữ lại email + otp để gửi ở bước sau). Lỗi: 400 "Mã OTP không đúng hoặc đã hết hạn"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| POST      | `/auth/reset-password`  | —    | `{ email, otp, newPassword, confirmPassword }` – kiểm lại OTP, đúng thì đổi mật khẩu và đánh dấu OTP đã dùng. Lỗi: 400 "Mã OTP không đúng hoặc đã hết hạn"; 400 "Mật khẩu mới không được trùng mật khẩu hiện tại"; 422 "Xác nhận mật khẩu không khớp"; 422 sai định dạng                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| GET / PUT | `/profile`              | M C   | Hồ sơ của chính mình (UC-05). Admin gọi → 403. GET trả `{ _id, email, role, name, phone, dateOfBirth, address, cccdFrontUrl, cccdBackUrl }` (link ảnh null nếu chưa có ảnh); Customer có thêm `cccd` (chỉ xem); Manager không trả số CCCD. PUT gửi các field muốn đổi, sửa nhiều lần được; ảnh là publicId `cccdFrontImage`, `cccdBackImage` lấy từ `POST /uploads/cccd`; giá trị giống cũ thì bỏ qua, không đổi gì → 200 "Không có thông tin nào thay đổi". Manager sửa `phone`, `dateOfBirth`, `address`, ảnh CCCD; `name`, `email` chỉ Admin sửa (UC-09). Customer sửa `email`, `phone`, `dateOfBirth`, `address`, ảnh CCCD; `name`, `cccd` chỉ Manager sửa (UC-31). Lỗi: 400 "Họ tên, email chỉ Admin được chỉnh sửa"; 400 "Họ tên, số CCCD chỉ Manager được chỉnh sửa"; 404 "Không tìm thấy hồ sơ"; 409 "Email đã tồn tại trong hệ thống"; 409 "Số điện thoại đã tồn tại trong hệ thống"; 422 sai định dạng hoặc body rỗng |

## Kích hoạt – `activation` (UC-06, 08)

Link trong email (BE ghép link, FE khai báo route khớp theo):

| Email                                               | Link BE gửi                                | Route FE                      |
| --------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| Kích hoạt Manager (UC-08, gửi lại ở UC-09)     | `${CLIENT_URL}/activate/manager/<token>`  | `/activate/manager/:token`  |
| Mời ký hợp đồng (UC-24, gửi lại ở UC-24 A2) | `${CLIENT_URL}/activate/contract/<token>` | `/activate/contract/:token` |

- Trang công khai, không cần đăng nhập. FE lấy token bằng `useParams()` rồi gửi kèm khi gọi API bên dưới.
- Link hết hạn, đã dùng hoặc không tồn tại → API trả lỗi, FE hiện "Link đã hết hạn" / "Link không tồn tại" (UC-08 E06, UC-06 E01, UC-46 E02).

| Method | Path                            | Role | Ghi chú                                                                                                                                                                              |
| ------ | ------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/activation/manager/:token`  | —   | Kiểm link còn hiệu lực. 200 trả `{ name, email }`. Lỗi: 400 "Link kích hoạt đã hết hạn hoặc đã được sử dụng"; 404 "Link kích hoạt không tồn tại" |
| POST   | `/activation/manager`         | —   | `{ token, password, confirmPassword }` – `password` ≥ 6 ký tự, có chữ và số; `confirmPassword` phải khớp `password`. 200 "Kích hoạt tài khoản thành công. Vui lòng đăng nhập" (không trả token). Lỗi: 400 "Link kích hoạt đã hết hạn hoặc đã được sử dụng"; 404 "Link kích hoạt không tồn tại"; 422 "Xác nhận mật khẩu không khớp"; 422 thiếu / sai định dạng |
| GET    | `/activation/contract/:token` | —   | Thông tin hợp đồng chỉ xem                                                                                                                                                       |
| POST   | `/activation/contract`        | —   | `{ token, name, phone, dateOfBirth, address, password, confirmPassword, agreed, cccdFrontImage, cccdBackImage }` – 2 ảnh là publicId, FE tải trước qua `POST /uploads/cccd` |

## Manager – `manager` (UC-08..11)

Chỉ Admin (Manager, Customer gọi → 403). Id sai định dạng → 404 như không tìm thấy.

| Method | Path | Role | Ghi chú |
| ------ | ---- | ---- | ------- |
| POST | `/managers` | A | `{ name, email, phone }` – tạo PENDING, chưa có mật khẩu, gửi mail link kích hoạt 24h. 201 trả 1 dòng như danh sách. Lỗi: 409 "Email đã tồn tại trong hệ thống"; 409 "Số điện thoại đã tồn tại trong hệ thống"; 422 thiếu / sai định dạng. Mail lỗi → vẫn 201, `data.warning` "Gửi email thất bại — vui lòng gửi lại tại danh sách Manager" |
| GET | `/managers` | A | `?status=&q=&unassigned=&page=&limit=` – `status` PENDING \| ACTIVE \| LOCKED; `q` tìm theo họ tên, không phân biệt hoa thường; `unassigned=true` chỉ Manager chưa phụ trách tòa nào (UC-11 dùng `status=ACTIVE&unassigned=true`); `page` mặc định 1, `limit` mặc định 10, tối đa 50. Mới tạo trước. Trả `{ items, total, page, limit }`, mỗi dòng `{ _id, name, email, phone, status, building: { _id, name } \| null, createdAt }`. Lỗi: 422 sai query |
| GET | `/managers/:id` | A | `{ _id, name, email, phone, status, dateOfBirth, address, cccdFrontImage, cccdBackImage, cccdFrontUrl, cccdBackUrl, createdAt, building }` – link ảnh null nếu chưa có ảnh; `building: { _id, name, address, activeContractCount } \| null`, `activeContractCount` = số hợp đồng ACTIVE của tòa (FE dùng để cảnh báo trước khi khóa). Lỗi: 404 "Không tìm thấy Manager" |
| PUT | `/managers/:id` | A | Gửi các field muốn đổi: `name, email, phone, dateOfBirth, address, cccdFrontImage, cccdBackImage` (ảnh là publicId từ `POST /uploads/cccd`). Chỉ ACTIVE / LOCKED. Giá trị giống cũ thì bỏ qua; không đổi gì → 200 "Không có thay đổi nào". Trả như GET `/managers/:id`. Lỗi: 400 "Tài khoản chưa kích hoạt không được chỉnh sửa. Vui lòng xóa và tạo lại"; 404; 409 "Email đã tồn tại trong hệ thống"; 409 "Số điện thoại đã tồn tại trong hệ thống"; 422 sai định dạng hoặc body rỗng |
| DELETE | `/managers/:id` | A | Chỉ PENDING, xóa hẳn tài khoản, hồ sơ và link kích hoạt; tòa đang gắn (nếu có) chỉ bỏ phân công, không xóa tòa. Lỗi: 400 "Chỉ xóa được tài khoản chưa kích hoạt"; 404 |
| POST | `/managers/:id/resend-activation` | A | Chỉ PENDING: link cũ hết hiệu lực, gửi link mới 24h. Lỗi: 400 "Tài khoản đã được kích hoạt"; 404. Mail lỗi → vẫn 200, `data.warning` "Gửi email thất bại — thử lại sau" |
| PATCH | `/managers/:id/lock` · `/unlock` | A | lock: `{ reason }` (≤ 500), chỉ ACTIVE; giữ nguyên phân công tòa, phiên đang mở bị đẩy ra ở request kế tiếp. unlock: chỉ LOCKED. Cả hai trả như GET `/managers/:id` và gửi mail báo Manager. Lỗi: 422 "Vui lòng nhập lý do khóa"; 400 "Chỉ khóa được tài khoản đang hoạt động"; 400 "Tài khoản không ở trạng thái bị khóa"; 404. Mail lỗi → `data.warning` "Gửi email thất bại" |
| PUT | `/buildings/:id/manager` | A | `{ managerId, confirmReplace? }` hoặc `managerId: null` để gỡ. Trả `{ _id, name, manager: { _id, name } \| null }`. Gán: chỉ Manager ACTIVE và chưa phụ trách tòa khác; tòa đã có Manager mà chưa gửi `confirmReplace: true` → 409 "Tòa đang do [tên] phụ trách — xác nhận để thay thế?" (UC-11 A1). Gỡ: luôn có `data.warning` "Tòa nhà hiện không có Manager phụ trách". Manager nhận chuông + mail. Lỗi: 404 "Không tìm thấy tòa nhà"; 404 "Không tìm thấy Manager"; 400 "Manager đang bị khóa, không thể phân công"; 400 "Manager chưa kích hoạt tài khoản, không thể phân công"; 400 "Manager này đang phụ trách tòa nhà"; 400 "Manager đang phụ trách tòa nhà khác"; 400 "Tòa nhà chưa có Manager phụ trách" (gỡ). Mail lỗi → vẫn 200, `data.warning` có thêm "Gửi email thất bại" |

- `:id` ở `/managers/:id` và `managerId` ở `/buildings/:id/manager` đều là `_id` của **users** (không phải của managers).

## Tòa nhà – `building` (UC-12..15, 23)

| Method             | Path                           | Role           | Ghi chú                                   |
| ------------------ | ------------------------------ | -------------- | ------------------------------------------ |
| GET                | `/buildings`                 | A M            | Tòa chưa xóa, mới tạo trước; Manager chỉ thấy tòa mình (mảng rỗng nếu chưa được phân công). Không phân trang, `data` là mảng **tòa** (dạng ở dưới bảng) |
| POST               | `/buildings`                 | A              | `{ name, address, floorCount, description?, images? }` – `name` 2–100 ký tự, `address` 5–255, `floorCount` số nguyên ≥ 1 (bắt buộc, UC-12), `description` ≤ 1000 không chứa `<` `>`, `images` mảng url từ `POST /uploads`. 201 trả **tòa**. Lỗi: 409 "Tên tòa nhà đã tồn tại" (so không phân biệt hoa thường, trong các tòa chưa xóa – BR-034); 422 thiếu / sai định dạng |
| GET                | `/buildings/:id`             | A M            | Trả **tòa**. Lỗi: 404 "Tòa nhà không tồn tại" (gồm tòa đã xóa); 403 "Bạn không có quyền xem tòa nhà này" (Manager mở tòa khác) |
| PUT                | `/buildings/:id`             | A              | Gửi field muốn đổi: `name, address, description, images` (ít nhất 1). Không sửa số tầng (dùng `floor-count`) và Manager (dùng `PUT /buildings/:id/manager`). Trả **tòa**. Lỗi: 404; 409 "Tên tòa nhà đã tồn tại"; 422 |
| DELETE             | `/buildings/:id`             | A              | Xóa mềm tòa và toàn bộ phòng của tòa (1 transaction). Lỗi: 400 "Vui lòng gỡ Manager trước khi xóa"; 400 "Không thể xóa vì các phòng sau đang có hợp đồng: P101, P102" (hợp đồng DRAFT hoặc ACTIVE – UC-14); 404 |
| GET                | `/buildings/:id/floors`      | A M            | `[{ floorNumber, roomCount, statusCounts: { AVAILABLE, OCCUPIED, MAINTENANCE } }]` – tầng 1..`floorCount`, chỉ đếm phòng chưa xóa. Lỗi: 404; 403 như GET chi tiết |
| PATCH              | `/buildings/:id/floor-count` | A              | `{ floorCount }` số nguyên ≥ 1. "Xóa tầng" (UC-15 A2) = gửi `floorCount` giảm 1. Trả **tòa**. Lỗi: 400 "Không thể giảm số tầng: còn [n] phòng ở các tầng bị bỏ" (BR-042); 404; 422 |
| GET                | `/buildings/:id/rules`       | A M C          | `{ rules }` – chuỗi rỗng nếu chưa có. Manager chỉ tòa mình (403 "Bạn không có quyền xem nội quy của tòa nhà này"). Customer chỉ tòa đang ở theo hợp đồng ACTIVE (403 "Bạn chưa có phòng đang thuê" / "Bạn không có hợp đồng đang hiệu lực" / "Bạn chỉ được xem nội quy của tòa nhà mình đang ở"). Lỗi: 404 |
| PUT                | `/buildings/:id/rules`       | A              | `{ rules }` không rỗng, ghi đè bản cũ (BR-060). Trả `{ rules }`. Tòa có Manager thì Manager nhận chuông ANNOUNCEMENT "Nội quy mới" (`refId` = id tòa). Lỗi: 404; 422 "Nội quy không được để trống" |

**Tòa** (dạng trả về ở danh sách, chi tiết, tạo, sửa, đổi số tầng): `{ _id, name, address, description, images, floorCount, rules, managerId, manager: { _id, name } | null, roomCount, isDeleted, createdAt, updatedAt }` – `roomCount` = số phòng chưa xóa; `manager._id` là `_id` của users (giống `managerId`).

- `:id` sai định dạng ObjectId → 422, `errors: [{ field: 'id', message: 'Mã tòa nhà không đúng định dạng' }]`.
- Customer chưa có cách lấy `_id` tòa đang ở để gọi `GET /buildings/:id/rules` (`/auth/me` của Customer trả `building: null`) – **chưa chốt**, cần An quyết.

## Phòng, loại phòng – `room`, `roomType` (UC-16..20)

| Method             | Path                             | Role         | Ghi chú                                                                          |
| ------------------ | -------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| GET / POST         | `/buildings/:buildingId/rooms` | A (GET: A M) | `?floor=&status=&roomTypeId=`                                                   |
| GET / PUT / DELETE | `/rooms/:id`                   | A (GET: A M) | PUT không sửa `roomNumber`; `status` chỉ chọn AVAILABLE hoặc MAINTENANCE |
| GET                | `/room-types`                  | A M          | Loại phòng chưa xóa, mới tạo trước. Không phân trang, `data` là mảng `[{ _id, name, createdAt, updatedAt }]`. Danh sách trống → `[]` |
| GET                | `/room-types/:id`              | A            | Một loại phòng, cùng dạng 1 phần tử ở danh sách. Lỗi: 404 "Loại phòng không tồn tại" (gồm loại đã xóa) |
| POST               | `/room-types`                  | A            | `{ name }` – 2–50 ký tự. 201 trả loại phòng vừa tạo. Lỗi: 409 "Tên loại phòng đã tồn tại" (so không phân biệt hoa thường, loại đã xóa không tính – BR-053); 422 thiếu / sai độ dài |
| PUT                | `/room-types/:id`              | A            | `{ name }` – như POST, trả loại phòng sau khi sửa. Phòng chỉ trỏ tới loại nên tên mới hiện ngay ở mọi phòng. Lỗi: 404 "Loại phòng không tồn tại"; 409 "Tên loại phòng đã tồn tại"; 422 |
| DELETE             | `/room-types/:id`              | A            | Xóa mềm. Lỗi: 400 "Không thể xóa loại phòng vì đang có [n] phòng sử dụng" (phòng chưa xóa – BR-054); 404 "Loại phòng không tồn tại" |

- `:id` sai định dạng ObjectId ở `/room-types/:id` → 422, `errors: [{ field: 'id', message: 'Mã loại phòng không đúng định dạng' }]`.

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
| GET    | `/notifications`                                         | A M C | Chỉ thông báo của chính mình, mới nhất trước. `?page=1&limit=10&unread=true` – `page` số nguyên ≥ 1 (mặc định 1), `limit` 1–50 (mặc định 10), `unread=true` chỉ lấy chưa đọc (mặc định lấy tất cả). Trả `{ items, total, page, limit }`, mỗi item `{ _id, type, title, message, refId, isRead, createdAt }` (`refId` null nếu không gắn bản ghi). Không có thông báo → `items` rỗng, `total` 0. Lỗi: 422 sai query |
| GET    | `/notifications/unread-count`                            | A M C | → `{ count }` số thông báo chưa đọc của mình |
| PATCH  | `/notifications/:id/read` · `/notifications/read-all` | A M C | `:id/read` → data là thông báo đó (cùng dạng 1 item ở danh sách); đã đọc rồi gọi lại vẫn 200. Lỗi: 404 "Không tìm thấy thông báo" (không tồn tại, sai id hoặc của người khác). `read-all` → `{ updated }` số thông báo vừa đánh dấu, không còn cái nào chưa đọc thì `updated` = 0 |
| POST   | `/announcements`                                         | M     | `{ title, message, target: 'ALL' \| roomIds[] }` |

**Gợi ý cho FE (chuông):**

- Chỉ gọi `unread-count` mỗi 30 giây để cập nhật số đỏ.
- Tạm dừng khi tab trình duyệt bị ẩn, gọi ngay khi người dùng quay lại tab.
- Chỉ tải danh sách khi người dùng mở chuông (dropdown dùng `?limit=5`).
- Bấm 1 thông báo: gọi `:id/read` rồi chuyển trang theo `type` + `refId`.

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

- 401 `Tài khoản hoặc mật khẩu không đúng` – không tìm thấy tài khoản, sai mật khẩu, hoặc Customer nhập email thay vì CCCD (bị chặn theo BR-001, báo cùng một câu)
- 403 `Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để đặt mật khẩu và kích hoạt tài khoản` – Manager PENDING hoặc chưa có mật khẩu (kiểm trước khi so mật khẩu)
- 403 `Tài khoản đã bị khóa` – LOCKED (sau khi đúng mật khẩu)
- 403 `Tài khoản đã ngưng hoạt động. Vui lòng kiểm tra email kích hoạt nếu bạn vừa có hợp đồng mới` – INACTIVE (sau khi đúng mật khẩu)
- 403 `Tài khoản không ở trạng thái hoạt động` – trạng thái khác ACTIVE (sau khi đúng mật khẩu)
- 422 Thiếu hoặc sai định dạng

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
    type: NOTIFICATION_TYPE.ANNOUNCEMENT, // xem bảng NOTIFICATION_TYPE trong docs/database.md
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
    action: AUDIT_ACTION.LOCK_USER,  // xem bảng AUDIT_ACTION trong docs/database.md
    targetType: 'users',             // tên collection bị tác động
    targetId: user._id,
    reason: 'Vi phạm quy định',      // bắt buộc khi LOCK_USER
    metadata: { before, after },     // tùy chọn
}, session);
```
