# Module occupant

> Cư dân của phòng: xem danh sách, cập nhật thông tin, thêm và xóa người ở cùng. **UC-30, UC-31, UC-32, UC-33.**
> Hồ sơ cá nhân của khách (Customer) cũng nằm ở đây, vì thông tin khách lưu trong hồ sơ cư dân chứ không nằm trong tài khoản.

**Người làm:** BE An · FE Mạnh · Iter 2

**Quyền**

- **Manager:** xem, sửa, thêm, xóa cư dân thuộc **tòa mình phụ trách**.
- **Customer (người đại diện):** xem và sửa hồ sơ của mình và **người ở cùng phòng mình**.

---

## Hai vai trò cư dân

| Vai trò                      | Có tài khoản không       | Vào hệ thống thế nào                                                 |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| **Người đại diện** | Có, đăng nhập bằng CCCD | Tự tạo lúc kích hoạt hợp đồng (UC-06)                             |
| **Người ở cùng**    | **Không**             | Manager nhập lúc tạo hợp đồng nhóm (UC-24) hoặc thêm sau (UC-32) |

**Ai được tính là "đang ở":** cư dân chưa chuyển đi, thuộc hợp đồng **Đang hiệu lực**.

---

## UC-30 · Xem danh sách và thông tin cư dân

**Ai dùng:** Manager

**Luồng chính**

1. Manager vào mục "Quản lý cư dân".
2. Hiện danh sách: **họ tên, CCCD, phòng, vai trò** (Đại diện / Ở cùng), **ngày vào ở**.
3. Lọc theo **phòng** hoặc **trạng thái** (đang ở / đã chuyển đi).
4. Chọn một cư dân → hồ sơ chi tiết: thông tin cá nhân, CCCD, quan hệ với người đại diện, ngày vào và ra, phòng đang ở.

**Các trường hợp**

- **Chưa có cư dân nào:** báo "Chưa có cư dân nào".
- **Manager xem cư dân tòa khác:** từ chối, báo không có quyền.

**Quy tắc**

- Manager chỉ xem cư dân thuộc tòa được phân công.
- Danh sách **không gồm** người ở cùng của hợp đồng Nháp hoặc Đã hủy, vì họ chưa từng vào ở.
- Xem ở đây, sửa ở UC-31.

---

## UC-31 · Cập nhật thông tin cư dân

**Ai dùng:** Customer (người đại diện) · Manager

### Customer sửa hồ sơ của mình

1. Vào "Hồ sơ cá nhân" → hiện thông tin hiện tại. **CCCD và ngày sinh có dấu \* đỏ** để lưu ý.
2. Sửa các trường được phép → hệ thống kiểm tra định dạng.
3. Bấm "Lưu" → cập nhật, báo thành công.

Email của khách cũng sửa ở đây (email nằm trong tài khoản).

### Customer sửa thông tin người ở cùng

1. Vào "Thành viên phòng" → danh sách người ở cùng.
2. Chọn người cần sửa → sửa như trên.

### Manager sửa

Manager mở hồ sơ cư dân (UC-30), bấm "Chỉnh sửa" → sửa giống Customer.

### Tải ảnh CCCD

- **Đọc được số** (có OCR): tự điền vào ô CCCD để đối chiếu, **vẫn cho sửa**. Bắt buộc tích **"Đã đối chiếu với thẻ gốc"**.
- **Không đọc được số:** cảnh báo, chuyển sang nhập tay, **vẫn bắt tích** đối chiếu.
- OCR là chức năng làm nếu kịp. Chưa có OCR thì luôn nhập tay và tích đối chiếu.

**Các trường hợp**

