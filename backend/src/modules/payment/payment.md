# Module payment

> Thanh toán hóa đơn qua QR và SePay, lịch sử thanh toán, thông báo thanh toán thành công, nhắc thanh toán tự động. **UC-38, UC-39, UC-42, UC-49.**


Mã QR trên hóa đơn do module `invoice` sinh và hiển thị.

**Quyền**

- **Customer:** trả tiền, xem lịch sử thanh toán của phòng mình.
- **Manager:** xem lịch sử thanh toán của tòa mình.
- **SePay:** gọi vào hệ thống báo có tiền về, xác thực bằng khóa API, không cần đăng nhập.

---

## Tiền đi thế nào

```
Khách quét QR ──▶ App ngân hàng chuyển khoản ──▶ Tài khoản ngân hàng của Admin
                                                          │
                                         SePay phát hiện giao dịch mới
                                                          │
                                                          ▼
                                    SePay báo cho Housify ──▶ Hóa đơn chuyển Đã thanh toán
```

- Tiền chuyển **thẳng vào tài khoản ngân hàng của Admin**, không đi qua Housify, không qua Manager.
- SePay **chỉ phát hiện giao dịch và báo** cho Housify.

---

## UC-38 · Thanh toán hóa đơn qua QR SePay

**Ai dùng:** Customer · Hệ thống

**Luồng chính**

1. Khách mở hóa đơn **Chờ thanh toán**, quét mã QR bằng app ngân hàng.
2. App ngân hàng tự điền **số tài khoản Admin, số tiền, nội dung là mã hóa đơn**.
3. Khách xác nhận chuyển khoản trong app. Tiền về tài khoản Admin.
4. SePay phát hiện giao dịch mới, báo cho Housify.
5. Hệ thống kiểm tra:
   - Lời báo đúng là từ SePay.
   - Giao dịch này **chưa từng xử lý**.
   - Tìm hóa đơn theo **mã hóa đơn trong nội dung chuyển khoản**.
6. Khớp → **cùng một lần**: lưu giao dịch, hóa đơn chuyển **Đã thanh toán**, lưu thời điểm thanh toán.
7. Gửi email xác nhận cho khách, gửi thông báo cho Manager và Admin (UC-42).

**Các trường hợp**

- **SePay báo trùng một giao dịch** (gửi lại lần hai): đã xử lý rồi thì **bỏ qua hoàn toàn**.
- **Lời báo không xác thực được:** từ chối, **không cập nhật gì**.
- **Hóa đơn đã thanh toán hoặc đã hủy** khi tiền về: không xử lý, chỉ ghi log. Khoản tiền đó Admin tự xử lý ngoài hệ thống.
- **Nội dung chuyển khoản không chứa mã hóa đơn nào** (tiền khác chuyển vào tài khoản Admin): bỏ qua, ghi log.
- **SePay không báo về** (lỗi mạng): giao dịch chưa được ghi nhận, hóa đơn vẫn Chờ thanh toán.

**Quy tắc**

- Khách **không sửa được số tiền** trong QR, số tiền cố định bằng tổng hóa đơn.
- **Mỗi giao dịch SePay chỉ xử lý một lần**, nhờ mã giao dịch là duy nhất.
- Chỉ lưu giao dịch **đã khớp** với hóa đơn.

**Khi test:** dùng chức năng giả lập SePay trong module `dev` để bắn lời báo tiền về, không cần chuyển khoản thật.

---

## UC-39 · Xem lịch sử thanh toán

**Ai dùng:** Customer · Manager

**Luồng chính**

1. Vào mục "Lịch sử thanh toán".
2. Hiện danh sách hóa đơn theo thời gian: **kỳ tháng, phòng** (với Manager), **tổng tiền, trạng thái** (Đã thanh toán / Chờ thanh toán / Đã hủy), **tình trạng** (Đúng hạn / Quá hạn X ngày).
3. Chọn một hóa đơn → các khoản chi tiết và **các giao dịch thanh toán liên quan**: mã SePay, ngày, số tiền.
4. Lọc theo **khoảng thời gian**.

**Các trường hợp**

- **Chưa có lịch sử:** báo *"Chưa có lịch sử thanh toán nào"*.
- **Customer xem lịch sử phòng khác:** từ chối, báo không có quyền.

**Quy tắc**

- Customer chỉ xem lịch sử phòng mình. Manager chỉ xem tòa mình.
- **Đúng hạn / Quá hạn X ngày** được tính từ ngày thanh toán so với hạn thanh toán, không lưu.

---

## UC-42 · Thông báo thanh toán thành công

**Ai dùng:** Hệ thống tự chạy ngay khi hóa đơn chuyển Đã thanh toán.

**Gửi cho ai, nội dung gì**

| Người nhận                 | Kênh                       | Nội dung                                                                   |
| ----------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| **Manager** của phòng | Chuông                     | *"Phòng [X] đã thanh toán hóa đơn kỳ [tháng] — [Y]đ"*          |
| **Admin**               | Chuông                     | *"Giao dịch [Z]đ về tài khoản — hóa đơn [mã] đã thanh toán"* |
| **Customer**            | Chuông **và email** | *"Hóa đơn [mã] kỳ [tháng] đã thanh toán thành công — [Y]đ"*  |

**Các trường hợp**

- **Lỗi gửi thông báo hoặc email:** ghi log, hóa đơn **vẫn Đã thanh toán**, có thể gửi lại.

**Quy tắc**

- Chuông luôn gửi cho cả **Customer, Manager và Admin**. Customer nhận thêm email.
- Nội dung phải ghi rõ: **tên phòng, kỳ hóa đơn, số tiền, thời điểm thanh toán, đúng hạn hay quá hạn X ngày**.

---

## UC-49 · Nhắc thanh toán tự động

**Ai dùng:** Hệ thống tự chạy **mỗi ngày**.

**Luồng chính**

1. Quét toàn bộ hóa đơn **Chờ thanh toán**, so ngày hôm nay với hạn thanh toán.
2. Hôm nay trùng một **mốc nhắc** → gửi **thông báo và email** cho người đại diện, kèm **QR và số tiền**.
3. Ghi lại lần nhắc để không gửi trùng.

**Các mốc nhắc**

| Mốc                 | Khi nào                                                           |
| -------------------- | ------------------------------------------------------------------ |
| Trước hạn 3 ngày | Hạn − 3 ngày                                                    |
| Trước hạn 1 ngày | Hạn − 1 ngày                                                    |
| Đúng hạn          | Ngày hết hạn                                                    |
| Sau hạn             | **Cứ mỗi 3 ngày** một lần, cho tới khi trả hoặc hủy |

**Các trường hợp**

- **Khách đã trả trước mốc kế tiếp:** dừng nhắc hóa đơn đó.
- **Hóa đơn bị hủy:** dừng nhắc.
- **Gửi email lỗi:** chuông vẫn tạo, ghi log lỗi, có thể gửi lại.

**Quy tắc**

- **Chỉ nhắc** hóa đơn Chờ thanh toán. Đã thanh toán hoặc đã hủy thì dừng ngay.
- **Mỗi mốc chỉ nhắc một lần** cho mỗi hóa đơn. Mọi lần nhắc đều được lưu lại, chính là các thông báo "nhắc thanh toán" gắn với hóa đơn đó.
- Các mốc nhắc để trong cấu hình, đổi được mà không sửa code.
