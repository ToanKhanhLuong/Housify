# Cơ sở dữ liệu Housify – 18 collection

Nguồn: ERD nhóm vẽ trên drawdb (bản 14-10-2026) + các field bổ sung đã chốt (đánh dấu **(bổ sung)**, xem mục cuối).
Sơ đồ: `docs/housify-erd.puml` (ảnh `docs/housify-erd.png`).
Đây là **nguồn chuẩn** cho model. Muốn thêm collection / field / giá trị enum: hỏi nhóm và sửa file này trước, rồi mới sửa code.

## Quy ước

- `_id`: ObjectId tự sinh. Riêng `roles._id` là Number.
- Mọi collection có `createdAt`, `updatedAt` (`timestamps: true`).
- Cách đọc: `tên: Kiểu – giải thích`. Dấu `?` sau tên = không bắt buộc (được để trống). `→ x` = ObjectId tham chiếu collection `x`.
- Giá trị enum lưu **CHỮ IN HOA**, khai báo một lần trong `backend/src/constants/enums.js` (tên hằng ghi trong ngoặc, ví dụ `(USER_STATUS)`).
- Hằng số cấu hình (STK Admin, số ngày hạn hóa đơn, mốc nhắc) để ở `.env` / `src/constants`, **không lưu DB**.
- Xóa mềm: `buildings`, `rooms`, `room_types`, `services` có `isDeleted` (mặc định false). Mọi truy vấn danh sách phải lọc `isDeleted: false`.
- Các giá trị **tính ra, không lưu**: quá hạn hóa đơn (từ `dueDate`), đúng hạn / quá hạn thanh toán (`paidAt` so với `dueDate`), số người đang ở, "đang chờ chấm dứt", hạn tự xác nhận đơn chấm dứt (`createdAt` + 7 ngày), lúc xóa mềm và lúc giải quyết sự cố (`updatedAt`), Manager xử lý sự cố (`buildings.managerId` của tòa chứa phòng).

---

## A. Tài khoản

### 1. roles – vai trò (seed sẵn)

- `_id`: Number – 0 ADMIN, 1 MANAGER, 2 CUSTOMER `(ROLE)`
- `name`: String – tên vai trò

### 2. users – CHỈ tài khoản đăng nhập, không chứa hồ sơ

- `email`: String, unique – Admin/Manager đăng nhập bằng email; Customer dùng để nhận mail, quên mật khẩu
- `password?`: String – đã hash (BR-002); trống khi Manager chưa kích hoạt
- `roleId`: Number → roles
- `status`: Enum `(USER_STATUS)` – ACTIVE | INACTIVE | PENDING | LOCKED

Hồ sơ nằm ở: Admin → không có · Manager → `managers` · Customer → `occupants` (bản ghi đại diện).

Đăng nhập: Admin / Manager bằng email + mật khẩu. Customer bằng CCCD + mật khẩu → tìm `occupants` có `cccd` đó và `isRepresentative = true` → lấy `userId`.

Ý nghĩa `status`:

- PENDING: Manager chưa kích hoạt, chưa có mật khẩu.
- ACTIVE: đang hoạt động.
- INACTIVE: **chỉ Customer** – đã trả phòng (chấm dứt hai bên hoặc hết hạn), hệ thống đặt sau 24h (audit DEACTIVATE_USER). Thuê lại → ACTIVE (audit REACTIVATE_USER).
- LOCKED: Customer bị chấm dứt đơn phương, hoặc Admin khóa Manager. Lý do lưu ở `audit_logs` (LOCK_USER).

Thuê lại (UC-24, UC-06) – CCCD đã có tài khoản: ACTIVE / LOCKED → chặn tạo hợp đồng; INACTIVE → dùng lại user (đặt mật khẩu mới, cập nhật email, → ACTIVE).

### 3. managers – hồ sơ Manager (1-1 với users)

- `userId`: ObjectId → users, unique
- `name`: String – họ tên
- `phone`: String, unique – số điện thoại (BR-010)
- `cccd?`: String, unique sparse – trống thì **không ghi field** (đừng lưu `null`, sẽ trùng unique)
- `cccdFrontImage?`: String – đường dẫn ảnh CCCD mặt trước
- `cccdBackImage?`: String – đường dẫn ảnh CCCD mặt sau
- `dateOfBirth?`: Date – ngày sinh
- `address?`: String – địa chỉ

