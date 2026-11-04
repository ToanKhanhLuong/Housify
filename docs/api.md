# Danh sách API

BE chốt lại ở đầu mỗi iteration, FE code theo file này (kể cả khi dùng mock).
Sửa endpoint thì sửa ở đây trước, báo nhóm. Field gửi lên / trả về đặt tên đúng như `docs/database.md`.

## Quy ước

- Prefix: `/api`
- Xác thực: header `Authorization: Bearer <token>`
- Thành công: `{ success: true, data, message }` · Lỗi: `{ success: false, message, errors }`
- Role viết tắt: **A** Admin · **M** Manager · **C** Customer · **—** không cần đăng nhập
- Manager chỉ thao tác trên tòa mình phụ trách, Customer chỉ trên hợp đồng của mình – BE kiểm ở service, không tin FE.
- Các field tiền (`totalAmount`, `amount`, `unitPrice`), trạng thái, `dueDate`, mã (`invoiceCode`, `incidentCode`) do **server tự đặt**, không nhận từ client.
- Việc chính xong nhưng việc phụ lỗi (vd gửi mail thất bại): vẫn trả thành công, kèm `data.warning` là câu tiếng Việt.
- Cần người dùng xác nhận thêm: trả 409, `message` là câu hỏi. Chỉ áp dụng ở API có ghi cờ xác nhận bên dưới (vd `confirmReplace`); FE gửi lại kèm cờ đó = true. 409 ở chỗ khác là trùng dữ liệu.

### Quy ước chung cho API danh sách (Iter 1)

- **Nguyên tắc phân trang:**
  - **Danh sách có giới hạn tự nhiên** (tòa nhà, phòng của một tòa, loại phòng, dịch vụ, Manager): **KHÔNG phân trang**, trả toàn bộ bản ghi khớp bộ lọc. `data` trả về là mảng trực tiếp `[...]`. Frontend được gom nhóm (nhóm theo) trên dữ liệu này.
  - **Danh sách tăng theo thời gian** (thông báo, hóa đơn, thanh toán, sự cố, nhật ký – từ iter 2): **CÓ phân trang** (`page`, `limit`, trả kèm `total`, `totalPages`). Chỉ lọc, Frontend **không gom nhóm** vì gom trên từng trang sẽ sai.
- **Luôn bỏ bản ghi đã xóa mềm** (`isDeleted: true`).
- **Lọc qua tham số trên URL.** Tham số nào không gửi thì không lọc theo nó.
- **Ô chọn nhiều giá trị** gửi cách nhau bằng dấu phẩy, ví dụ `status=AVAILABLE,MAINTENANCE` → tìm bản ghi có một trong các giá trị đó.
- **true/false** gửi dạng chữ `"true"` / `"false"`.
- **`q`** = tìm gần đúng, không phân biệt hoa thường; phải escape ký tự đặc biệt của regex trước khi tìm.
- **Giá trị lọc sai** (enum không tồn tại, số không hợp lệ, id sai định dạng) → 422 `"Giá trị lọc không hợp lệ"` kèm `errors: [{ field, message }]`.

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
| GET    | `/activation/contract/:token` | —   | Thông tin hợp đồng chỉ xem (UC-06). 200 trả `{ building: { name, address, rules }, room: { roomNumber, floorNumber, roomTypeName, area }, contractType, startDate, endDate, rentPrice, deposit, notes, representativeEmail, representativeCccd, coOccupants: [{ name, cccd, phone, dateOfBirth, relationship }] }`. Lỗi: 400 "Link đã hết hạn. Vui lòng liên hệ quản lý để gửi lại"; 400 "Hợp đồng đã được kích hoạt. Vui lòng đăng nhập"; 404 "Link không còn hiệu lực" |
| POST   | `/activation/contract`        | —   | `{ token, name, phone, dateOfBirth, address, password, confirmPassword, agreed, cccdFrontImage, cccdBackImage }` – 2 ảnh là publicId, FE tải trước qua `POST /uploads/cccd`. 200 "Kích hoạt hợp đồng thành công. Vui lòng đăng nhập bằng số CCCD" (không trả JWT token). 1 transaction: tạo/mở lại user CUSTOMER ACTIVE, tạo occupant đại diện, hợp đồng ACTIVE, phòng OCCUPIED, token USED. Lỗi: 400 "Phòng không còn trống, vui lòng liên hệ quản lý"; 400 "Hợp đồng đã được kích hoạt. Vui lòng đăng nhập"; 404 "Link không còn hiệu lực"; 409 "Số điện thoại đã tồn tại trong hệ thống"; 409 "Email đã tồn tại trong hệ thống"; 422 sai định dạng hoặc chưa tích đồng ý |

## Manager – `manager` (UC-08..11)

Chỉ Admin (Manager, Customer gọi → 403). Id sai định dạng → 404 như không tìm thấy.

| Method | Path | Role | Ghi chú |
| ------ | ---- | ---- | ------- |
| POST | `/managers` | A | `{ name, email, phone }` – tạo PENDING, chưa có mật khẩu, gửi mail link kích hoạt 24h. 201 trả 1 dòng như danh sách. Lỗi: 409 "Email đã tồn tại trong hệ thống"; 409 "Số điện thoại đã tồn tại trong hệ thống"; 422 thiếu / sai định dạng. Mail lỗi → vẫn 201, `data.warning` "Gửi email thất bại — vui lòng gửi lại tại danh sách Manager" |
| GET | `/managers` | A | `?q=&status=&assigned=` – Bộ lọc: `q` tìm theo họ tên, email hoặc SĐT; `status` nhiều giá trị trong `ACTIVE / PENDING / LOCKED`; `assigned` `"true"` = đang phụ trách tòa, `"false"` = chưa phân công. Sắp mới tạo trước (`createdAt: -1`). Không phân trang, `data` là mảng `[{ _id, name, email, phone, status, building: { _id, name } \| null, createdAt }]`. Lỗi: 422 "Giá trị lọc không hợp lệ" |
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
| GET                | `/buildings`                 | A M            | `?q=&hasManager=` – Admin thấy tất cả, Manager chỉ thấy tòa mình. `q` tìm theo tên hoặc địa chỉ; `hasManager` `"true"` = đã có Manager, `"false"` = chưa có. Sắp theo tên tăng dần. Không phân trang, `data` là mảng **tòa** (dạng ở dưới bảng). Lỗi: 422 "Giá trị lọc không hợp lệ" |
| POST               | `/buildings`                 | A              | `{ name, address, floorCount, description?, images? }` – `name` 2–100 ký tự, `address` 5–255, `floorCount` số nguyên ≥ 1 (bắt buộc, UC-12), `description` ≤ 1000 không chứa `<` `>`, `images` mảng url từ `POST /uploads` (ảnh đầu tiên là ảnh đại diện). 201 trả **tòa**. Lỗi: 409 "Tên tòa nhà đã tồn tại" (so không phân biệt hoa thường, trong các tòa chưa xóa – BR-034); 422 thiếu / sai định dạng |
| GET                | `/buildings/:id`             | A M            | Trả **tòa** kèm `roomStats` và `manager`. Lỗi: 404 "Tòa nhà không tồn tại" (gồm tòa đã xóa); 403 "Bạn không có quyền xem tòa nhà này" (Manager mở tòa khác) |
| PUT                | `/buildings/:id`             | A              | Gửi field muốn đổi: `name, address, description, images` (ít nhất 1). Không sửa số tầng (dùng `floor-count`) và Manager (dùng `PUT /buildings/:id/manager`). Trả **tòa**. Lỗi: 404; 409 "Tên tòa nhà đã tồn tại"; 422 |
| DELETE             | `/buildings/:id`             | A              | Xóa mềm tòa và toàn bộ phòng của tòa (1 transaction). Lỗi: 400 "Vui lòng gỡ Manager trước khi xóa"; 400 "Không thể xóa vì các phòng sau đang có hợp đồng: P101, P102" (hợp đồng DRAFT hoặc ACTIVE – UC-14); 404 |
| GET                | `/buildings/:id/floors`      | A M            | `[{ floorNumber, roomCount, statusCounts: { AVAILABLE, OCCUPIED, MAINTENANCE } }]` – tầng 1..`floorCount`, chỉ đếm phòng chưa xóa. Lỗi: 404; 403 như GET chi tiết |
| PATCH              | `/buildings/:id/floor-count` | A              | `{ floorCount }` số nguyên ≥ 1. "Xóa tầng" (UC-15 A2) = gửi `floorCount` giảm 1. Trả **tòa**. Lỗi: 400 "Không thể giảm số tầng: còn [n] phòng ở các tầng bị bỏ" (BR-042); 404; 422 |
| GET                | `/buildings/:id/rules`       | A M C          | `{ rules }` – chuỗi rỗng nếu chưa có. Manager chỉ tòa mình (403 "Bạn không có quyền xem nội quy của tòa nhà này"). Customer chỉ tòa đang ở theo hợp đồng ACTIVE (403 "Bạn chưa có phòng đang thuê" / "Bạn không có hợp đồng đang hiệu lực" / "Bạn chỉ được xem nội quy của tòa nhà mình đang ở"). Lỗi: 404 |
| PUT                | `/buildings/:id/rules`       | A              | `{ rules }` không rỗng, ghi đè bản cũ (BR-060). Trả `{ rules }`. Tòa có Manager thì Manager nhận chuông ANNOUNCEMENT "Nội quy mới" (`refId` = id tòa). Lỗi: 404; 422 "Nội quy không được để trống" |

