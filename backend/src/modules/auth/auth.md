# Module auth

> Đăng nhập và mọi thứ gắn với tài khoản của chính người dùng. **UC-01 → UC-05.**
> Hồ sơ Customer **không** ở đây mà ở module `occupant` (UC-31).

---

## UC-01 · Đăng nhập

**Ai dùng:** Admin, Manager, Customer

**Cách đăng nhập**

- Admin, Manager: **email** + mật khẩu
- Customer: **số CCCD** + mật khẩu
- Màn hình chỉ có **một ô định danh chung**, hệ thống tự nhận biết: dạng email thì tìm tài khoản, 12 chữ số thì hiểu là CCCD.

**Luồng chính**

1. Người dùng nhập định danh và mật khẩu.
2. Với Customer: tra CCCD trong danh sách cư dân → lấy bản ghi **người đại diện** → ra tài khoản. Khách thuê lại có nhiều bản ghi nhưng cùng một tài khoản, không ảnh hưởng.
3. So mật khẩu, kiểm tra tài khoản đang hoạt động.
4. Cấp phiên làm việc, đưa vào đúng giao diện theo vai trò.

**Các trường hợp**

- **Sai mật khẩu hoặc không có tài khoản:** báo chung lỗi, không nói sai ở đâu, để không ai dò được tài khoản thật.
- **Tài khoản bị khóa:** báo rõ là đã bị khóa.
- **Customer đã ngưng hoạt động (trả phòng) nay có hợp đồng mới:** nhắc kiểm tra email bấm link kích hoạt. Tài khoản chỉ mở lại khi hoàn tất bước đó. INACTIVE → ACTIVE là xong. Riêng với LOCKED thì sẽ vĩnh viễn không cho kích hoạt lại hợp đồng.
- **Manager chưa kích hoạt:** không vào được, phải đặt mật khẩu qua link trong email trước.
- **Tích "Ghi nhớ đăng nhập":** phiên giữ **7 ngày** thay vì 1 ngày.
- **Bấm "Quên mật khẩu":** chuyển sang UC-04.

**Quy tắc**

- Mật khẩu luôn lưu dạng mã hóa, không bao giờ lưu nguyên văn hay trả về giao diện, kể cả trên console log f12 dev tool
- Customer chỉ có tài khoản sau khi hoàn tất kích hoạt ở UC-06.

---

## UC-02 · Đăng xuất

**Ai dùng:** tất cả các vai trò

**Luồng chính**

1. Bấm đăng xuất → hủy phiên hiện tại.
2. Quay về trang đăng nhập.
3. Nút Back lại sẽ không có tác dụng quay lại nữa vì đã hủy phiên rồi.

**Các trường hợp**

- **Đổi ý giữa chừng:** giữ nguyên phiên.
- **Lỗi mạng khi hủy phiên:** giao diện vẫn xóa phiên trên máy và về trang đăng nhập, để tài khoản không bị bỏ ngỏ.

---

## UC-03 · Đổi mật khẩu

**Ai dùng:** tất cả, khi đang đăng nhập.

**Luồng chính**

1. Nhập mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới.
2. Hệ thống kiểm tra theo Quy tắc bên dưới.
3. Hợp lệ → lưu mật khẩu mới dạng mã hóa, báo thành công.

**Các trường hợp**

- **Mật khẩu hiện tại sai:** báo lỗi, nhập lại.
- **Mật khẩu mới không khớp phần xác nhận:** báo lỗi.
- **Mật khẩu mới không đủ mạnh:** báo rõ tiêu chí.
- **Hủy giữa chừng hoặc lỗi lưu:** không thay đổi gì.

**Quy tắc**

- Tối thiểu **6 ký tự**, có cả **chữ lẫn số**.
- Không được trùng mật khẩu đang dùng.
- Mật khẩu mới phải khớp với xác nhận mật khẩu mới.

---

## UC-04 · Quên mật khẩu