Admin nhập `name`, email, `phone` (UC-08). Manager tự điền **một lần** `cccd`, 2 ảnh, `dateOfBirth`, `address` (BR-011); sau đó chỉ Admin sửa (UC-09).

### 4. occupants – cư dân theo hợp đồng, mỗi người 1 hồ sơ

- `contractId`: ObjectId → contracts
- `userId?`: ObjectId → users – người đại diện có; người ở cùng để trống (BR-088)
- `isRepresentative`: Boolean – true = người đại diện; service luôn gán rõ
- `name`: String – họ tên
- `phone`: String – số điện thoại
- `dateOfBirth`: Date – ngày sinh
- `address?`: String – địa chỉ
- `cccd`: String – không trùng trong 1 hợp đồng; với đại diện là định danh đăng nhập
- `cccdFrontImage?`: String – ảnh CCCD mặt trước
- `cccdBackImage?`: String – ảnh CCCD mặt sau
- `status`: Enum `(OCCUPANT_STATUS)` – STAYED (đang ở) | LEFT (đã chuyển đi)
- `joinDate`: Date – ngày vào ở
- `exitDate?`: Date – ngày chuyển ra
- Hợp đồng nhóm: người ở cùng tạo ngay lúc DRAFT (STAYED, `joinDate = startDate`); người đại diện tạo lúc kích hoạt (UC-06).
- Khách thuê lại → bản ghi mới, cùng `cccd`, cùng `userId`.
- **"Đang ở"** = occupant STAYED thuộc hợp đồng ACTIVE.
- Xóa người ở cùng (UC-33) = LEFT + `exitDate`, không xóa bản ghi.

### 5. otp_tokens – OTP quên mật khẩu

- `userId`: ObjectId → users
- `otp`: String – lưu bản hash
- `status?`: Enum `(TOKEN_STATUS)` – trống = chưa dùng | USED | EXPIRED
- `expiresAt`: Date – lúc tạo + 5 phút (BR-007)

Gửi OTP mới → OTP cũ chưa dùng của user đó → EXPIRED.

### 6. activation_tokens – link mời Customer / kích hoạt Manager

- `type`: Enum `(ACTIVATION_TYPE)` – CUSTOMER_INVITE | MANAGER_ACTIVATION
- `contractId?`: ObjectId → contracts – có khi CUSTOMER_INVITE (UC-24, UC-06)
- `userId?`: ObjectId → users – có khi MANAGER_ACTIVATION (UC-08, UC-09)
- `token`: String, unique – lưu bản hash
- `sentTo`: String – email đã gửi
- `status?`: Enum `(TOKEN_STATUS)` – trống = còn dùng được | USED | EXPIRED
- `expiresAt`: Date – lúc tạo + 24h
- `createdBy`: ObjectId → users – người tạo link

Link dùng 1 lần. Gửi lại → link cũ EXPIRED. Hủy hợp đồng DRAFT → EXPIRED. Xóa Manager PENDING → xóa luôn token (UC-09 A3).

---

## B. Tòa nhà & phòng

### 7. buildings

- `name`: String, unique – tên tòa (BR-034)
- `address`: String – địa chỉ
- `images`: [String] – đường dẫn ảnh
- `floorCount`: Number – tổng số tầng, ≥ 1; danh sách "Tầng 1..n" sinh từ số này, **không có collection tầng** (UC-15)
- `rules?`: String – nội quy, một bản, lưu đè (UC-23, BR-060)
- `managerId?`: ObjectId → users – Manager phụ trách; unique khi có giá trị (1 Manager 1 tòa, BR-031)
- `isDeleted`: Boolean – mặc định false

### 8. rooms

- `buildingId`: ObjectId → buildings
- `floorNumber`: Number – tầng, từ 1 đến `buildings.floorCount`
- `roomTypeId`: ObjectId → room_types
- `roomNumber`: String – mã phòng; duy nhất trong tòa (BR-043), **không sửa sau khi tạo** (BR-046)
- `area`: Number – diện tích m²
- `images`: [String] – đường dẫn ảnh
- `capacity`: Number – sức chứa, ≥ 1
- `rentPrice`: Number – giá thuê niêm yết hiện tại, > 0
- `deposit`: Number – tiền cọc niêm yết hiện tại, > 0 (BR-045)
- `status`: Enum `(ROOM_STATUS)` – AVAILABLE | OCCUPIED; mới tạo luôn AVAILABLE
- `isDeleted`: Boolean – mặc định false

