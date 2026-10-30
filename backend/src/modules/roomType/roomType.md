# Module roomType

> Danh mục loại phòng dùng chung toàn hệ thống (Phòng đơn, Phòng đôi, Phòng gia đình…). **UC-20.**
> Sức chứa tối đa của phòng thuộc về loại phòng (`room_types.capacity` ≥ 1, chốt 30/10). Giá thuê và tiền cọc nằm ở từng phòng.

**Người làm:** BE Toàn · FE Mạnh · Iter 1

**Quyền**

- **Admin:** thêm, sửa, xóa.
- **Manager:** chỉ **xem** danh sách, để lọc phòng.
- **Customer:** không dùng.

---

## UC-20 · Quản lý loại phòng

**Ai dùng:** Admin

### Thêm loại phòng

1. Admin bấm "Thêm loại phòng" → form có **tên loại phòng** và **sức chứa** (số nguyên ≥ 1).
2. Nhập tên và sức chứa, xác nhận → lưu → hiện trong danh sách.
3. Loại phòng mới xuất hiện ngay trong form tạo phòng (UC-16).

### Sửa loại phòng

1. Admin chọn loại phòng, bấm "Chỉnh sửa" → đổi tên, sức chứa → lưu.
2. **Sửa tên:** Mọi phòng đang dùng loại này hiện tên mới ngay.
3. **Sửa sức chứa:** Sức chứa mới không được nhỏ hơn số người đang ở của phòng đông nhất thuộc loại này. Nếu nhỏ hơn → chặn (400 "Sức chứa mới nhỏ hơn số người đang ở của phòng <mã phòng> (<X> người)").

### Xóa

1. Admin chọn loại phòng, bấm "Xóa".
2. Hệ thống kiểm tra loại này có đang được phòng nào chưa xóa dùng không.
3. Còn phòng đang dùng → từ chối (400 "Không thể xóa loại phòng đang được dùng bởi <N> phòng"). Admin phải đổi sang loại khác cho các phòng đó trước (UC-17).
4. Không có phòng nào đang dùng → **xóa mềm**, loại phòng biến khỏi danh sách và khỏi form tạo phòng.

**Các trường hợp**

- **Tên trùng loại phòng khác:** báo trùng (409 "Tên loại phòng đã tồn tại").
- **Tên trống:** báo lỗi (422 "Tên loại phòng không được để trống").
- **Sức chứa nhỏ hơn 1 hoặc không phải số nguyên:** báo lỗi (422 "Sức chứa phải là số nguyên lớn hơn hoặc bằng 1").
- **Xóa loại phòng đang được dùng:** từ chối (400 "Không thể xóa loại phòng đang được dùng bởi <N> phòng").
- **Admin hủy:** không thay đổi gì.

**Quy tắc**

- Tên loại phòng **duy nhất** trong các loại phòng đang hoạt động. Loại đã xóa thì tên được dùng lại.
- Sức chứa thuộc loại phòng (`capacity` ≥ 1).
- Chỉ chặn xóa khi loại phòng đang gán cho **phòng còn hoạt động**. Phòng đã bị xóa mềm thì không tính.
- **Xóa mềm**, không xóa vĩnh viễn.
- Phải có **ít nhất một loại phòng** trước khi tạo được phòng đầu tiên.