**Tòa** (dạng trả về ở danh sách, chi tiết, tạo, sửa, đổi số tầng): `{ _id, name, address, description, images, floorCount, rules, managerId, manager: { _id, name } | null, roomStats: { total, available, occupied, maintenance }, isDeleted, createdAt, updatedAt }` – `manager._id` là `_id` của users (giống `managerId`).

- `:id` sai định dạng ObjectId → 422, `errors: [{ field: 'id', message: 'Mã tòa nhà không đúng định dạng' }]`.

## Phòng, loại phòng – `room`, `roomType` (UC-16..20)

| Method             | Path                             | Role         | Ghi chú                                                                          |
| ------------------ | -------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| GET                | `/buildings/:buildingId/rooms` | A M          | `buildingId` trên URL bắt buộc (thiếu → 422 "Thiếu tòa nhà"). Manager xem tòa khác → 403 "Bạn không có quyền xem phòng của tòa này". `?q=&status=&floor=&roomTypeId=&minPrice=&maxPrice=` (giá so với `rentPrice`, gồm cả 2 đầu). `status`, `floor`, `roomTypeId` hỗ trợ chọn nhiều giá trị cách nhau bằng dấu phẩy; `floor` mỗi số trong khoảng 1..`floorCount` của tòa. Sắp xếp: `floorNumber` tăng dần, rồi `roomNumber`. Không phân trang, `data` là mảng **phòng**. Không phòng nào khớp → `[]`. Lỗi: 404 "Tòa nhà không tồn tại"; 403 "Bạn không có quyền xem phòng của tòa này"; 422 "Giá từ không được lớn hơn giá đến" (khi `minPrice > maxPrice`); 422 "Giá trị lọc không hợp lệ" |
| POST               | `/buildings/:buildingId/rooms` | A            | `{ roomNumber, floorNumber, roomTypeId, area, rentPrice, deposit, images? }` – KHÔNG còn `capacity` (client gửi thì bỏ qua, sức chứa lấy theo loại phòng). `roomNumber` ≤ 20 ký tự; `floorNumber` số nguyên 1..`floorCount` của tòa; `area` > 0; `rentPrice` > 0 (422 "Giá thuê phải lớn hơn 0"); `deposit` > 0 (422 "Tiền cọc phải lớn hơn 0"); `roomTypeId` loại phải tồn tại và chưa xóa (422 "Loại phòng không tồn tại"). Phòng mới luôn AVAILABLE (BR-044). 201 trả **phòng**. Lỗi: 409 "Mã phòng đã tồn tại trong tòa nhà"; 400 "Tầng phải nằm trong khoảng 1 đến [n]"; 404 "Tòa nhà không tồn tại"; 422 |
| GET                | `/rooms/:id`                   | A M          | Trả **phòng** (kèm `roomType { _id, name, capacity }` và `occupantCount`). Lỗi: 404 "Phòng không tồn tại"; 403 như GET danh sách |
| PUT                | `/rooms/:id`                   | A            | Gửi field muốn đổi (ít nhất 1): `floorNumber, roomTypeId, area, rentPrice, deposit, images, status`. Không sửa `roomNumber` (BR-046). KHÔNG còn `capacity`. `rentPrice > 0`, `deposit > 0` (422). Sửa đổi loại phòng: `capacity` của loại mới phải ≥ số người đang ở (nếu không đủ → 400 "Loại phòng mới không đủ chỗ cho số người đang ở (<X> người)"). `status` chỉ AVAILABLE hoặc MAINTENANCE (chặn khi phòng có hợp đồng DRAFT). Trả **phòng**. Lỗi: 400 "Phòng đang thuê, không thể đổi trạng thái"; 400 "Phòng đang có hợp đồng nháp, Manager cần hủy hợp đồng nháp trước khi chuyển sang Bảo trì"; 400 "Tầng phải nằm trong khoảng 1 đến [n]"; 404 "Phòng không tồn tại"; 422 "Loại phòng không tồn tại"; 422 |
| DELETE             | `/rooms/:id`                   | A            | Xóa mềm. Lỗi: 400 "Không thể xóa phòng đang có khách thuê" (hợp đồng ACTIVE); 400 "Phòng đang có hợp đồng chờ kích hoạt, Manager cần hủy hợp đồng nháp trước khi xóa" (hợp đồng DRAFT – UC-18); 404 "Phòng không tồn tại" |
| GET                | `/room-types`                  | A M          | Loại phòng chưa xóa, không cần lọc, sắp theo tên tăng dần. Không phân trang, `data` là mảng `[{ _id, name, capacity, roomCount, createdAt, updatedAt }]` (`roomCount` = số phòng chưa xóa đang dùng loại đó). Danh sách trống → `[]` |
| GET                | `/room-types/:id`              | A            | Trả `{ _id, name, capacity, roomCount, createdAt, updatedAt }`. Lỗi: 404 "Loại phòng không tồn tại" |
| POST               | `/room-types`                  | A            | `{ name, capacity }` – `name` cắt khoảng trắng, bắt buộc; `capacity` số nguyên ≥ 1. 201 trả loại phòng vừa tạo. Lỗi: 409 "Tên loại phòng đã tồn tại" (so không phân biệt hoa thường, trong các loại chưa xóa); 422 "Tên loại phòng không được để trống"; 422 "Sức chứa phải là số nguyên lớn hơn hoặc bằng 1" |
| PUT                | `/room-types/:id`              | A            | `{ name, capacity }` – như POST, trả loại phòng sau khi sửa. Tên mới hiện ngay ở mọi phòng. Sửa `capacity`: nếu có phòng chưa xóa thuộc loại này có số người đang ở > capacity mới → chặn, 400 "Sức chứa mới nhỏ hơn số người đang ở của phòng <mã phòng> (<X> người)". Lỗi: 404 "Loại phòng không tồn tại"; 409 "Tên loại phòng đã tồn tại"; 422 |
| DELETE             | `/room-types/:id`              | A            | Xóa mềm. Còn phòng chưa xóa đang dùng loại này → chặn, 400 "Không thể xóa loại phòng đang được dùng bởi <N> phòng". Lỗi: 404 "Loại phòng không tồn tại" |