`status` **chỉ hệ thống** đổi: AVAILABLE → OCCUPIED khi kích hoạt hợp đồng (UC-06); OCCUPIED → AVAILABLE khi hợp đồng kết thúc (UC-28/29/45). Admin và Manager không đổi tay.

### 9. room_types – loại phòng dùng chung toàn hệ thống

- `name`: String, unique – BR-053
- `isDeleted`: Boolean – mặc định false

---

## C. Dịch vụ

### 10. services – danh mục dịch vụ dùng chung

- `name`: String, unique – BR-055
- `unit`: String – đơn vị, chỉ để hiển thị (kWh, m³, tháng, người…)
- `isFixed`: Boolean – true: phí cố định (gửi xe, máy giặt…); false: tính theo chỉ số (điện, nước)
- `isDeleted`: Boolean – mặc định false

Trên hóa đơn: `isFixed = false` → dòng METERED, `quantity = newReading − oldReading`. `isFixed = true` → dòng FIXED, `quantity` mặc định 1, Manager sửa được khi hóa đơn còn DRAFT.

### 11. service_prices – đơn giá theo tòa, có lịch sử

- `serviceId`: ObjectId → services
- `buildingId`: ObjectId → buildings
- `unitPrice`: Number – đơn giá, > 0
- `effectiveFrom`: Date – ngày bắt đầu áp dụng
- `createdBy`: ObjectId → users – Admin đặt giá

Lập hóa đơn → lấy bản ghi có `effectiveFrom` gần nhất và ≤ ngày lập (BR-057, helper `getCurrentPrice`). Cùng `effectiveFrom` → sửa bản ghi cũ, không tạo mới (UC-22 A1). Đổi giá không ảnh hưởng hóa đơn PENDING / PAID (BR-058).

---

## D. Hợp đồng

### 12. contracts

- `roomId`: ObjectId → rooms
- `contractType`: Enum `(CONTRACT_TYPE)` – SINGLE | GROUP
- `representativeCccd`: String – CCCD người đại diện Manager nhập lúc tạo; đối chiếu ở UC-06; khóa sau ACTIVE
- `representativeEmail`: String – email nhận link mời
- `startDate`: Date – ngày bắt đầu; khóa sau ACTIVE (BR-067)
- `endDate`: Date – `startDate` + số tháng; gia hạn chỉ dời ngày này (BR-070)
- `rentPrice`: Number – **snapshot** giá phòng lúc tạo (BR-062)
- `deposit`: Number – **snapshot** tiền cọc lúc tạo
- `status`: Enum `(CONTRACT_STATUS)` – DRAFT | ACTIVE | ENDED | CANCELLED
- `activatedAt?`: Date – lúc khách tích "Đồng ý điều khoản" và kích hoạt – bằng chứng BR-014
- `notes?`: String – ghi chú, điều khoản đặc biệt
- `createdBy`: ObjectId → users – Manager tạo
- `depositReceiverId?`: ObjectId → users – Manager nhận cọc, gán = `createdBy` lúc kích hoạt
- `depositRefundedAt?`: Date – lúc ghi nhận đã hoàn cọc (UC-45)
- `depositRefundedBy?`: ObjectId → users – Manager ghi nhận hoàn cọc (UC-45)

Vòng đời:

- **DRAFT**: chưa có hồ sơ đại diện, chỉ có `representativeCccd` / `representativeEmail`.
- **DRAFT → ACTIVE** (UC-06): 1 transaction – tạo / mở lại user, tạo occupant đại diện, hợp đồng ACTIVE, phòng OCCUPIED, token USED (BR-015).
- **Hủy DRAFT** (UC-46): 1 transaction – CANCELLED, token EXPIRED, người ở cùng → LEFT (không xóa), phòng giữ AVAILABLE; audit UPDATE_CONTRACT, lý do **tùy chọn**.
- **Đang có đơn chấm dứt**: hợp đồng **vẫn ACTIVE** đến ngày hiệu lực (UC-28, UC-29). Không có trạng thái "chờ chấm dứt".
- **ACTIVE → ENDED**: (a) đến `effectiveDate` của đơn chấm dứt CONFIRMED; (b) hết `endDate` mà không có đơn chấm dứt CONFIRMED (UC-45, job cuối ngày). Cả hai: 1 transaction – hợp đồng ENDED, phòng AVAILABLE, occupant STAYED → LEFT. Sau 24h tài khoản đại diện → INACTIVE (riêng đơn phương → LOCKED).
- **Hoàn cọc**: chỉ hợp đồng ENDED do hết hạn (không có đơn chấm dứt CONFIRMED), chỉ 1 lần (BR-130, BR-131).

