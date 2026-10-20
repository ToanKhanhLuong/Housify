# Module manager

> Vòng đời tài khoản Manager: tạo, xem, sửa, khóa, phân công tòa nhà. **UC-08 (bước 1–5), UC-09, UC-10, UC-11.**
> Phần Manager bấm link tự đặt mật khẩu (UC-08 bước 6–8) nằm ở module `activation`.

**Người làm:** BE An · FE Hưng · Iter 1
**Quyền:** chỉ Admin. Manager và Customer không truy cập được chức năng nào ở đây.

---

## Ba trạng thái của tài khoản

| Trạng thái                 | Nghĩa là gì                  | Admin làm được gì                                 |
| ---------------------------- | ------------------------------- | ------------------------------------------------------ |
| **Chưa kích hoạt**  | Đã tạo, chưa có mật khẩu | Gửi lại link · Xóa tài khoản                     |
| **Đang hoạt động** | Dùng bình thường            | Sửa thông tin · Khóa · **Phân công tòa** |
| **Bị khóa**          | Không đăng nhập được     | Sửa thông tin · Mở khóa                           |

**Chỉ tài khoản Đang hoạt động mới được phân công tòa.** Thứ tự bắt buộc là tạo tài khoản → Manager kích hoạt → mới gán tòa.

---

## UC-08 (bước 1–5) · Tạo tài khoản Manager

**Ai dùng:** Admin

**Luồng chính**

1. Admin điền **họ tên, email, số điện thoại** (cả ba bắt buộc).
2. Hệ thống kiểm tra email và số điện thoại chưa thuộc về ai khác.
3. Tạo tài khoản ở trạng thái **Chưa kích hoạt**, chưa có mật khẩu, chưa phụ trách tòa nào.
4. Sinh link kích hoạt (24 giờ, dùng một lần) và tự gửi email cho Manager.
5. Báo tạo thành công, danh sách cập nhật.

**Nội dung email:** tên hệ thống Housify, email đăng nhập, nút "Kích hoạt tài khoản", thời hạn 24 giờ. **Không chứa mật khẩu.**

**Các trường hợp**

- **Email hoặc số điện thoại đã có người dùng:** từ chối, báo rõ trường nào trùng.
- **Thiếu thông tin hoặc sai định dạng:** báo lỗi từng trường, không lưu.
- **Gửi email lỗi:** tài khoản **vẫn được tạo** và vẫn Chưa kích hoạt. Báo Admin biết để vào danh sách gửi lại.
- **Lỗi lưu cơ sở dữ liệu:** không tạo tài khoản, báo lỗi hệ thống.
- **Admin bấm Hủy:** không tạo gì.

**Quy tắc**

- Admin **không đặt và không biết** mật khẩu của Manager. Chỉ Manager tự đặt qua link.
- Email là duy nhất trong toàn hệ thống.
- Số điện thoại chỉ thuộc về **một người**. Một người có thể có nhiều số, nhưng số đã thuộc người khác thì không dùng được.

---

## UC-09 · Danh sách và quản lý

**Ai dùng:** Admin

### Xem danh sách

Hiện **họ tên, email, số điện thoại, trạng thái, tòa đang phụ trách**. Lọc theo trạng thái hoặc tìm theo tên. Chưa có Manager nào thì hiện dòng báo trống.

Mở hồ sơ một người thì thấy thông tin chi tiết, tòa phụ trách, và **số hợp đồng đang hiệu lực của tòa đó** — con số này để Admin cân nhắc trước khi khóa.

### Gửi lại link kích hoạt

**Chỉ dùng cho tài khoản Chưa kích hoạt.**

1. Link cũ hết hiệu lực ngay.
2. Sinh link mới, hiệu lực 24 giờ.
3. Gửi email, ghi lại thao tác.

Gửi thư lỗi thì báo Admin thử lại sau.

### Sửa thông tin

**Chỉ dùng cho tài khoản Đang hoạt động hoặc Bị khóa.**

Admin sửa được: họ tên, email, số điện thoại, địa chỉ, ngày sinh, ảnh CCCD hai mặt.

