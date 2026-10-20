# Module roomType

> Danh mục loại phòng dùng chung toàn hệ thống (Phòng đơn, Phòng đôi, Phòng lớn…). **UC-20.**
> Loại phòng chỉ dùng để **phân loại** khi tạo phòng (UC-16) và để **lọc** danh sách phòng (UC-19). Không chứa giá hay sức chứa — những thứ đó nằm ở từng phòng.

**Người làm:** BE Toàn · FE Mạnh · Iter 1

**Quyền**

- **Admin:** thêm, sửa, xóa.
- **Manager:** chỉ **xem** danh sách, để lọc phòng.
- **Customer:** không dùng.

---

## UC-20 · Quản lý loại phòng

**Ai dùng:** Admin

### Thêm loại phòng

1. Admin bấm "Thêm loại phòng" → form chỉ có **tên loại phòng**.
2. Nhập tên, xác nhận → lưu → hiện trong danh sách.
3. Loại phòng mới xuất hiện ngay trong form tạo phòng (UC-16).

### Sửa tên

1. Admin chọn loại phòng, bấm "Chỉnh sửa" → đổi tên → lưu.
2. **Mọi phòng đang dùng loại này hiện tên mới ngay**, vì phòng chỉ trỏ tới loại phòng chứ không chép tên.

### Xóa

1. Admin chọn loại phòng, bấm "Xóa".
2. Hệ thống kiểm tra loại này có đang được phòng nào dùng không.
3. Không có → **xóa mềm**, loại phòng biến khỏi danh sách và khỏi form tạo phòng.

**Các trường hợp**

- **Tên trùng loại phòng khác:** báo trùng, nhập tên khác.
- **Tên trống:** báo lỗi.
- **Xóa loại phòng đang được dùng:** từ chối, báo **số phòng đang dùng loại đó**. Admin phải đổi sang loại khác cho các phòng đó trước (UC-17).
- **Admin hủy:** không thay đổi gì.

**Quy tắc**

- Tên loại phòng **duy nhất** trong các loại phòng đang hoạt động. Loại đã xóa thì tên được dùng lại.
- Chỉ chặn xóa khi loại phòng đang gán cho **phòng còn hoạt động**. Phòng đã bị xóa mềm thì không tính.
- **Xóa mềm**, không xóa vĩnh viễn.
- Phải có **ít nhất một loại phòng** trước khi tạo được phòng đầu tiên.