### 13. termination_requests – đơn chấm dứt hợp đồng

- `contractId`: ObjectId → contracts
- `type`: Enum `(TERMINATION_TYPE)` – MUTUAL (hai bên) | UNILATERAL (đơn phương)
- `reason`: String – lý do, bắt buộc
- `effectiveDate`: Date – ngày chấm dứt hiệu lực
- `note?`: String – ghi chú bàn giao
- `status`: Enum `(TERMINATION_STATUS)` – PENDING | CONFIRMED | REJECTED | CANCELLED
- `autoConfirmed`: Boolean – true nếu hệ thống tự xác nhận sau 7 ngày, mặc định false
- `requestedBy`: ObjectId → users – Manager lập đơn
- `handledBy?`: ObjectId → users – Customer xác nhận (MUTUAL) hoặc Admin duyệt / từ chối (UNILATERAL)
- `handledAt?`: Date – lúc xác nhận / duyệt; cần để tính lại `signatureHash` (BR-077) **(bổ sung)**
- `signatureHash?`: String – hash(nội dung đơn + người xác nhận + `handledAt`); trống khi tự xác nhận
- `rejectReason?`: String – Admin từ chối (UNILATERAL)
- `cancelledBy?`: ObjectId → users – Manager hủy
- `cancelReason?`: String – bắt buộc khi hủy
- MUTUAL: Manager gửi → PENDING → Customer xác nhận → CONFIRMED; không xác nhận → nhắc ngày 1, 3, 6 → hết 7 ngày (từ `createdAt`) tự CONFIRMED, `autoConfirmed = true`. Manager hủy khi còn PENDING → CANCELLED.
- UNILATERAL: Manager gửi → PENDING → Admin CONFIRMED / REJECTED. Manager hủy trước khi duyệt → CANCELLED.
- Một hợp đồng chỉ có tối đa 1 đơn PENDING. Nội dung đơn khóa sau khi gửi (BR-076). Mọi đơn đều được lưu (BR-081).
- Các lần nhắc (BR-074) = các bản ghi `notifications` TERMINATION_REQUEST có `refId` là đơn này – không cần field riêng.

---

## E. Hóa đơn & thanh toán

### 14. invoices – hóa đơn tháng

- `invoiceCode`: String, unique – `HD` + YYMM + 4 ký tự in hoa ngẫu nhiên, ví dụ `HD2610K7QX` (chỉ chữ + số, không dấu `-`, BR-096); trùng thì sinh lại. Là nội dung chuyển khoản
- `contractId`: ObjectId → contracts
- `month`: String – kỳ hóa đơn `"YYYY-MM"`
- `items`: Array nhúng – các dòng tiền

  - `serviceId?`: ObjectId → services – trống với dòng RENT, EXTRA
  - `type`: Enum `(INVOICE_ITEM_TYPE)` – RENT (tiền phòng) | METERED (điện, nước theo chỉ số) | FIXED (phí cố định) | EXTRA (phát sinh)
  - `description`: String – tên khoản, **snapshot** lúc lập
  - `oldReading?`: Number – chỉ số cũ (METERED)
  - `newReading?`: Number – chỉ số mới, ≥ `oldReading`
  - `quantity`: Number – số lượng
  - `unitPrice`: Number – đơn giá **chốt lúc lập**
  - `amount`: Number – thành tiền = `quantity × unitPrice`, server tính
- `totalAmount`: Number – tổng `items.amount`, **server tính**, không nhận từ client (BR-095)
- `status`: Enum `(INVOICE_STATUS)` – DRAFT (nháp) | PENDING (đã gửi, chờ thanh toán) | PAID (đã thanh toán) | CANCELLED (đã hủy)
- `dueDate?`: Date – hạn thanh toán = `sentAt` + 7 ngày, hệ thống đặt lúc gửi; trống khi DRAFT
- `qrContent?`: String – nội dung QR VietQR, sinh lúc gửi
- `createdBy`: ObjectId → users – Manager lập
- `sentAt?`: Date – lúc gửi (BR-099)
- `paidAt?`: Date – lúc thanh toán
- `cancelReason?`: String – bắt buộc khi hủy (BR-103)
- Vòng đời: DRAFT (sửa được) → gửi → PENDING (sinh QR, khóa sửa) → tiền về → PAID. Sai sót → CANCELLED (từ DRAFT hoặc PENDING, không từ PAID).
- Các lần nhắc thanh toán (BR-128) = các bản ghi `notifications` PAYMENT_REMINDER có `refId` là hóa đơn này; job kiểm tra đã nhắc mốc đó chưa trước khi gửi.

