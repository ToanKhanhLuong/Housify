# Module building

> Tòa nhà, tầng và nội quy. **UC-12, UC-13, UC-14, UC-15, UC-23.**

**Người làm:** BE Toàn · FE Mạnh · Iter 1

**Quyền**

- **Admin:** toàn quyền tạo, sửa, xóa tòa, quản lý tầng, soạn nội quy.
- **Manager:** chỉ **xem** tòa mình phụ trách (thông tin, tầng, nội quy). Không có nút sửa.
- **Customer:** chỉ **xem nội quy** của tòa mình đang ở.

---

## UC-12 · Tạo tòa nhà

**Ai dùng:** Admin

**Luồng chính**

1. Admin bấm "Thêm tòa nhà".
2. Điền **tên, địa chỉ, số tầng** (bắt buộc), **mô tả, ảnh** (tùy chọn).
3. Hệ thống kiểm tra hợp lệ → lưu tòa nhà.
4. Báo "Tạo tòa nhà thành công" → chuyển sang trang chi tiết tòa.

**Sau khi tạo:** tòa có đủ tầng theo số đã nhập, **chưa có phòng** và **chưa có Manager**.

**Các trường hợp**

- **Tên trùng tòa khác:** báo trùng, yêu cầu đổi tên.
- **Thiếu tên, địa chỉ hoặc số tầng:** báo lỗi từng trường.
- **Số tầng không phải số nguyên hoặc nhỏ hơn 1:** báo lỗi.
- **Lỗi lưu:** không tạo, báo lỗi hệ thống.
- **Admin hủy:** không lưu, quay về danh sách.

**Quy tắc**

- Tên tòa là **duy nhất** trong các tòa đang hoạt động. Tòa đã xóa thì tên được dùng lại.
- Ảnh tòa nhà là ảnh công khai, tải qua module `upload`.

---

## UC-13 · Xem và cập nhật tòa nhà

**Ai dùng:** Admin (xem, sửa) · Manager (chỉ xem tòa mình)

### Danh sách

- **Admin** thấy tất cả tòa đang hoạt động.
- **Manager** chỉ thấy đúng tòa mình phụ trách.
- Tòa đã xóa **không hiện** ở đâu cả.

### Chi tiết

Hiện **tên, địa chỉ, mô tả, ảnh, số tầng, số phòng, Manager phụ trách, ngày tạo**.

### Sửa (chỉ Admin)

1. Admin bấm "Chỉnh sửa" → mở form.
2. Sửa được: **tên, địa chỉ, mô tả, ảnh**.
3. Bấm "Lưu" → kiểm tra hợp lệ → cập nhật → hiện thông tin mới.

**Số tầng không sửa ở đây** mà ở mục Quản lý tầng (UC-15), vì đổi số tầng có ràng buộc riêng.
**Manager phụ trách không đổi ở đây** mà ở chức năng Phân công (UC-11).

**Các trường hợp**

- **Manager mở tòa của mình:** chỉ hiện thông tin, không có nút "Chỉnh sửa".
- **Manager mở tòa không phải của mình:** từ chối, báo "Không có quyền truy cập".
- **Tên mới trùng tòa khác:** báo trùng.
- **Admin hủy hoặc lỗi lưu:** giữ nguyên thông tin cũ.

---

## UC-14 · Xóa tòa nhà

**Ai dùng:** Admin

**Điều kiện được xóa — phải thỏa cả hai**

- Không phòng nào còn hợp đồng **đang hiệu lực hoặc đang nháp**.
- Tòa **không còn Manager** phụ trách.

**Luồng chính**

1. Admin bấm "Xóa".
2. Hệ thống kiểm tra hai điều kiện trên.
3. Cảnh báo: *"Thao tác này sẽ xóa toàn bộ tầng và phòng thuộc tòa nhà. Bạn có chắc chắn?"*
4. Admin xác nhận → **xóa mềm** tòa và toàn bộ phòng trực thuộc → báo thành công.

**Các trường hợp**

- **Còn phòng có hợp đồng đang hiệu lực hoặc đang nháp:** từ chối, hiện **danh sách phòng đang vướng**.
- **Còn Manager phụ trách:** từ chối, yêu cầu gỡ phân công trước (UC-11).
- **Admin hủy hoặc lỗi lưu:** không xóa gì.

**Quy tắc**

- **Xóa mềm**, không xóa vĩnh viễn: dữ liệu vẫn còn để tra cứu sau này, chỉ ẩn khỏi mọi danh sách.
- Hợp đồng đã kết thúc hoặc đã hủy **không chặn** việc xóa, lịch sử vẫn giữ nguyên.

**Lưu ý thứ tự:** hợp đồng nháp chỉ Manager hủy được (UC-46). Vì vậy Manager phải hủy hết hợp đồng nháp **trước khi** Admin gỡ phân công, nếu không sẽ không còn ai hủy được.

---

## UC-15 · Quản lý tầng

**Ai dùng:** Admin (sửa) · Manager (xem tòa mình)

**Cách hiểu về tầng**

- Hệ thống **không lưu từng tầng riêng**, chỉ lưu **tổng số tầng**.
- Danh sách "Tầng 1 … Tầng N" được sinh ra từ con số đó.
- Tầng đánh số **liên tục từ 1**, không có lỗ hổng.

**Màn hình:** tổng số tầng hiện tại, danh sách từng tầng kèm số phòng theo trạng thái (trống, đang thuê, bảo trì).

**Luồng chính**

1. Admin nhập tổng số tầng mới, bấm "Lưu".
2. Hệ thống kiểm tra hợp lệ.
3. Cập nhật, hiện lại danh sách tầng, báo thành công.

**Các trường hợp**

- **Tăng số tầng:** các tầng mới xuất hiện, chưa có phòng.
- **Giảm số tầng:** chỉ được giảm khi các tầng bị bỏ đi **không có phòng nào**.
- **Xóa một tầng:** vì tầng đánh số liên tục, chỉ **xóa được tầng trên cùng**, và tầng đó phải không có phòng. Muốn xóa tầng giữa thì phải chuyển hết phòng đi chỗ khác.
- **Số tầng không phải số nguyên hoặc nhỏ hơn 1:** báo lỗi.
- **Giảm xuống dưới tầng cao nhất đang có phòng:** từ chối, báo số phòng còn vướng.

**Quy tắc**

- Không giảm số tầng xuống dưới **tầng cao nhất đang có phòng** (tính cả phòng trống, không tính phòng đã xóa).
- Đổi số tầng **không làm thay đổi** phòng nào.

---

## UC-23 · Nội quy tòa nhà

**Ai dùng:** Admin (soạn) · Manager và Customer (xem)

**Luồng chính**

1. Admin chọn tòa → mục "Nội quy" → hiện nội quy hiện tại dạng văn bản.
2. Admin sửa trực tiếp trên ô văn bản.
3. Bấm "Lưu & Đăng" → **ghi đè** bản cũ.
4. **Manager của tòa** nhận thông báo nội quy đã cập nhật.

**Ai xem được**

- **Manager:** nội quy tòa mình.
- **Customer:** nội quy tòa mình đang ở, luôn là **bản mới nhất**.

**Các trường hợp**

- **Nội dung trống:** báo "Nội quy không được để trống".
- **Tòa chưa có Manager:** vẫn lưu bình thường, chỉ là không có ai để thông báo.
- **Admin hủy hoặc lỗi lưu:** giữ nguyên nội quy cũ.

**Quy tắc**

- Mỗi tòa có **một bộ nội quy riêng**, chỉ lưu **bản hiện hành**, không lưu lịch sử.