**Phòng** (dạng trả về ở danh sách, chi tiết, tạo, sửa): `{ _id, buildingId, roomNumber, floorNumber, roomTypeId, area, rentPrice, deposit, images, status, isDeleted, createdAt, updatedAt, building: { _id, name, floorCount }, roomType: { _id, name, capacity }, occupantCount }` – `buildingId`, `roomTypeId` vẫn là id; `building`, `roomType` ghép thêm để hiển thị; `occupantCount` = số người đang ở (đếm cư dân STAYED của hợp đồng ACTIVE, iter 1 chưa có hợp đồng nên luôn là 0); phòng KHÔNG còn trường `capacity` riêng.

- `:buildingId`, `:id` sai định dạng ObjectId ở `/buildings/:buildingId/rooms`, `/rooms/:id` → 422, `errors: [{ field: 'buildingId' | 'id', message }]`.
- `:id` sai định dạng ObjectId ở `/room-types/:id` → 422, `errors: [{ field: 'id', message: 'Mã loại phòng không đúng định dạng' }]`.

## Dịch vụ – `service` (UC-21, 22)

| Method       | Path                              | Role | Ghi chú                                                                                  |
| ------------ | --------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| GET          | `/services`                     | A M  | `?q=&isFixed=` – `q` tìm theo tên dịch vụ; `isFixed` `"true"` / `"false"`. Dịch vụ chưa xóa, sắp theo tên tăng dần. Không phân trang, `data` là mảng **dịch vụ** `[{ _id, name, unit, isFixed, isDeleted, createdAt, updatedAt }]`. Trống → `[]`. Lỗi: 422 "Giá trị lọc không hợp lệ" |
| POST         | `/services`                     | A    | `{ name, unit, isFixed }` – `name` 2–100 ký tự, `unit` ≤ 30 ký tự (chỉ để hiển thị), `isFixed` boolean (true: cố định, false: theo chỉ số). 201 trả **dịch vụ**. Lỗi: 409 "Tên dịch vụ đã tồn tại" (không phân biệt hoa thường, dịch vụ đã xóa không tính – BR-055); 422 thiếu / sai định dạng |
| PUT          | `/services/:id`                 | A    | Gửi field muốn đổi (ít nhất 1): `name, unit, isFixed`. Chỉ ảnh hưởng hóa đơn lập sau. Trả **dịch vụ**. Lỗi: 404 "Dịch vụ không tồn tại" (gồm dịch vụ đã xóa); 409 "Tên dịch vụ đã tồn tại"; 422 |
| DELETE       | `/services/:id`                 | A    | Luôn xóa mềm, kể cả dịch vụ đã có trong hóa đơn (BR-056). Lỗi: 404 "Dịch vụ không tồn tại" |
| GET          | `/buildings/:id/service-prices` | A    | Lịch sử giá mọi dịch vụ của tòa, `effectiveFrom` mới nhất trước: `[{ _id, serviceId, buildingId, unitPrice, effectiveFrom, createdBy, createdAt, updatedAt }]`. FE tự lọc theo `serviceId`; giá đang áp dụng = `effectiveFrom` gần nhất mà ≤ hôm nay. Lỗi: 404 "Tòa nhà không tồn tại" (gồm tòa đã xóa) |
| POST         | `/buildings/:id/service-prices` | A    | `{ serviceId, unitPrice, effectiveFrom }` – `unitPrice` > 0, `effectiveFrom` dạng `yyyy-MM-dd` (ngày quá khứ vẫn nhận, FE tự cảnh báo). BE lưu là 00:00 giờ Việt Nam của ngày đó (VD `2026-11-01` → `2026-10-31T17:00:00.000Z`): giá có hiệu lực ngay từ đầu ngày, gửi kèm giờ phút vẫn tính theo ngày. FE hiện bằng `formatDate` / `toDateInput` (giờ máy) là ra đúng ngày. Trùng ngày với mức đã có → sửa mức đó, 200 "Cập nhật mức giá thành công" (UC-22 A1); không trùng → thêm mức mới, 201 "Thêm mức giá thành công". Trả mức giá (cùng dạng 1 phần tử ở GET). Mức giá không xóa được. Lỗi: 404 "Tòa nhà không tồn tại"; 404 "Dịch vụ không tồn tại"; 422 |

- `:id` sai định dạng ObjectId → 422, `errors: [{ field: 'id', message }]`.
- Đơn giá khi lập hóa đơn (iter 2): gọi helper `getCurrentPrice(serviceId, buildingId, date)` trong `src/helpers/getCurrentPrice.js` → mức giá có `effectiveFrom` gần nhất và ≤ `date`, hoặc `null` nếu chưa có giá (UC-34 E03: cảnh báo, dùng giá 0).

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
| POST   | `/announcements`                                         | M     | Gửi thông báo cho khách trong tòa mình (UC-40). Body: `{ title, message, target: 'ALL' \| roomIds[] }`. Người nhận: người đại diện (tài khoản Customer đang hoạt động) của các phòng có hợp đồng `ACTIVE`; mỗi người một thông báo loại `ANNOUNCEMENT` + email. Trả 201 `{ sentCount, warning? }`, message "Đã gửi thành công đến X tài khoản" (`warning` khi có email gửi thất bại, thông báo vẫn được tạo). Lỗi: 400 "Không có tài khoản Customer nào để gửi thông báo"; 403 "Bạn không có quyền thực hiện thao tác này" (chưa được phân công tòa hoặc phòng thuộc tòa khác); 422 thiếu tiêu đề / nội dung / đối tượng nhận |

**Gợi ý cho FE (chuông):**

- Chỉ gọi `unread-count` mỗi 30 giây để cập nhật số đỏ.
- Tạm dừng khi tab trình duyệt bị ẩn, gọi ngay khi người dùng quay lại tab.
- Chỉ tải danh sách khi người dùng mở chuông (dropdown dùng `?limit=5`).
- Bấm 1 thông báo: gọi `:id/read` rồi chuyển trang theo `type` + `refId`.

## Hợp đồng – `contract` (UC-24..27, 45, 46)