### 15. payments – giao dịch SePay đã khớp hóa đơn

- `sepayTxnId`: String, unique – mã giao dịch SePay, chống xử lý trùng (BR-105)
- `invoiceId`: ObjectId → invoices
- `amount`: Number – số tiền nhận
- `transferContent`: String – nội dung chuyển khoản
- `bankName`: String – ngân hàng
- `paidAt`: Date – thời điểm giao dịch

Webhook: xác thực chữ ký → `sepayTxnId` đã có thì bỏ qua → tìm hóa đơn theo `invoiceCode` trong nội dung CK → khớp: lưu payment, hóa đơn PAID, báo Manager + Admin, email Customer. Chỉ lưu giao dịch đã khớp; hóa đơn đã PAID / CANCELLED → chỉ ghi log file trên server.

---

## F. Thông báo, sự cố, nhật ký

### 16. notifications – mỗi người nhận 1 bản ghi

- `userId`: ObjectId → users – người nhận
- `type`: Enum `(NOTIFICATION_TYPE)` – xem mục Enum
- `title`: String – tiêu đề
- `message`: String – nội dung
- `refId?`: ObjectId – id hóa đơn / hợp đồng / đơn chấm dứt / sự cố liên quan; FE dựa vào `type` + `refId` để mở đúng trang **(bổ sung)**
- `isRead`: Boolean – mặc định false; đã đọc tính riêng từng người (BR-113)
- `createdBy?`: ObjectId → users – người gửi; trống nếu hệ thống tạo

Thông báo không được xóa (BR-111). Tạo qua helper `notify()`, không tự `insert`.

### 17. incidents – báo cáo sự cố

- `incidentCode`: String, unique – mã đơn (BR-117)
- `contractId`: ObjectId → contracts
- `roomId`: ObjectId → rooms
- `reportedBy`: ObjectId → users – Customer gửi
- `type`: Enum `(INCIDENT_TYPE)` – EQUIPMENT (thiết bị) | VIOLATION (vi phạm)
- `title`: String
- `description`: String
- `images`: [String] – ảnh đính kèm
- `status`: Enum `(INCIDENT_STATUS)` – PENDING | IN_PROGRESS | RESOLVED | REJECTED
- `resultNote?`: String – kết quả hoặc lý do từ chối

Customer gửi → PENDING → Manager tiếp nhận IN_PROGRESS → RESOLVED / REJECTED. Mỗi lần đổi trạng thái gửi INCIDENT_UPDATE (có `refId`) – chuỗi thông báo này là lịch sử trạng thái (BR-117).

BR-120 (ghi nhận Manager xử lý và lúc giải quyết) không cần field riêng: mỗi tòa chỉ có 1 Manager nên người xử lý suy từ phòng → tòa → `managerId`; lúc giải quyết lấy `updatedAt` khi chuyển RESOLVED.

### 18. audit_logs – chỉ ghi thao tác không lưu vết ở collection khác

- `actorId?`: ObjectId → users – người làm; trống khi hệ thống tự chạy
- `action`: Enum `(AUDIT_ACTION)` – xem mục Enum
- `targetType`: String – tên collection bị tác động, ví dụ `"users"`, `"contracts"`
- `targetId`: ObjectId – id bản ghi bị tác động
- `reason?`: String – lý do; **bắt buộc khi LOCK_USER** (BR-029)
- `metadata?`: Object – giá trị trước / sau, thông tin thêm

Ghi qua helper `audit()`, không tự `insert`.

---

## Enum (`src/constants/enums.js`)

