
# Module room

> Phòng trong tòa nhà: tạo, sửa, xóa, xem danh sách và chi tiết. **UC-16, UC-17, UC-18, UC-19.**
> Loại phòng (UC-20) là module riêng `roomType`.

**Người làm:** BE Toàn · FE Mạnh · Iter 1

**Quyền**

- **Admin:** toàn quyền tạo, sửa, xóa phòng ở mọi tòa.
- **Manager:** chỉ **xem** phòng thuộc tòa mình phụ trách. Không sửa, không đổi trạng thái.
- **Customer:** không dùng module này. Khách xem phòng mình qua hợp đồng (UC-25).

---

## Ba trạng thái của phòng

| Trạng thái          | Nghĩa là gì                                         | Ai đổi                  |
| --------------------- | ------------------------------------------------------ | ------------------------- |
| **Trống**      | Sẵn sàng cho thuê, Manager tạo hợp đồng được | —                        |
| **Đang thuê** | Có hợp đồng đang hiệu lực                       | **Chỉ hệ thống** |
| **Bảo trì**   | Tạm ngưng cho thuê                                  | Admin                     |

**Cách chuyển trạng thái**

- **Trống ↔ Bảo trì:** Admin tự chuyển ở UC-17.
- **Trống → Đang thuê:** hệ thống tự chuyển khi khách kích hoạt hợp đồng (UC-06).
- **Đang thuê → Trống:** hệ thống tự chuyển khi hợp đồng kết thúc (UC-28, UC-29, UC-45).
- Admin **không chọn được** Đang thuê. Manager **không đổi được** trạng thái nào.
- Phòng **Bảo trì** không tạo được hợp đồng.

---

## UC-16 · Tạo phòng

**Ai dùng:** Admin

**Điều kiện trước**

- Tòa nhà đã tồn tại, chưa bị xóa.
- Đã có ít nhất một loại phòng (UC-20).

**Luồng chính**

1. Admin chọn tòa (hoặc tầng), bấm "Thêm phòng".
2. Điền form:
   - **Bắt buộc:** mã phòng, tầng, loại phòng, diện tích, sức chứa tối đa, giá thuê, tiền cọc.
   - **Tùy chọn:** ảnh.
3. Hệ thống kiểm tra hợp lệ → lưu phòng ở trạng thái **Trống**.
4. Báo "Tạo phòng thành công", phòng hiện trong danh sách của tầng đó.

**Các trường hợp**

- **Mã phòng đã có trong tòa:** báo trùng mã.
- **Thiếu thông tin bắt buộc:** báo lỗi từng trường.
- **Giá thuê hoặc tiền cọc không lớn hơn 0, sức chứa nhỏ hơn 1:** báo lỗi, nhập lại.
- **Tầng nằm ngoài khoảng 1 đến số tầng của tòa:** báo lỗi.
- **Loại phòng đã bị xóa:** không hiện trong danh sách chọn.
- **Admin hủy:** không lưu, quay về danh sách phòng.

**Quy tắc**

- Mã phòng **duy nhất trong cùng một tòa**. Hai tòa khác nhau được trùng mã.
- Phòng mới tạo **luôn ở trạng thái Trống**.
- Sức chứa **≥ 1**, giá thuê **> 0**, tiền cọc **> 0**.
- Ảnh phòng là ảnh công khai, tải qua module `upload`.

---

## UC-17 · Cập nhật phòng

**Ai dùng:** Admin

**Luồng chính**

1. Admin chọn phòng, bấm "Chỉnh sửa" → form hiện thông tin hiện tại.
2. Sửa được: **tầng, loại phòng, diện tích, sức chứa, giá thuê, tiền cọc, ảnh, trạng thái**.
3. Bấm "Lưu" → kiểm tra hợp lệ → cập nhật → báo thành công.

**Không sửa được:** **mã phòng**. Ô này khóa sau khi tạo.