| Method    | Path                              | Role         | Ghi chú                                                                                                                                                                     |
| --------- | --------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST      | `/contracts`                    | M            | Tạo hợp đồng nháp (UC-24). Body: `{ roomId, startDate, durationMonths, representativeCccd, representativeEmail, contractType, notes?, coOccupants: [{ name, cccd, phone, dateOfBirth, address?, relationship? }] }`. Trả 201 `{ _id, status: 'DRAFT', ..., rawToken, warning? }`. Lỗi: 400 "Phòng không còn trống để tạo hợp đồng"; 400 "Khách hàng này hiện đang thuê phòng khác"; 400 "Tài khoản khách hàng này đã bị khóa do vi phạm, không thể tạo hợp đồng mới"; 400 "Số người vượt quá sức chứa tối đa của phòng"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy phòng"; 409 "Số điện thoại ... đã tồn tại trong hệ thống"; 422 sai định dạng hoặc trùng CCCD/SĐT |
| GET       | `/contracts`                    | M C          | Xem danh sách hợp đồng (UC-25). Query: `?status=DRAFT,ACTIVE&roomId=...&page=1&limit=10`. Trả 200 `{ items: [{ _id, roomId, room: { _id, roomNumber, floorNumber, status }, contractType, representative: { _id?, name?, cccd, email, phone? }, occupantCount, startDate, endDate, rentPrice, deposit, status, notes, createdAt }], total, page, limit, totalPages }`. Lỗi: 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy phòng"; 422 "Giá trị lọc không hợp lệ" |
| GET       | `/contracts/:id`                | M C          | Xem chi tiết hợp đồng (UC-25). Trả 200 `{ _id, contractType, startDate, endDate, rentPrice, deposit, status, activatedAt?, notes?, room: { _id, roomNumber, floorNumber, rentPrice, deposit, status, roomType: { _id, name, capacity }, building: { _id, name, address } }, representative: { _id?, userId?, name?, cccd, email, phone?, dateOfBirth?, address? }, occupants: [{ _id, isRepresentative, name, cccd, phone, dateOfBirth, address?, relationship?, status, joinDate, exitDate? }] }`. Lỗi: 403 "Bạn không có quyền thực hiện thao tác này" (Manager ngoài tòa); 403 "Bạn không có quyền xem hợp đồng này" (Customer mở HĐ không phải của mình); 404 "Không tìm thấy hợp đồng" |
| PUT       | `/contracts/:id`                | M            | Sửa hợp đồng (UC-26). Khi DRAFT: Body `{ representativeCccd?, representativeEmail?, startDate?, durationMonths?, notes? }` (đổi CCCD/email sẽ làm link mời cũ hết hiệu lực, trả kèm `inviteInvalidated: true`). Khi ACTIVE: chỉ Body `{ notes }`. Trả 200 `{ _id, ..., inviteInvalidated? }`. Lỗi: 400 "Hợp đồng đang hiệu lực chỉ được sửa ghi chú"; 400 "Không thể chỉnh sửa hợp đồng đã kết thúc hoặc đã hủy"; 400 "Không được phép chỉnh sửa các trường bị khóa của hợp đồng"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy hợp đồng"; 422 dữ liệu không hợp lệ |
| POST      | `/contracts/:id/resend-invite`  | M            | Gửi lại lời mời (UC-24 A2). Vô hiệu link cũ, sinh link mới 24h, gửi mail. Trả 200 `{ rawToken, warning? }`. Lỗi: 400 "Chỉ có thể gửi lại lời mời cho hợp đồng ở trạng thái nháp"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy hợp đồng" |
| POST      | `/contracts/:id/renew`          | M            | Gia hạn hợp đồng (UC-27). Body: `{ months?: 12, notes? }` (months nguyên > 0, mặc định 12; chỉ dời `endDate`, báo chuông `CONTRACT_RENEWED` + gửi mail). Trả 200 `{ _id, endDate, ..., warning? }`. Lỗi: 400 "Chỉ gia hạn được hợp đồng đang hiệu lực"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy hợp đồng"; 422 "Số tháng gia hạn phải là số nguyên lớn hơn 0" |
| POST      | `/contracts/:id/cancel`         | M            | Hủy hợp đồng nháp (UC-46). Body: `{ reason? }` (chỉ DRAFT; 1 transaction: HĐ → CANCELLED, link mời → EXPIRED, người ở cùng → LEFT, phòng giữ AVAILABLE, gửi mail). Trả 200 `{ _id, status: 'CANCELLED', ..., warning? }`. Lỗi: 400 "Chỉ hủy được hợp đồng nháp. Hợp đồng đang hiệu lực phải chấm dứt qua đơn chấm dứt"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy hợp đồng" |
| GET       | `/contracts/:id/refund-preview` | M            | Xem trước hoàn cọc (UC-45): chỉ hợp đồng `ENDED` do hết hạn tự nhiên (không có đơn chấm dứt `CONFIRMED`) và chưa hoàn cọc. Trả 200 `{ contractId, room: { _id, roomNumber, floorNumber, buildingName }, deposit, canRefund: true, hasPendingInvoices, pendingInvoiceCount, pendingInvoiceTotal, pendingInvoices, warning }`. Lỗi: 400 "Hợp đồng chấm dứt trước hạn không được hoàn cọc"; 400 "Chỉ có thể hoàn cọc cho hợp đồng đã kết thúc"; 400 "Hợp đồng này đã được hoàn cọc vào lúc [thời điểm] bởi [người hoàn]"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy hợp đồng" |
| POST      | `/contracts/:id/refund-deposit` | M            | Xác nhận hoàn cọc (UC-45): lưu `depositRefundedAt`, `depositRefundedBy`, gửi chuông `DEPOSIT_REFUNDED` + email cho người đại diện, ghi log `UPDATE_CONTRACT`. Trả 200 `{ _id, deposit, depositRefundedAt, depositRefundedBy, hasPendingInvoices, pendingInvoiceCount, pendingInvoiceTotal, pendingInvoices, invoiceWarning, warning? }`. Lỗi như `refund-preview` |

### Chi tiết mẫu Request / Response (UC-25, UC-26, UC-27, UC-45, UC-46)