| Hằng                  | Giá trị                                | Dùng ở                                            |
| ---------------------- | ---------------------------------------- | --------------------------------------------------- |
| `ROLE`               | ADMIN = 0, MANAGER = 1, CUSTOMER = 2     | `roles._id`, `users.roleId`                     |
| `USER_STATUS`        | ACTIVE, INACTIVE, PENDING, LOCKED        | `users.status`                                    |
| `OCCUPANT_STATUS`    | STAYED, LEFT                             | `occupants.status`                                |
| `TOKEN_STATUS`       | USED, EXPIRED                            | `otp_tokens.status`, `activation_tokens.status` |
| `ACTIVATION_TYPE`    | CUSTOMER_INVITE, MANAGER_ACTIVATION      | `activation_tokens.type`                          |
| `ROOM_STATUS`        | AVAILABLE, OCCUPIED                      | `rooms.status`                                    |
| `CONTRACT_TYPE`      | SINGLE, GROUP                            | `contracts.contractType`                          |
| `CONTRACT_STATUS`    | DRAFT, ACTIVE, ENDED, CANCELLED          | `contracts.status`                                |
| `TERMINATION_TYPE`   | MUTUAL, UNILATERAL                       | `termination_requests.type`                       |
| `TERMINATION_STATUS` | PENDING, CONFIRMED, REJECTED, CANCELLED  | `termination_requests.status`                     |
| `INVOICE_ITEM_TYPE`  | RENT, METERED, FIXED, EXTRA              | `invoices.items.type`                             |
| `INVOICE_STATUS`     | DRAFT, PENDING, PAID, CANCELLED          | `invoices.status`                                 |
| `NOTIFICATION_TYPE`  | xem bên dưới                          | `notifications.type`                              |
| `INCIDENT_TYPE`      | EQUIPMENT, VIOLATION                     | `incidents.type`                                  |
| `INCIDENT_STATUS`    | PENDING, IN_PROGRESS, RESOLVED, REJECTED | `incidents.status`                                |
| `AUDIT_ACTION`       | xem bên dưới                          | `audit_logs.action`                               |

`NOTIFICATION_TYPE` (15):

| Giá trị             | Khi nào                                                                                                               | Người nhận            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| INVOICE_SENT          | gửi hóa đơn (UC-35)                                                                                                | Customer                 |
| INVOICE_CANCELLED     | hủy hóa đơn đang PENDING (UC-37)                                                                                  | Customer                 |
| PAYMENT_SUCCESS       | hóa đơn PAID (UC-42)                                                                                                | Customer, Manager, Admin |
| PAYMENT_REMINDER      | nhắc thanh toán (UC-49)                                                                                              | Customer                 |
| CONTRACT_RENEWED      | gia hạn (UC-27)                                                                                                       | Customer                 |
| CONTRACT_ENDED        | hợp đồng hết hạn tự kết thúc (UC-45)                                                                           | Customer, Manager        |
| DEPOSIT_REFUNDED      | Manager ghi nhận hoàn cọc (UC-45)                                                                                   | Customer                 |
| TERMINATION_REQUEST   | có đơn chấm dứt mới (UC-28 → Customer; UC-29 → Admin); **cũng dùng cho các lần nhắc ngày 1, 3, 6** | Customer / Admin         |
| TERMINATION_CONFIRMED | đơn được xác nhận / duyệt                                                                                      | Customer, Manager        |
| TERMINATION_REJECTED  | Admin từ chối đơn đơn phương (UC-29)                                                                           | Manager                  |
| TERMINATION_CANCELLED | Manager hủy đơn                                                                                                     | Customer                 |
| MANAGER_ASSIGNED      | được phân công tòa (UC-11)                                                                                       | Manager                  |
| MANAGER_UNASSIGNED    | bị gỡ / bị thay (UC-11)                                                                                             | Manager                  |
| INCIDENT_UPDATE       | có sự cố mới (UC-43 → Manager) **và** sự cố đổi trạng thái (UC-44 → Customer)                       | Manager / Customer       |
| ANNOUNCEMENT          | Manager gửi thông báo (UC-40) **và** Admin lưu nội quy mới (UC-23 → Manager)                             | Customer / Manager       |

`AUDIT_ACTION` (13):

| Giá trị                                           | Khi nào                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| LOCK_USER / UNLOCK_USER                             | Admin khóa / mở Manager (UC-10); hệ thống khóa Customer sau chấm dứt đơn phương                  |
| DEACTIVATE_USER / REACTIVATE_USER                   | Customer → INACTIVE sau trả phòng; thuê lại → ACTIVE (UC-06)                                          |
| ASSIGN_MANAGER / UNASSIGN_MANAGER                   | phân công / gỡ Manager (UC-11)                                                                           |
| RESEND_ACTIVATION / UPDATE_MANAGER / DELETE_MANAGER | UC-09                                                                                                       |
| UPDATE_CONTRACT                                     | sửa hợp đồng (UC-26), gia hạn (UC-27, metadata `endDate` cũ / mới), hủy hợp đồng nháp (UC-46) |
| ADD_OCCUPANT / UPDATE_OCCUPANT / REMOVE_OCCUPANT    | UC-32 / UC-31 / UC-33                                                                                       |

