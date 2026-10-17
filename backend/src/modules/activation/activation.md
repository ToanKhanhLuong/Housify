
# Module activation

> Xử lý mọi link kích hoạt gửi qua email. **UC-08 (bước 6–8)** cho Manager và **UC-06** cho Customer.
> Module này chỉ **dùng** link. Việc **tạo và gửi** link nằm ở module `manager` (UC-08, UC-09) và `contract` (UC-24).

**Người làm:** BE An và FE Hưng · 

Iter 1 (Manager)

Iter 2 (Customer)

---

## Quy tắc chung của link

- Mỗi link sống **24 giờ** và dùng được **một lần**.
- Link Manager gắn với đúng một tài khoản. Link Customer gắn với đúng một hợp đồng.
- Gửi lại link mới thì link cũ hết hiệu lực ngay.
- Link chứa một mã bí mật. Hệ thống chỉ lưu bản mã hóa của mã đó, nên người đọc được cơ sở dữ liệu cũng không dựng lại được link.
- Mở link không hợp lệ thì báo đúng lý do:
  - **Hết hạn:** quá 24 giờ.
  - **Đã dùng:** đã kích hoạt rồi.
  - **Không tồn tại:** tài khoản đã bị xóa, hoặc hợp đồng đã bị hủy.

---

## UC-08 (bước 6–8) · Manager kích hoạt tài khoản

**Ai dùng:** Manager vừa được Admin tạo tài khoản, chưa đăng nhập

**Luồng chính**

1. Manager bấm nút "Kích hoạt tài khoản" trong email.
2. Hệ thống kiểm tra link → hiện trang đặt mật khẩu: mật khẩu, xác nhận mật khẩu.
3. Manager nhập và bấm "Kích hoạt".
4. Hệ thống kiểm tra mật khẩu → lưu dạng mã hóa → tài khoản chuyển từ **Chưa kích hoạt** sang **Đang hoạt động** → link hết hiệu lực.
5. Chuyển về trang đăng nhập. Manager đăng nhập bằng email và mật khẩu vừa đặt.

**Các trường hợp**

- **Link hết hạn:** báo "Link đã hết hạn". Manager liên hệ Admin gửi lại ở UC-09.
- **Link đã dùng:** báo tài khoản đã kích hoạt, mời đăng nhập.
- **Tài khoản đã bị Admin xóa:** báo "Link không tồn tại".
- **Mật khẩu không đạt hoặc không khớp phần xác nhận:** báo lỗi, nhập lại.
- **Kích hoạt xong nhưng chưa được phân công tòa:** đăng nhập được, nhưng chỉ dùng được hồ sơ cá nhân, đổi mật khẩu, thông báo, đăng xuất. Các mục khác báo "Bạn chưa được cấp quyền quản lý tòa nhà".

**Quy tắc**

- Mật khẩu tối thiểu **6 ký tự**, có cả **chữ lẫn số** (như UC-03).
- Admin không đặt và không biết mật khẩu của Manager. Chỉ Manager tự đặt qua link này.
- Chỉ sau khi kích hoạt, Manager mới **được phân công tòa** (UC-11).

---

## UC-06 · Customer kích hoạt tài khoản và xác nhận hợp đồng

**Ai dùng:** khách thuê (người đại diện của hợp đồng), chưa có tài khoản hoặc là khách cũ quay lại

Đây là bước **gộp** hai việc: tạo tài khoản khách và xác nhận hợp đồng. Hợp đồng chỉ có hiệu lực khi chính khách tự xác minh và đồng ý điều khoản.

**Điều kiện trước**

- Manager đã tạo hợp đồng nháp cho một phòng đang trống, đã nhập CCCD và email của khách (UC-24).
- Link mời còn hiệu lực.

**Màn hình gồm hai phần**

- **Bên trái, chỉ xem:** thông tin hợp đồng gồm phòng, ngày bắt đầu, thời hạn, giá thuê, tiền cọc.
- **Bên phải, khách nhập:** họ tên, số điện thoại, ngày sinh, địa chỉ, mật khẩu, xác nhận mật khẩu, ảnh CCCD mặt trước và mặt sau.

**Luồng chính**

1. Khách bấm link trong email → hệ thống kiểm tra link → hiện màn hình hai phần.
2. Khách điền thông tin và tải ảnh CCCD.
3. Khách tích ô **"Đồng ý điều khoản hợp đồng"**.
4. Khách bấm "Xác nhận".
5. Hệ thống thực hiện **cùng lúc** các thay đổi bên dưới.
6. Gửi email "Xác nhận thành công" và hiện màn hình hoàn tất.

**Khi bấm "Xác nhận", trong một lần duy nhất**

- Tạo tài khoản khách, dùng **CCCD làm định danh đăng nhập**, email lấy theo email Manager đã nhập. Khách cũ có tài khoản đang ngưng hoạt động thì **mở lại tài khoản cũ** và đặt mật khẩu mới, không tạo tài khoản mới.
- Tạo hồ sơ cư dân cho người đại diện, ngày vào ở là ngày bắt đầu hợp đồng.
- Hợp đồng chuyển từ **Nháp** sang **Đang hiệu lực**, ghi lại thời điểm khách xác nhận.
- Phòng chuyển từ **Trống** sang **Đang thuê**.
- Link mời hết hiệu lực.

Thành công cả năm việc hoặc