- **Email hoặc số điện thoại mới đã thuộc người khác:** từ chối.
- **Ảnh CCCD mờ hoặc sai định dạng:** bắt tải lại, chưa đạt thì không cho lưu.

Mọi thay đổi đều ghi lại kèm người sửa và thời điểm.

### Xóa tài khoản

**Chỉ dùng cho tài khoản Chưa kích hoạt.** Tài khoản sai thông tin thì không sửa, Admin xóa đi tạo lại.

Xóa là **xóa hẳn**, coi như chưa từng tạo. Link đã gửi cũng không còn, người nhận bấm vào sẽ thấy báo link không tồn tại.

Vì tài khoản Chưa kích hoạt không được phân công tòa, nên xóa không ảnh hưởng tòa nào.

---

## UC-10 · Khóa và mở khóa

**Ai dùng:** Admin

### Khóa

**Chỉ dùng cho tài khoản Đang hoạt động.**

1. Admin nhập **lý do khóa** (bắt buộc).
2. Tài khoản chuyển sang **Bị khóa**.
3. Ghi lại lý do, người khóa, thời điểm.
4. Gửi email báo Manager.

**Các trường hợp**

- **Không nhập lý do:** không cho xác nhận.
- **Manager đang phụ trách tòa còn khách thuê:** cảnh báo tòa đó đang có hợp đồng hiệu lực và nhắc phân công người khác, nhưng **vẫn cho khóa**.
- **Admin hủy thao tác:** không thay đổi gì.

**Sau khi khóa**

- Manager không đăng nhập được nữa, **phiên đang mở bị đẩy ra ngay**.
- Vẫn giữ phân công tòa, **không gỡ tự động**.
- Dữ liệu phòng, hợp đồng, sự cố của tòa **giữ nguyên**. Admin cần phân công người khác tiếp quản.

### Mở khóa

**Chỉ dùng cho tài khoản Bị khóa.** Tài khoản về Đang hoạt động, Manager đăng nhập lại được, nhận email báo.

---

## UC-11 · Phân công tòa nhà

**Ai dùng:** Admin

**Quy tắc nền:** mỗi tòa chỉ có **một** Manager, mỗi Manager cũng chỉ phụ trách **một** tòa.

**Ai hiện trong danh sách chọn:** Manager **Đang hoạt động** và **chưa phụ trách tòa nào**. Tài khoản Chưa kích hoạt hoặc Bị khóa không hiện, cố tình gán vẫn bị từ chối.

### Phân công

1. Admin chọn tòa, chọn Manager.
2. Hệ thống hỏi xác nhận.
3. Gán Manager vào tòa.
4. Manager nhận **thông báo trong ứng dụng và email**. Ghi lại thao tác.

### Thay Manager cũ

Tòa đã có người phụ trách thì hệ thống cảnh báo và hỏi Admin có thay không.

Admin đồng ý thì **gỡ người cũ và gán người mới cùng lúc** — thành công cả hai hoặc không thay đổi gì. **Cả hai Manager** đều nhận thông báo và email.

### Gỡ phân công

Admin gỡ Manager mà không gán ai mới. Tòa về trạng thái **chưa có người phụ trách**, hệ thống cảnh báo điều này. Manager bị gỡ nhận thông báo và email.

**Các trường hợp**

- **Manager được chọn không Đang hoạt động:** từ chối.
- **Manager đã phụ trách tòa khác:** không hiện trong danh sách.
- **Gửi email lỗi:** phân công **vẫn thành công**, thông báo trong ứng dụng vẫn có, chỉ cảnh báo thêm là gửi thư thất bại.
- **Lỗi khi thay người:** quay lại như cũ, không phân công nào thay đổi.

---

## Manager chưa được phân công tòa

Dù đã kích hoạt, Manager chưa có tòa chỉ dùng được **hồ sơ cá nhân, đổi mật khẩu, thông báo, đăng xuất**. Các mục khác hiện thông báo *"Bạn chưa được cấp quyền quản lý tòa nhà"*.

Vì hầu hết màn hình phía Manager không cần chọn tòa (mỗi Manager chỉ một tòa), nên hệ thống tự tra tòa theo tài khoản đang đăng nhập. Không có tòa thì chặn ngay từ đầu.