---

## Chỉ mục

Unique, khai báo trong Mongoose schema (`partial` = chỉ áp dụng khi `isDeleted: false`):

| Collection        | Field                                        | Ghi chú                                       |
| ----------------- | -------------------------------------------- | ---------------------------------------------- |
| users             | `email`                                    | BR-010, BR-019                                 |
| managers          | `userId`; `phone`; `cccd` (sparse)     |                                                |
| activation_tokens | `token`                                    |                                                |
| buildings         | `name`; `managerId`                      | `managerId`: chỉ khi có giá trị (BR-031) |
| rooms             | `{ buildingId, roomNumber }`               | partial (BR-043, BR-050)                       |
| room_types        | `name`                                     |                                                |
| services          | `name`                                     |                                                |
| service_prices    | `{ serviceId, buildingId, effectiveFrom }` |                                                |
| occupants         | `{ contractId, cccd }`                     |                                                |
| invoices          | `invoiceCode`                              |                                                |
| payments          | `sepayTxnId`                               | BR-105                                         |
| incidents         | `incidentCode`                             |                                                |

Kiểm tra trong service (trong transaction), **không** dùng index:

- BR-061: 1 phòng tối đa 1 hợp đồng DRAFT hoặc ACTIVE.
- BR-016: 1 CCCD chỉ gắn 1 tài khoản Customer.

---

## Đã chốt (14-10-2026)

Nguyên tắc: **cấu trúc dữ liệu theo ERD, luồng xử lý theo UC; ERD thiếu field mà UC cần thì bổ sung tối thiểu.**

Field bổ sung so với ERD drawdb – **chỉ 2**, vì bỏ đi thì mất hẳn một chức năng:

| Field                               | Bỏ thì mất gì                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `termination_requests.handledAt?` | Không tính lại được `signatureHash` → UC-28 bước 6 ("Ký lúc…", trạng thái "Hợp lệ") không làm được, `signatureHash` thành vô dụng |
| `notifications.refId?`            | Bấm thông báo trên chuông không mở được đơn / hóa đơn (UC-28 bước 3, UC-41)                                                                  |

Những field khác UC có nhắc nhưng **không thêm**, vì suy ra được hoặc không dùng vào việc gì: mô tả tòa nhà; `deletedAt` (dùng `updatedAt`); quan hệ với người đại diện (chỉ là chữ hiển thị, không chặn gì); người xử lý và lúc giải quyết sự cố (suy ra, xem mục 17); IP lúc ký đơn chấm dứt.

Chỗ UC và ERD khác nhau:

| Chỗ                                                                                  | Chốt                                                                              |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Phòng bảo trì (UC-17 A2)                                                           | ERD không có MAINTENANCE → **không làm**                                |
| Loại sự cố: UC-43 có 4 loại                                                      | Theo ERD: EQUIPMENT, VIOLATION                                                     |
| Mã hóa đơn: UC-34 ví dụ `HD-P101-202610`                                      | `HD2610K7QX` – một phòng có thể có nhiều hóa đơn cùng kỳ (UC-34 E02) |
| Hủy hợp đồng nháp: UC-46 xóa người ở cùng                                   | Chuyển LEFT, không xóa                                                          |
| Lý do hủy hợp đồng nháp                                                         | Tùy chọn (UC-46)                                                                 |
| Đang có đơn chấm dứt                                                            | Hợp đồng giữ ACTIVE (UC-28, UC-29)                                             |
| Hợp đồng hết hạn                                                                 | Theo UC-45: tự kết thúc + hoàn cọc                                            |
| Không có loại thông báo riêng cho nhắc chấm dứt, sự cố mới, nội quy mới | Dùng chung TERMINATION_REQUEST, INCIDENT_UPDATE, ANNOUNCEMENT                     |
| Không có action riêng cho gia hạn, hủy nháp                                     | Dùng UPDATE_CONTRACT                                                              |
| Webhook SePay sai số tiền                                                           | Không xử lý – QR đã cố định số tiền                                     |
