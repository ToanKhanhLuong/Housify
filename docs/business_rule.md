# Quy tắc nghiệp vụ

Bản tóm tắt để code. Chi tiết đầy đủ nằm trong file use case (docx) của nhóm, dữ liệu xem `docs/database.md`.

## Vòng đời trạng thái

**Phòng** `AVAILABLE ↔ MAINTENANCE` (Admin sửa tay, UC-17) · `AVAILABLE → OCCUPIED` (khách kích hoạt hợp đồng) · `OCCUPIED → AVAILABLE` (hợp đồng ENDED). Admin không chọn được OCCUPIED, Manager không đổi được trạng thái phòng.

**Hợp đồng** `DRAFT → ACTIVE` (UC-06) · `DRAFT → CANCELLED` (UC-46) · `ACTIVE → ENDED` (chấm dứt UC-28/29 hoặc hết hạn UC-45)

**Có đơn chấm dứt** hợp đồng vẫn `ACTIVE` đến ngày hiệu lực – không có trạng thái "chờ chấm dứt" (UC-28, 29)

**Cư dân** `STAYED → LEFT` (người ở cùng chuyển đi UC-33, hoặc hợp đồng ENDED)

**Tài khoản Customer** `ACTIVE → INACTIVE` (24h sau khi kết thúc do thỏa thuận / hết hạn) · `ACTIVE → LOCKED` (24h sau khi kết thúc do đơn phương) · `INACTIVE → ACTIVE` (khách cũ thuê lại). Tài khoản LOCKED không được tạo hợp đồng mới.

**Tài khoản Manager** `PENDING → ACTIVE` (đặt mật khẩu) · `ACTIVE ↔ LOCKED` (UC-10) · PENDING thì được xóa cứng (UC-09)

**Hóa đơn** `DRAFT → PENDING` (gửi) → `PAID` (SePay) · `DRAFT/PENDING → CANCELLED`

**Đơn chấm dứt** `PENDING → CONFIRMED / REJECTED / CANCELLED`. MUTUAL: Customer xác nhận, không xác nhận thì nhắc ngày 1, 3, 6 và tự CONFIRMED sau 7 ngày. UNILATERAL: Admin duyệt hoặc từ chối. Mỗi hợp đồng tối đa 1 đơn PENDING.

**Sự cố** `PENDING → IN_PROGRESS → RESOLVED` · `PENDING/IN_PROGRESS → REJECTED`

## Bắt buộc dùng transaction

| Thao tác                                     | Ghi vào                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| Khách kích hoạt hợp đồng (UC-06)        | users, occupants, contracts, rooms, activation_tokens                         |
| Đến ngày hiệu lực chấm dứt / hết hạn | contracts, rooms, occupants                                                   |
| Phân công / thay Manager (UC-11)            | buildings                                                                     |
| Xóa tòa (UC-14)                             | buildings + toàn bộ rooms                                                   |
| Hủy hợp đồng nháp (UC-46)                | contracts, activation_tokens, occupants (người ở cùng → LEFT, giữ lại) |
| Tạo Manager (UC-08)                          | users, managers, activation_tokens                                            |
| Xóa Manager PENDING (UC-09)                  | users, managers, activation_tokens, buildings (gỡ `managerId`)             |

## Snapshot – không đọc lại giá mới

- Hợp đồng chụp `rentPrice`, `deposit` từ phòng lúc tạo (BR-062).
- Hóa đơn chụp `description`, `unitPrice` từng dòng lúc lập. Đổi giá dịch vụ không ảnh hưởng hóa đơn đã lập (BR-058).
- Hợp đồng giữ nguyên CCCD, email người đại diện lúc tạo. Khách đổi email, SĐT trong hồ sơ thì hợp đồng không đổi.

## Tiền

- Tổng hóa đơn = tiền phòng + điện + nước + phí cố định + phát sinh, **server tự tính** (BR-095).
- Đơn giá dịch vụ: bản ghi có `effectiveFrom` gần nhất và ≤ ngày lập hóa đơn (BR-057).
- Đúng hạn / quá hạn tính lúc trả về, **không lưu DB** (BR-101).
- **Cọc**: hợp đồng có đơn chấm dứt CONFIRMED (cả MUTUAL lẫn UNILATERAL) thì **không hoàn cọc**, bất kể ngày hiệu lực rơi vào đâu, kể cả trùng `endDate` (BR-073). Chỉ hợp đồng đi hết thời hạn mà không ai lập đơn mới được hoàn — hoàn đủ số ghi trên hợp đồng, bằng tiền mặt, ghi nhận một lần (BR-130, 131). Hư hỏng thu qua dòng phát sinh trên hóa đơn cuối, không trừ vào cọc.
- Điều kiện kiểm trong code: **có bản ghi `termination_requests` CONFIRMED hay không** — không so ngày, không chỉ xem `contract.status`.
- Webhook SePay: một `sepayTxnId` chỉ xử lý một lần (BR-105).

## Phạm vi theo role