**Ai dùng:** tất cả, khi quên mật khẩu và chưa đăng nhập được

**Luồng chính**

1. Nhập **email**. Customer cũng nhập email, vì tuy đăng nhập bằng CCCD nhưng vẫn có email nhận thư.
2. Hệ thống gửi **mã OTP** về email.
3. Nhập mã → hệ thống xác thực → sang màn hình đặt mật khẩu mới.
4. Nhập mật khẩu mới và xác nhận → lưu → về trang đăng nhập để đăng nhập lại.

**Các trường hợp**

- **Email không tồn tại:** vẫn hiện y hệt câu "đã gửi", để không ai dò được email nào có tài khoản.
- **Mã hết hạn hoặc đã dùng:** từ chối, làm lại từ đầu.
- **Mật khẩu mới không đạt hoặc trùng mật khẩu cũ:** báo lỗi.
- **Không nhận được thư:** cho bấm gửi lại.
- **Gửi thư lỗi:** báo thử lại sau.
- **Để trống trường bắt buộc:** cảnh báo nhập đủ.
- **Manager chưa kích hoạt:** không dùng được. Họ chưa từng có mật khẩu, việc cần làm là bấm link kích hoạt.

**Quy tắc**

- Mã sống **5 phút**, dùng **một lần**.
- Gửi mã mới thì mã cũ hết hiệu lực ngay.
- Mã OTP 4 chữ số
- Mật khẩu mới theo cùng quy tắc với UC-03.

---

## UC-05 · Hồ sơ cá nhân (chỉ Manager)

**Ai dùng:** Manager

**Tình trạng ban đầu**

- **Đã có:** họ tên, email, số điện thoại, do Admin nhập lúc tạo.
- **Còn trống:** địa chỉ, ngày sinh, ảnh CCCD hai mặt.

**Luồng chính**

1. Mở hồ sơ → xem thông tin hiện tại.
2. Điền các trường còn trống, tải ảnh CCCD.
3. Lưu → các trường vừa điền chuyển sang **chỉ xem**.

**Các trường hợp**

- **Chỉ xem, không sửa:** hiển thị thông tin.
- **Hủy khi đang sửa:** không lưu.
- **Ảnh CCCD mờ hoặc sai định dạng:** bắt tải lại, chưa đạt thì không cho lưu.
- **Muốn sửa sau khi đã lưu:** không tự sửa được, nhờ Admin làm ở UC-09.

**Quy tắc**

- Họ tên, email, số điện thoại: Manager **chỉ xem**, không sửa được lúc nào.
- Địa chỉ, ngày sinh, ảnh CCCD: Manager tự điền **một lần**.
- Chỉ tải ảnh CCCD, **không nhập số CCCD**. Cơ sở dữ liệu có chỗ lưu số nhưng hiện không dùng.
- Ảnh CCCD lưu ở chế độ bảo vệ, chỉ người có quyền mới xem được, giống ảnh CCCD của khách thuê.
- Manager không sửa được email và số điện thoại ở đây, nên trường hợp trùng chỉ xảy ra khi Admin sửa hộ ở UC-09.

---

## Khóa tài khoản phải đẩy người dùng ra ngay

**Vì sao cần:** khi Admin khóa Manager, người đó phải bị đẩy ra **ngay lập tức**, không đợi phiên hết hạn.

**Cách làm:** mỗi yêu cầu gửi lên, hệ thống đọc lại trạng thái tài khoản. Thấy không còn hoạt động thì từ chối và bắt đăng nhập lại.

**Đánh đổi:** tốn thêm một lần đọc cơ sở dữ liệu cho mỗi yêu cầu. Đổi lại, cả ba trường hợp dưới đây đều có hiệu lực tức thì mà không phải xử lý riêng:

- Admin khóa Manager
- Khách bị ngưng hoạt động sau khi trả phòng.
- Khách bị khóa sau khi bị chấm dứt hợp đồng đơn phương.