**Đổi trạng thái**

- Chỉ chọn được **Trống** hoặc **Bảo trì**.
- Phòng **Đang thuê** thì không đổi trạng thái được, vì trạng thái đó do hợp đồng quyết định.
- Phòng đang có **hợp đồng nháp** thì không chuyển sang Bảo trì được. Manager phải hủy hợp đồng nháp trước (UC-46).

**Các trường hợp**

- **Giá thuê hoặc tiền cọc không lớn hơn 0:** báo lỗi, nhập lại.
- **Sức chứa mới nhỏ hơn số người đang ở:** từ chối, báo *"Sức chứa không được nhỏ hơn số người đang cư trú hiện tại (X người)"*.
- **Tầng mới nằm ngoài khoảng của tòa:** báo lỗi.
- **Admin hủy hoặc lỗi lưu:** giữ nguyên thông tin cũ.

**Quy tắc**

- Mã phòng không đổi sau khi tạo.
- Sức chứa không được nhỏ hơn **số người đang ở**, tức là cư dân còn ở của hợp đồng đang hiệu lực.
- Đổi giá thuê và tiền cọc **chỉ áp dụng cho hợp đồng tạo sau này**. Hợp đồng đã tạo giữ nguyên giá lúc ký.

---

## UC-18 · Xóa phòng

**Ai dùng:** Admin

**Điều kiện được xóa:** phòng **không có** hợp đồng **đang hiệu lực hoặc đang nháp**.

**Luồng chính**

1. Admin bấm "Xóa" tại phòng.
2. Hệ thống kiểm tra điều kiện.
3. Hiện cảnh báo xác nhận xóa.
4. Admin xác nhận → **xóa mềm** phòng → báo thành công.

**Các trường hợp**

- **Phòng có hợp đồng đang hiệu lực:** từ chối, báo *"Không thể xóa phòng đang có khách thuê"*.
- **Phòng có hợp đồng nháp:** từ chối, báo phòng đang có hợp đồng chờ kích hoạt, Manager cần hủy trước (UC-46).
- **Admin hủy hoặc lỗi lưu:** không xóa.

**Quy tắc**

- **Xóa mềm**, không xóa vĩnh viễn, để giữ lịch sử hợp đồng và hóa đơn.
- Hợp đồng đã kết thúc hoặc đã hủy **không chặn** việc xóa.
- Mã phòng đã xóa **được dùng lại**: Admin tạo phòng mới với đúng mã đó.

---

## UC-19 · Xem danh sách và chi tiết phòng

**Ai dùng:** Admin (mọi tòa) · Manager (chỉ tòa mình)

### Danh sách

- Hiện **mã phòng, tầng, loại phòng, giá thuê, trạng thái**.
- Lọc theo: **trạng thái, tầng, loại phòng, khoảng giá**.
- Phòng đã xóa **không hiện**.

### Chi tiết

- **Thông tin phòng:** toàn bộ các trường ở trên, kèm diện tích, sức chứa, tiền cọc, ảnh.
- **Hợp đồng đang hiệu lực** (nếu có).
- **Danh sách cư dân** đang ở.
- **Lịch sử hợp đồng** của phòng.

**Các trường hợp**

- **Không phòng nào khớp bộ lọc:** báo "Không tìm thấy phòng phù hợp".
- **Manager mở phòng thuộc tòa khác:** từ chối, báo không có quyền.

**Quy tắc**

- Manager chỉ xem phòng của tòa mình phụ trách.
- Với Manager, trang chi tiết **chỉ đọc**: không có nút sửa, xóa, đổi trạng thái.

**Lưu ý thứ tự làm:** phần hợp đồng, cư dân, lịch sử hợp đồng lấy dữ liệu từ module `contract` và `occupant`, mà hai module đó làm ở iter 2. Nên iter 1 chỉ làm phần thông tin phòng, iter 3 bổ sung ba phần còn lại.