- Manager chỉ thấy dữ liệu tòa mình phụ trách – kiểm ở **service**, không chỉ ẩn ở FE.
- Manager chưa được phân công tòa chỉ dùng được Hồ sơ, Đổi mật khẩu, Thông báo, Đăng xuất (BR-023).
- Customer chỉ thấy hợp đồng, hóa đơn, sự cố của phòng mình.
- Mỗi tòa tối đa 1 Manager, mỗi Manager tối đa 1 tòa (BR-030, 031).
- Mỗi phòng tối đa 1 hợp đồng DRAFT hoặc ACTIVE (BR-061).

## Thông báo

Ai bị ảnh hưởng thì phải được báo (chuông, kèm mail khi UC yêu cầu). Mail gửi qua `sendMail()` (Brevo API). Gửi mail lỗi **không** làm hỏng thao tác chính – chỉ cảnh báo.

## Xóa

- Xóa mềm: `buildings`, `rooms` (có `deletedAt`), `room_types`, `services`. Mọi danh sách lọc `isDeleted: false`.
- Xóa cứng: chỉ tài khoản Manager PENDING (UC-09). Người ở cùng của hợp đồng nháp bị hủy chuyển LEFT, giữ lại (UC-46).
- Lịch sử (hợp đồng, hóa đơn, đơn chấm dứt, thông báo) **không bao giờ xóa**.

## Luồng chính

1. **Dựng hệ thống** (Admin): tạo tòa, số tầng, phòng → loại phòng, dịch vụ → giá dịch vụ theo tòa → nội quy → tạo Manager (Manager tự kích hoạt qua link) → phân công Manager vào tòa.
2. **Cho thuê** (Manager → Customer): chọn phòng AVAILABLE → tạo hợp đồng DRAFT, kèm người ở cùng nếu là hợp đồng nhóm → hệ thống gửi link mời 24h → khách mở link, điền thông tin, đặt mật khẩu, tích đồng ý → 1 transaction: tạo hoặc mở lại tài khoản, tạo cư dân đại diện, hợp đồng ACTIVE, phòng OCCUPIED. Khách không kích hoạt thì Manager gửi lại link hoặc hủy hợp đồng nháp.
3. **Trong thời gian thuê** (lặp hằng tháng): Manager lập hóa đơn DRAFT → gửi (PENDING, sinh QR, hạn = lúc gửi + 7 ngày) → khách quét QR → SePay webhook → PAID, báo Customer + Manager + Admin. Song song: thêm / bớt người ở cùng, sửa và gia hạn hợp đồng, báo và xử lý sự cố, Manager gửi thông báo.
4. **Kết thúc** – 1 trong 3 đường, đường nào cũng kết thúc bằng 1 transaction: hợp đồng ENDED, phòng AVAILABLE, cư dân LEFT.
   - **MUTUAL**: Manager lập đơn → Customer xác nhận (hoặc tự xác nhận sau 7 ngày) → đến ngày hiệu lực thì ENDED → 24h sau tài khoản INACTIVE. **Mất cọc.**
   - **UNILATERAL**: Manager lập đơn → Admin duyệt → đến ngày hiệu lực thì ENDED → 24h sau tài khoản LOCKED. **Mất cọc.**
   - **Hết hạn**: không có đơn CONFIRMED, cuối ngày `endDate` thì ENDED → 24h sau tài khoản INACTIVE → Manager ghi nhận hoàn cọc (1 lần, bắt buộc gửi email).
5. **Thuê lại**: khách INACTIVE quay lại → Manager tạo hợp đồng mới bằng CCCD cũ → lúc kích hoạt mở lại chính tài khoản cũ. Khách LOCKED bị chặn từ bước tạo hợp đồng.

## Job tự động (`src/jobs/`, chạy hằng ngày)

| Job                      | Làm gì                                                                                                              | UC            | Module      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| `terminationReminder`  | Đơn MUTUAL đang PENDING: nhắc ngày 1, 3, 6; đủ 7 ngày thì CONFIRMED, `autoConfirmed = true`                | UC-28         | termination |
| `terminationEffective` | Đơn CONFIRMED đã đến `effectiveDate` → kết thúc hợp đồng                                                | UC-28, 29     | termination |
| `contractExpiry`       | Hợp đồng ACTIVE hết `endDate`, không có đơn CONFIRMED → kết thúc hợp đồng, báo đại diện + Manager | UC-45         | contract    |
| `accountAfterEnd`      | Hợp đồng ENDED quá 24h → tài khoản đại diện INACTIVE (MUTUAL, hết hạn) hoặc LOCKED (UNILATERAL)          | UC-28, 29, 45 | contract    |
| `paymentReminder`      | Hóa đơn PENDING: nhắc trước hạn 3 ngày, 1 ngày, đúng ngày hạn, sau đó mỗi 3 ngày                     | UC-49         | invoice     |

Test không cần đợi: `POST /api/dev/jobs/:name/run`. Job lỗi giữa chừng thì lần quét sau chạy lại, nên mọi job phải **chạy lại nhiều lần vẫn không sinh trùng**: kiểm trạng thái trước khi đổi, kiểm đã nhắc mốc đó chưa trước khi gửi.