- **Hủy:** không lưu.
- **Số điện thoại mới đã thuộc về người khác:** từ chối, báo trùng.
- **Email sai định dạng:** báo lỗi.
- **Email đã có trong hệ thống:** từ chối, báo trùng.
- **CCCD sai:** không đủ 12 số, mã tỉnh không hợp lệ, năm sinh không khớp → từ chối, chỉ rõ chữ số sai.
- **CCCD trùng cư dân khác cùng phòng:** từ chối, báo trùng.
- **CCCD mới của người đại diện đã là định danh của tài khoản khác:** từ chối.
- **Ảnh CCCD không đạt yêu cầu:** yêu cầu tải lại.

**Quy tắc**

- **CCCD và ngày sinh** là trường quan trọng, chỉ **người đại diện và Manager** được sửa.
- **Đổi CCCD của người đại diện = đổi tên đăng nhập** của họ.
- Người đại diện được sửa **toàn bộ** thông tin người ở cùng phòng mình.
- Mọi thay đổi, dù do khách hay Manager, đều **ghi nhật ký**.
- Ảnh CCCD là ảnh bảo vệ: chỉ người đại diện của phòng và Manager của tòa xem được.

---

## UC-32 · Thêm người ở cùng

**Ai dùng:** Manager

**Điều kiện trước**

- Hợp đồng **Đang hiệu lực**.
- Số người hiện tại **chưa đạt sức chứa** của phòng.

**Luồng chính**

1. Manager mở chi tiết hợp đồng, bấm "Thêm người ở cùng".
2. Form: **họ tên, CCCD, số điện thoại, ngày sinh, ngày bắt đầu ở, quan hệ với người đại diện**.
3. Xác nhận → kiểm tra CCCD chưa trùng trong phòng, số người chưa vượt sức chứa.
4. Thêm cư dân mới (vai trò Ở cùng, **không có tài khoản**), ghi nhật ký, báo thành công.

**Các trường hợp**

- **Manager hủy:** không thêm.
- **Phòng đã đủ sức chứa:** từ chối, báo *"Phòng đã đạt sức chứa tối đa (X người)"*.
- **CCCD đã có trong danh sách cư dân của phòng:** từ chối, báo trùng.
- **Số điện thoại đã thuộc về người khác:** từ chối, báo trùng.
- **Hợp đồng không Đang hiệu lực:** từ chối.

**Quy tắc**

- Tổng số cư dân, **tính cả người đại diện**, không vượt sức chứa phòng.
- Người ở cùng **không có tài khoản** đăng nhập.
- Thêm người ở cùng **không làm thay đổi** hợp đồng hay trạng thái phòng.

---

## UC-33 · Xóa người ở cùng

**Ai dùng:** Manager

**Ý nghĩa:** ghi nhận một người ở cùng **chuyển ra**. Không xóa hồ sơ, chỉ ghi ngày chuyển ra.

**Điều kiện trước**

- Hợp đồng **Đang hiệu lực**.
- Người cần xóa là **người ở cùng**, không phải người đại diện.

**Luồng chính**

1. Manager chọn người ở cùng, bấm "Xóa khỏi phòng".
2. Hộp xác nhận: thông tin người đó, **ngày chuyển ra** (mặc định hôm nay), **ghi chú** (tùy chọn).
3. Xác nhận → cư dân chuyển **đã chuyển đi** với ngày chuyển ra, ghi nhật ký.
4. Báo *"Đã cập nhật danh sách cư dân"* và *"Hợp đồng không thay đổi. Người đại diện vẫn giữ nguyên"*.

**Các trường hợp**

- **Manager hủy:** không thay đổi.
- **Người cần xóa là người đại diện:** từ chối, báo *"Không thể xóa người đại diện theo luồng này — vui lòng sử dụng UC-28 hoặc UC-29"*.

**Quy tắc**

- Người đại diện chỉ rời phòng qua **chấm dứt hợp đồng** (UC-28, UC-29).
- Xóa người ở cùng **chỉ ghi ngày chuyển ra**, không đổi hợp đồng, phòng hay tài khoản nào.
- Nhật ký ghi: người thực hiện, người bị xóa, ngày chuyển ra, ghi chú.