#### `GET /api/contracts?status=DRAFT,ACTIVE&roomId=...&page=1&limit=10` — UC-25 (Role: M, C)
- **Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách hợp đồng thành công",
  "data": {
    "items": [
      {
        "_id": "66f1...",
        "roomId": "66f0...",
        "contractType": "GROUP",
        "startDate": "2026-09-01T00:00:00.000Z",
        "endDate": "2027-08-31T23:59:59.999Z",
        "rentPrice": 3500000,
        "deposit": 3500000,
        "status": "ACTIVE",
        "notes": "Thanh toán trước ngày 05 hàng tháng",
        "room": { "_id": "66f0...", "roomNumber": "501", "floorNumber": 5, "status": "OCCUPIED" },
        "representative": { "_id": "66f2...", "name": "Nguyễn Văn A", "cccd": "001202012345", "email": "nguyenvana@gmail.com", "phone": "0912345678" },
        "occupantCount": 3
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

#### `GET /api/contracts/:id` — UC-25 (Role: M, C)
- **Response 200:**
```json
{
  "success": true,
  "message": "Lấy chi tiết hợp đồng thành công",
  "data": {
    "_id": "66f1...",
    "contractType": "GROUP",
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2027-08-31T23:59:59.999Z",
    "rentPrice": 3500000,
    "deposit": 3500000,
    "status": "ACTIVE",
    "notes": "Thanh toán trước ngày 05 hàng tháng",
    "room": {
      "_id": "66f0...",
      "roomNumber": "501",
      "floorNumber": 5,
      "rentPrice": 3500000,
      "deposit": 3500000,
      "status": "OCCUPIED",
      "roomType": { "_id": "66e...", "name": "Phòng gia đình", "capacity": 4 },
      "building": { "_id": "66d...", "name": "Tòa Sunrise", "address": "128 Triều Khúc, Hà Nội" }
    },
    "representative": {
      "_id": "66f2...",
      "userId": "66f3...",
      "name": "Nguyễn Văn A",
      "cccd": "001202012345",
      "email": "nguyenvana@gmail.com",
      "phone": "0912345678",
      "dateOfBirth": "2002-05-10T00:00:00.000Z",
      "address": "Hà Nội"
    },
    "occupants": [
      { "_id": "66f2...", "isRepresentative": true, "name": "Nguyễn Văn A", "cccd": "001202012345", "phone": "0912345678", "status": "STAYED", "joinDate": "2026-09-01T00:00:00.000Z" }
    ]
  }
}
```
*(Lưu ý: Nếu hợp đồng là `DRAFT`, `representative` chỉ có `{ cccd, email }`).*

#### `PUT /api/contracts/:id` — UC-26 (Role: M)
- **Request (khi DRAFT):** `{ "representativeCccd": "001202099999", "representativeEmail": "moi@gmail.com", "startDate": "2026-10-01", "durationMonths": 12, "notes": "Ghi chú mới" }`
- **Request (khi ACTIVE):** `{ "notes": "Bổ sung điều khoản vệ sinh chung" }`
- **Response 200:** `{ "success": true, "message": "Cập nhật hợp đồng thành công", "data": { "_id": "...", "status": "DRAFT", "inviteInvalidated": true, ... } }`

#### `POST /api/contracts/:id/renew` — UC-27 (Role: M)
- **Request:** `{ "months": 12, "notes": "Gia hạn năm thứ 2" }`
- **Response 200:** `{ "success": true, "message": "Gia hạn hợp đồng thành công", "data": { "_id": "...", "endDate": "2028-08-31T23:59:59.999Z", "warning": "..." } }`

#### `POST /api/contracts/:id/cancel` — UC-46 (Role: M)
- **Request:** `{ "reason": "Khách đổi ý không thuê nữa" }`
- **Response 200:** `{ "success": true, "message": "Đã hủy hợp đồng nháp", "data": { "_id": "...", "status": "CANCELLED", "warning": "..." } }`

#### `GET /api/contracts/:id/refund-preview` — UC-45 (Role: M)
- **Response 200:**
```json
{
  "success": true,
  "message": "Lấy thông tin xem trước hoàn cọc thành công",
  "data": {
    "contractId": "66f1...",
    "room": { "_id": "66f0...", "roomNumber": "405", "floorNumber": 4, "buildingName": "Housify Hòa Lạc" },
    "deposit": 5200000,
    "canRefund": true,
    "hasPendingInvoices": false,
    "pendingInvoiceCount": 0,
    "pendingInvoiceTotal": 0,
    "pendingInvoices": [],
    "warning": null
  }
}
```

#### `POST /api/contracts/:id/refund-deposit` — UC-45 (Role: M)
- **Response 200:**
```json
{
  "success": true,
  "message": "Ghi nhận hoàn trả tiền đặt cọc thành công",
  "data": {
    "_id": "66f1...",
    "status": "ENDED",
    "deposit": 5200000,
    "depositRefundedAt": "2026-11-03T10:30:00.000Z",
    "depositRefundedBy": "66e0...",
    "hasPendingInvoices": false,
    "pendingInvoiceCount": 0,
    "pendingInvoiceTotal": 0,
    "pendingInvoices": [],
    "invoiceWarning": null
  }
}
```

## Chấm dứt – `termination` (UC-28, 29)

| Method | Path                            | Role  | Ghi chú                                                                                                                                                                                                                                                                                               |
| ------ | ------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/contracts/:id/terminations`   | M     | Tạo đơn chấm dứt trên hợp đồng `ACTIVE` (UC-28, UC-29). Body: `{ type?: 'MUTUAL' \| 'UNILATERAL', reason, effectiveDate, note? }` (mặc định `type = 'MUTUAL'`). Gửi xong khóa nội dung đơn, HĐ vẫn `ACTIVE`. Với `MUTUAL`: báo chuông + mail đại diện. Với `UNILATERAL`: báo chuông Admin. Lỗi: 400 "Chỉ có thể tạo đơn chấm dứt cho hợp đồng đang hiệu lực"; 400 "Hợp đồng đã có đơn chấm dứt đang xử lý" (khi đã có đơn `PENDING` hoặc đơn `CONFIRMED`); 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy hợp đồng"; 422 thiếu lý do / ngày hiệu lực |
| GET    | `/terminations`                 | A M C | Danh sách đơn chấm dứt có phân trang. Query: `?status=&type=&contractId=&page=1&limit=10` (Admin lọc `?type=UNILATERAL&status=PENDING` để xem đơn đơn phương chờ duyệt; Manager chỉ thấy tòa mình; Customer chỉ thấy HĐ mình đại diện). Trả 200 `{ items, total, page, limit, totalPages }` |
| GET    | `/terminations/:id`             | A M C | Chi tiết đơn chấm dứt kèm xác nhận điện tử (`signatureValid`, `shortSignature`, `signedBy`, `signedAt`, `electronicConfirmation`). Với đơn `MUTUAL` đã xác nhận bởi khách: trả `electronicConfirmation: { statusText: 'Đã xác nhận điện tử', validityText: 'Hợp lệ' \| 'Không hợp lệ', signedBy, signedAt, handledIp, shortSignature }`. Với đơn tự động xác nhận sau 7 ngày: trả `statusText: 'Tự động xác nhận sau 7 ngày — đã nhắc [n] lần'`. Lỗi: 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy đơn chấm dứt hợp đồng" |
| POST   | `/terminations/:id/confirm`     | C     | Người đại diện xác nhận đơn `MUTUAL` (UC-28). Body: `{ agreed: true }`. Chuyển `PENDING → CONFIRMED`, lưu `handledBy`, `handledAt`, `handledIp`, `signatureHash = sha256(nội dung đơn + người xác nhận + thời điểm)`. Nếu `effectiveDate` đã tới hoặc đã qua → kết thúc hợp đồng ngay trong cùng transaction (`contract → ENDED`, `room → AVAILABLE`, cư dân `STAYED → LEFT`). Báo Customer + Manager, gửi mail Customer. Lỗi: 400 "Chỉ đơn chấm dứt hai bên thỏa thuận mới do khách hàng xác nhận"; 400 "Đơn chấm dứt này không còn ở trạng thái chờ xác nhận"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy đơn chấm dứt hợp đồng"; 422 "Vui lòng tích chọn đồng ý nội dung đơn chấm dứt hợp đồng" |
| POST   | `/terminations/:id/approve`     | A     | Admin phê duyệt đơn `UNILATERAL` (UC-29). Chuyển `PENDING → CONFIRMED`, lưu `handledBy`, `handledAt`. Nếu `effectiveDate` đã tới/qua → kết thúc hợp đồng ngay. Báo Customer (kèm lý do, ngày hiệu lực) + Manager, gửi mail Customer. Lỗi: 400 "Admin chỉ phê duyệt đơn chấm dứt đơn phương"; 400 "Đơn chấm dứt này không còn ở trạng thái chờ duyệt"; 404 "Không tìm thấy đơn chấm dứt hợp đồng" |
| POST   | `/terminations/:id/reject`      | A     | Admin từ chối đơn `UNILATERAL` (UC-29). Body: `{ reason }` (bắt buộc). Chuyển `PENDING → REJECTED`, lưu `rejectReason`, báo Manager, hợp đồng vẫn `ACTIVE`. Lỗi: 400 "Admin chỉ từ chối đơn chấm dứt đơn phương"; 400 "Đơn chấm dứt này không còn ở trạng thái chờ duyệt"; 404 "Không tìm thấy đơn chấm dứt hợp đồng"; 422 "Vui lòng nhập lý do từ chối đơn chấm dứt" |
| POST   | `/terminations/:id/cancel`      | M     | Manager hủy đơn khi còn `PENDING` (UC-28, UC-29). Body: `{ reason }` (bắt buộc). Chuyển `PENDING → CANCELLED`, lưu `cancelledBy`, `cancelReason`, báo Customer. Lỗi: 400 "Chỉ có thể hủy đơn chấm dứt khi đang ở trạng thái chờ xử lý"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy đơn chấm dứt hợp đồng"; 422 "Vui lòng nhập lý do hủy đơn chấm dứt" |

### Chi tiết mẫu Request / Response (UC-28, UC-29)

#### `POST /api/contracts/:id/terminations` — UC-28, UC-29 (Role: M)
- **Request:** `{ "type": "MUTUAL", "reason": "Khách tốt nghiệp ra trường sớm", "effectiveDate": "2026-11-30", "note": "Bàn giao chìa khóa và thẻ từ lúc 10h" }`
- **Response 201:** `{ "success": true, "message": "Đã gửi đơn chấm dứt hợp đồng", "data": { "_id": "6727...", "contractId": "66f1...", "type": "MUTUAL", "reason": "Khách tốt nghiệp ra trường sớm", "effectiveDate": "2026-11-30T00:00:00.000Z", "note": "Bàn giao chìa khóa và thẻ từ lúc 10h", "status": "PENDING", "autoConfirmed": false, "requestedBy": "66e0..." } }`

#### `POST /api/terminations/:id/confirm` — UC-28 (Role: C)
- **Request:** `{ "agreed": true }`
- **Response 200:**
```json
{
  "success": true,
  "message": "Đã xác nhận điện tử đơn chấm dứt hợp đồng",
  "data": {
    "_id": "6727...",
    "status": "CONFIRMED",
    "autoConfirmed": false,
    "handledBy": "66f3...",
    "handledAt": "2026-11-03T10:30:00.000Z",
    "handledIp": "127.0.0.1",
    "signatureHash": "a1b2c3d4e5f6...",
    "signatureValid": true,
    "shortSignature": "A1B2C3D4E5F6",
    "signedBy": "Nguyễn Văn Đại Diện",
    "signedAt": "2026-11-03T10:30:00.000Z",
    "electronicConfirmation": {
      "statusText": "Đã xác nhận điện tử",
      "validityText": "Hợp lệ",
      "signedBy": "Nguyễn Văn Đại Diện",
      "signedAt": "2026-11-03T10:30:00.000Z",
      "handledIp": "127.0.0.1",
      "shortSignature": "A1B2C3D4E5F6"
    },
    "contractEndedImmediately": false
  }
}
```

## Cư dân – `occupant` (UC-30..33)

| Method | Path                       | Role | Ghi chú                                                                                                                                                                                                                                                             |
| ------ | -------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/occupants`               | M    | Danh sách cư dân trong tòa của Manager (UC-30). Query: `?roomId=&status=STAYED,LEFT&page=1&limit=10` (mặc định `status=STAYED` chỉ lấy cư dân đang ở thuộc hợp đồng `ACTIVE`; không bao giờ gồm cư dân của hợp đồng `DRAFT` hay `CANCELLED`). Trả 200 `{ items: [{ _id, contractId, userId, name, cccd, phone, dateOfBirth, address, relationship, isRepresentative, roleLabel, status, joinDate, exitDate, room: { _id, roomNumber, floorNumber, status } }], total, page, limit, totalPages }`. Lỗi: 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy phòng"; 422 "Giá trị lọc không hợp lệ" |
| GET    | `/me/room-members`         | C    | Customer (người đại diện) xem danh sách thành viên trong hợp đồng `ACTIVE` của mình (UC-30). Trả 200 `{ contractId, room: { _id, roomNumber, floorNumber, status, capacity }, items: [{ _id, name, cccd, phone, email?, dateOfBirth, address, relationship, isRepresentative, roleLabel, status, joinDate, exitDate, cccdFrontUrl, cccdBackUrl }] }` |
| GET    | `/occupants/:id`           | M C  | Chi tiết cư dân kèm link ảnh CCCD có chữ ký `cccdFrontUrl`, `cccdBackUrl` (UC-30). Chỉ Manager của tòa và người đại diện của hợp đồng đó gọi được. Lỗi: 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy cư dân" |
| PUT    | `/occupants/:id`           | M C  | Sửa thông tin cư dân (UC-31). Body: `{ name?, phone?, dateOfBirth?, address?, cccd?, relationship?, cccdFrontImage?, cccdBackImage? }`. Manager sửa mọi cư dân trong tòa mình (`DRAFT` hoặc `ACTIVE`, gồm cả `name` và `cccd` của đại diện = đổi tên đăng nhập; chỉ đổi trong hồ sơ cư dân, KHÔNG đổi `representativeCccd` của hợp đồng). Đại diện chỉ sửa người ở cùng trong HĐ `ACTIVE` của mình; gọi cho chính hồ sơ mình → chặn 400 "Thông tin của bạn vui lòng cập nhật ở trang Hồ sơ cá nhân". Kiểm tra CCCD đủ 12 chữ số (`CCCD_REGEX` / `isCccd`). Ghi log `UPDATE_OCCUPANT`. Lỗi: 400 "Thông tin của bạn vui lòng cập nhật ở trang Hồ sơ cá nhân"; 400 trùng CCCD trong phòng / CCCD thuộc tài khoản khác; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy cư dân"; 409 "Số điện thoại đã tồn tại trong hệ thống"; 422 "Số CCCD phải gồm đúng 12 chữ số" |
| POST   | `/contracts/:id/occupants` | M    | Thêm người ở cùng vào hợp đồng `ACTIVE` (UC-32). Body: `{ name, cccd, phone, dateOfBirth, address?, joinDate?, relationship?, cccdFrontImage?, cccdBackImage? }`. Tạo cư dân `isRepresentative: false`, `status: 'STAYED'`, ghi log `ADD_OCCUPANT`. Lỗi: 400 "Chỉ thêm được người ở cùng khi hợp đồng đang hiệu lực"; 400 "Phòng đã đạt sức chứa tối đa (X người)"; 400 "CCCD đã tồn tại trong danh sách cư dân của phòng"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy hợp đồng"; 409 "Số điện thoại đã tồn tại trong hệ thống"; 422 "Số CCCD phải gồm đúng 12 chữ số" |
| PATCH  | `/occupants/:id/leave`     | M    | Rút tên người ở cùng khỏi phòng (UC-33). Body: `{ exitDate?, note? }` (`exitDate` mặc định hôm nay, không trước `joinDate`). Chuyển cư dân sang `LEFT` + `exitDate`, không xóa bản ghi, ghi log `REMOVE_OCCUPANT`. Lỗi: 400 "Không thể xóa người đại diện theo luồng này — vui lòng dùng chấm dứt hợp đồng"; 400 "Người này đã chuyển đi"; 400 "Chỉ rút tên được người ở cùng khi hợp đồng đang hiệu lực"; 400 "Ngày chuyển ra không được trước ngày bắt đầu ở"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy cư dân" |

### Chi tiết mẫu Request / Response (UC-30, UC-31, UC-32, UC-33)

#### `GET /api/occupants?roomId=...&status=STAYED&page=1&limit=10` — UC-30 (Role: M)
- **Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách cư dân thành công",
  "data": {
    "items": [
      {
        "_id": "66f2...",
        "contractId": "66f1...",
        "userId": "66f3...",
        "name": "Nguyễn Văn Đại Diện",
        "cccd": "031204005476",
        "phone": "0987654321",
        "dateOfBirth": "2003-05-15T00:00:00.000Z",
        "address": "123 Cầu Giấy, Hà Nội",
        "relationship": null,
        "isRepresentative": true,
        "roleLabel": "Đại diện",
        "status": "STAYED",
        "joinDate": "2026-09-01T00:00:00.000Z",
        "exitDate": null,
        "room": { "_id": "66f0...", "roomNumber": "102", "floorNumber": 1, "status": "OCCUPIED" }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

#### `GET /api/occupants/:id` — UC-30 (Role: M, C)
- **Response 200:**
```json
{
  "success": true,
  "message": "Lấy chi tiết cư dân thành công",
  "data": {
    "_id": "66f2...",
    "contractId": "66f1...",
    "userId": null,
    "isRepresentative": false,
    "roleLabel": "Ở cùng",
    "name": "Trần Thị Bạn Cùng Phòng",
    "phone": "0988123456",
    "email": null,
    "dateOfBirth": "2003-08-20T00:00:00.000Z",
    "address": "456 Giải Phóng, Hà Nội",
    "cccd": "031203009999",
    "relationship": "Bạn cùng lớp",
    "status": "STAYED",
    "joinDate": "2026-09-01T00:00:00.000Z",
    "exitDate": null,
    "cccdFrontImage": "housify/cccd/front_abc",
    "cccdBackImage": "housify/cccd/back_abc",
    "cccdFrontUrl": "https://res.cloudinary.com/.../authenticated/s--...--/housify/cccd/front_abc",
    "cccdBackUrl": "https://res.cloudinary.com/.../authenticated/s--...--/housify/cccd/back_abc",
    "room": {
      "_id": "66f0...",
      "roomNumber": "102",
      "floorNumber": 1,
      "status": "OCCUPIED",
      "building": { "_id": "66d...", "name": "Housify Hòa Lạc", "address": "Hòa Lạc, Hà Nội" }
    },
    "contract": {
      "_id": "66f1...",
      "contractType": "GROUP",
      "status": "ACTIVE",
      "startDate": "2026-09-01T00:00:00.000Z",
      "endDate": "2027-08-31T23:59:59.999Z"
    }
  }
}
```

#### `GET /api/me/room-members` — UC-30 (Role: C)
- **Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách thành viên phòng thành công",
  "data": {
    "contractId": "66f1...",
    "room": { "_id": "66f0...", "roomNumber": "102", "floorNumber": 1, "status": "OCCUPIED", "capacity": 2 },
    "items": [
      {
        "_id": "66f2...",
        "name": "Nguyễn Văn Đại Diện",
        "cccd": "031204005476",
        "phone": "0987654321",
        "email": "customer@housify.vn",
        "isRepresentative": true,
        "roleLabel": "Đại diện",
        "status": "STAYED",
        "joinDate": "2026-09-01T00:00:00.000Z",
        "cccdFrontUrl": null,
        "cccdBackUrl": null
      }
    ]
  }
}
```

#### `PUT /api/occupants/:id` — UC-31 (Role: M, C)
- **Request:** `{ "name": "Trần Thị Minh", "phone": "0912345679", "dateOfBirth": "2003-08-20", "cccd": "001303012345", "relationship": "Em gái", "address": "Hà Nội" }`
- **Response 200:** `{ "success": true, "message": "Cập nhật thông tin cư dân thành công", "data": { "_id": "66f2...", "name": "Trần Thị Minh", "cccd": "001303012345", ... } }`

#### `POST /api/contracts/:id/occupants` — UC-32 (Role: M)
- **Request:** `{ "name": "Lê Hoàng Nam", "cccd": "001203056789", "phone": "0977112233", "dateOfBirth": "2003-04-12", "joinDate": "2026-10-01", "relationship": "Bạn học", "address": "Cầu Giấy, Hà Nội" }`
- **Response 201:** `{ "success": true, "message": "Thêm người ở cùng thành công", "data": { "_id": "66f9...", "isRepresentative": false, "status": "STAYED", ... } }`

#### `PATCH /api/occupants/:id/leave` — UC-33 (Role: M)
- **Request:** `{ "exitDate": "2026-11-01", "note": "Ra trường chuyển về quê" }`
- **Response 200:** `{ "success": true, "message": "Đã cập nhật danh sách cư dân. Hợp đồng không thay đổi, người đại diện vẫn giữ nguyên", "data": { "_id": "66f9...", "status": "LEFT", "exitDate": "2026-11-01T00:00:00.000Z", ... } }`

## Hóa đơn – `invoice` (UC-34..37)

| Method | Path                                | Role    | Ghi chú                                                                                                                                                                                            |
| ------ | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/invoices/prefill`                 | M       | `?contractId=&month=` → `{ contract, month, items[], warnings[], hasExistingInvoice, existingInvoiceId }`. `items[]` gợi ý: tiền phòng, điện nước kèm chỉ số cũ (`newReading: null`), phí cố định. Chỉ dịch vụ tòa đã đặt giá (UC-22); chưa có giá hiệu lực → giá 0 + cảnh báo "Chưa có đơn giá [X] cho tòa nhà này" (UC-34) |
| POST   | `/invoices/bulk`                    | M       | `{ contractIds[], month }` – tạo DRAFT hàng loạt, chỉ số mới tạm = chỉ số cũ, nhập sau (UC-34 A1). Trả `{ totalCreated, invoices[], errors[{ contractId, roomNumber?, message }], warnings[{ contractId, roomNumber, message }] }`. Phòng đã có hóa đơn DRAFT/PENDING cùng kỳ → bỏ qua, nằm trong `errors` |
| POST   | `/invoices`                         | M       | `{ contractId, month, items[], confirmDuplicate? }` – `items[]` lấy từ prefill, điền `newReading`, sửa `quantity` phí cố định, thêm dòng EXTRA `{ type: 'EXTRA', description, unitPrice }`. Server bỏ qua dòng RENT và `unitPrice`/`description` của METERED, FIXED do client gửi, tự lấy lại theo hợp đồng và bảng giá. Trả **hóa đơn** kèm `warnings[]`. Lỗi: 409 đã có hóa đơn DRAFT/PENDING cùng kỳ (gửi lại với `confirmDuplicate: true` để tạo thêm); 422 "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ" (`field: items.<i>.newReading`) (UC-34) |
| GET    | `/invoices`                         | M C     | `?status=&month=&roomId=&page=&limit=` → `{ items, total, page, limit, totalPages }`. Manager xem tòa mình (`roomId` tòa khác → 403); Customer xem hóa đơn các hợp đồng mình đại diện, chỉ hóa đơn đã từng gửi (ẩn DRAFT và hóa đơn hủy khi còn nháp). Mỗi hóa đơn có `isOverdue`, PAID có thêm `isPaidLate` (tính ra, không lưu) (UC-36) |
| GET    | `/invoices/:id`                     | M C     | Chi tiết hóa đơn, có `isOverdue` / `isPaidLate`. Manager xem tòa mình, Customer xem phòng mình; Customer xem hóa đơn chưa từng gửi → 403 (UC-36) |
| PUT    | `/invoices/:id`                     | M       | Chỉ khi DRAFT, body `{ items[] }` như POST. Đơn giá giữ nguyên như lúc lập (BR-058). Trả **hóa đơn** kèm `warnings[]`. Lỗi: 400 không phải DRAFT; 409 hóa đơn vừa bị đổi bởi thao tác khác (UC-34) |
| POST   | `/invoices/:id/send`                | M       | Sinh QR, chuyển PENDING, lưu `sentAt`, `dueDate` = lúc gửi + 7 ngày, gửi chuông + email kèm QR. Trả **hóa đơn** kèm `warning`: `null` khi gửi được, hoặc "Gửi thông báo thất bại — Customer chưa nhận được" (hóa đơn vẫn PENDING, FE hiện nút gửi lại). Lỗi: 400 không phải DRAFT / hợp đồng không ACTIVE; 409 hóa đơn vừa bị đổi; 500 chưa cấu hình tài khoản ngân hàng (UC-35) |
| POST   | `/invoices/:id/resend-notification` | M       | Gửi lại chuông và email kèm VietQR khi hóa đơn đang PENDING. Trả **hóa đơn** kèm `warning` như `/send` (UC-35) |
| POST   | `/invoices/:id/cancel`              | M       | `{ reason }` – bắt buộc lý do, chỉ khi DRAFT hoặc PENDING. Đang PENDING thì báo chuông cho Customer. Lỗi: 400 "Không thể hủy hóa đơn đã thanh toán"; 409 hóa đơn vừa bị đổi (UC-37) |

## Thanh toán – `payment` (UC-38, 39, 42)

| Method | Path                | Role | Ghi chú                                 |
| ------ | ------------------- | ---- | ---------------------------------------- |
| POST   | `/webhooks/sepay` | —   | xác thực bằng API key (`sepayAuth`) |
| GET    | `/payments`       | M C  | Lịch sử thanh toán, mới nhất trước (UC-39). Manager: tòa mình; Customer: mọi hợp đồng mình đại diện. Query: `?from=&to=&page=1&limit=10` (`from`, `to` là ngày trả YYYY-MM-DD theo giờ Việt Nam). Trả 200 `{ items: [{ _id, sepayTxnId, amount, bankName, transferContent, paidAt, statusLabel, invoice: { _id, invoiceCode, month, totalAmount, dueDate, status, roomNumber } }], total, page, limit, totalPages }` |

## Sự cố – `incident` (UC-43, 44)

| Method | Path                                                     | Role | Ghi chú                                 |
| ------ | -------------------------------------------------------- | ---- | ---------------------------------------- |
| POST   | `/incidents`                                           | C    | Gửi báo cáo sự cố (UC-43). Body: `{ type, title, description, images? }` – `images` là mảng đường dẫn công khai, tải trước qua `POST /uploads`. Trả 201 đơn vừa tạo `{ _id, incidentCode, contractId, roomId, reportedBy, type, title, description, images, status: 'PENDING', createdAt, updatedAt, warning? }` (`warning` khi gửi email cho Manager thất bại). Lỗi: 400 "Chỉ khách có hợp đồng đang hiệu lực mới gửi được báo cáo sự cố"; 422 thiếu loại / tiêu đề / mô tả |
| GET    | `/incidents`                                           | M C  | Danh sách đơn, mới nhất trước (UC-43, 44). Customer: đơn mình gửi; Manager: đơn tòa mình. Query: `?status=&type=&roomId=&from=&to=&page=1&limit=10` (`status`, `type` nhiều giá trị cách nhau dấu phẩy; `from`, `to` là ngày gửi YYYY-MM-DD; `limit` tối đa 50). Trả 200 `{ items: [{ _id, incidentCode, type, title, description, images, status, resultNote, resolvedAt, handledBy, createdAt, room: { _id, roomNumber, floorNumber }, reporter: { name, phone } }], total, page, limit, totalPages }`. Lỗi: 403 phòng thuộc tòa khác; 404 "Không tìm thấy phòng"; 422 "Giá trị lọc không hợp lệ" |
| GET    | `/incidents/:id`                                       | M C  | Chi tiết đơn (UC-43, 44). Trả 200 như 1 item ở danh sách, thêm `handledByName` và `history: [{ title, message, createdAt }]` (các thông báo cập nhật trạng thái đã gửi cho khách, cũ nhất trước). Lỗi: 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy đơn sự cố" |
| PATCH  | `/incidents/:id/accept` · `/resolve` · `/reject` | M    | Xử lý đơn (UC-44), mỗi lần đổi trạng thái khách nhận thông báo. `accept`: PENDING → IN_PROGRESS. `resolve`: IN_PROGRESS → RESOLVED, body `{ resultNote }`, lưu `resolvedAt`. `reject`: PENDING / IN_PROGRESS → REJECTED, body `{ resultNote }` là lý do. Trả 200 đơn sau khi đổi. Lỗi: 400 "Đơn đã được xử lý"; 400 "Đơn đang được xử lý" (accept khi đã tiếp nhận); 400 "Vui lòng tiếp nhận đơn trước khi đánh dấu đã giải quyết"; 403 "Bạn không có quyền thực hiện thao tác này"; 404 "Không tìm thấy đơn sự cố"; 422 thiếu `resultNote` |

## Dashboard – `dashboard` (UC-07, 47, 48)

| Method | Path                   | Role | Ghi chú                   |
| ------ | ---------------------- | ---- | -------------------------- |
| GET    | `/dashboard/admin`   | A    | Tổng quan toàn hệ thống hoặc một tòa (UC-07). Query: `?buildingId=`. Trả 200 `{ buildings, rooms: { total, available, occupied, maintenance }, monthlyRevenue, activeContracts, openIncidents, users, residents, movedIn, movedOut }`. Lỗi: 404 "Tòa nhà không tồn tại"; 422 sai `buildingId` |
| GET    | `/dashboard/manager` | M    | Tổng quan tòa mình (UC-47). Trả 200 `{ rooms: { total, available, occupied, maintenance }, pendingInvoices: { count, totalAmount, overdueCount }, openIncidents, expiringContracts, monthlyRevenue }` (`expiringContracts`: hợp đồng hết hạn trong 30 ngày tới; `openIncidents`: đơn Chờ tiếp nhận hoặc Đang xử lý). Lỗi: 403 "Bạn chưa được cấp quyền quản lý tòa nhà" |
| GET    | `/reports`           | A M  | Báo cáo theo kỳ (UC-48). Query: `?from=&to=&buildingId=` (`from`, `to` là YYYY-MM-DD giờ Việt Nam, bỏ trống là tháng hiện tại; tháng / quý / năm do FE đổi thành `from`, `to`; `buildingId` chỉ dùng cho Admin, Manager luôn là tòa mình). Trả 200 `{ from, to, totalRevenue, revenueByMonth: [{ month: 'YYYY-MM', revenue }], rooms: { total, available, occupied, maintenance, occupancyRate }, contracts: { new, ended }, latePayments: [{ _id, invoiceCode, month, roomNumber, amount, dueDate, overdueDays }] }` (`revenueByMonth` đủ mọi tháng trong kỳ; `latePayments` tính theo hiện tại, không phụ thuộc kỳ). Lỗi: 403 "Bạn chưa được cấp quyền quản lý tòa nhà"; 404 "Tòa nhà không tồn tại"; 422 sai định dạng hoặc ngày bắt đầu lớn hơn ngày kết thúc |

## OCR – `ocr` (làm nếu kịp)

| Method | Path          | Role | Ghi chú             |
| ------ | ------------- | ---- | -------------------- |
| POST   | `/ocr/cccd` | M C  | ảnh → `{ cccd }` |

## Dev – chỉ khi dev / demo (`devOnly`)

| Method | Path                    | Role | Ghi chú                                                                                                                                                                                          |
| ------ | ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/dev/jobs/:name/run` | A    | Chạy ngay 1 job tự động (`terminationReminder`, `terminationEffective`, `contractExpiry`, `accountAfterEnd`, `paymentReminder`). Trả 200 `{ jobName, executedAt, result }`. Lỗi: 404 "Không tìm thấy" (khi `ENABLE_DEV_ROUTES` tắt); 404 "Không tìm thấy job..." (sai `:name`); 403 không phải Admin |
| POST   | `/dev/sepay-simulate` | A    | `{ invoiceCode, amount }` giả lập webhook                                                                                                                                                     |

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
