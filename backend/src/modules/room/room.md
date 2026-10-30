# Module room

> Phòng trong tòa nhà: tạo, sửa, xóa, xem danh sách và chi tiết. **UC-16, UC-17, UC-18, UC-19.**
> Sức chứa chuyển sang thuộc về loại phòng (`roomType` - UC-20, chốt 30/10). Phòng không lưu sức chứa riêng.

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
   - **Bắt buộc:** mã phòng, tầng, loại phòng, diện tích, giá thuê, tiền cọc. (Không có sức chứa, sức chứa lấy theo loại phòng).
   - **Tùy chọn:** ảnh.
3. Hệ thống kiểm tra hợp lệ → lưu phòng ở trạng thái **Trống**.
4. Báo "Tạo phòng thành công", phòng hiện trong danh sách của tầng đó.

**Các trường hợp**

- **Mã phòng đã có trong tòa:** báo trùng mã.
- **Thiếu thông tin bắt buộc:** báo lỗi từng trường.
- **Giá thuê hoặc tiền cọc không lớn hơn 0:** báo lỗi, nhập lại (422).
- **Tầng nằm ngoài khoảng 1 đến số tầng của tòa:** báo lỗi.
- **Loại phòng đã bị xóa hoặc không tồn tại:** báo lỗi 422 "Loại phòng không tồn tại".
- **Admin hủy:** không lưu, quay về danh sách phòng.

**Quy tắc**

- Mã phòng **duy nhất trong cùng một tòa**. Hai tòa khác nhau được trùng mã.
- Phòng mới tạo **luôn ở trạng thái Trống**.
- Giá thuê **> 0**, tiền cọc **> 0**. Sức chứa lấy theo loại phòng.
- Ảnh phòng là ảnh công khai, tải qua module `upload`.

---

## UC-17 · Cập nhật phòng

**Ai dùng:** Admin

**Luồng chính**

1. Admin chọn phòng, bấm "Chỉnh sửa" → form hiện thông tin hiện tại.
2. Sửa được: **tầng, loại phòng, diện tích, giá thuê, tiền cọc, ảnh, trạng thái**. (Không có sức chứa).
3. Bấm "Lưu" → kiểm tra hợp lệ → cập nhật → báo thành công.

**Không sửa được:** **mã phòng**. Ô này khóa sau khi tạo.

**Đổi trạng thái**

- Chỉ chọn được **Trống** hoặc **Bảo trì**.
- Phòng **Đang thuê** thì không đổi trạng thái được, vì trạng thái đó do hợp đồng quyết định.
- Phòng đang có **hợp đồng nháp** thì không chuyển sang Bảo trì được. Manager phải hủy hợp đồng nháp trước (UC-46).

**Các trường hợp**

- **Giá thuê hoặc tiền cọc không lớn hơn 0:** báo lỗi 422.
- **Đổi loại phòng nhưng loại mới không đủ chỗ:** từ chối, báo *"Loại phòng mới không đủ chỗ cho số người đang ở (X người)"* (400).
- **Tầng mới nằm ngoài khoảng của tòa:** báo lỗi 400.
- **Admin hủy hoặc lỗi lưu:** giữ nguyên thông tin cũ.

**Quy tắc**

- Mã phòng không đổi sau khi tạo.
- Đổi loại phòng: sức chứa của loại mới phải ≥ số người đang ở của phòng.
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

- Lấy theo tòa (`/buildings/:buildingId/rooms`).
- Lọc theo: `q` (mã phòng), `status` (nhiều giá trị), `floor` (nhiều giá trị trong khoảng 1..floorCount), `roomTypeId` (nhiều giá trị), `minPrice`, `maxPrice`.
- Phòng đã xóa **không hiện**.
- Sắp xếp: `floorNumber` tăng dần, rồi `roomNumber`.
- Trả kèm: `roomType { _id, name, capacity }` và `occupantCount` (số người đang ở).

### Chi tiết

- **Thông tin phòng:** toàn bộ các trường ở trên, kèm diện tích, tiền cọc, ảnh, `roomType { _id, name, capacity }`, `occupantCount`.
- **Hợp đồng đang hiệu lực** (nếu có - iter 2).
- **Danh sách cư dân** đang ở (iter 2).
- **Lịch sử hợp đồng** của phòng (iter 3).

**Các trường hợp**

- **Không phòng nào khớp bộ lọc:** trả mảng rỗng `[]`.
- **Manager mở phòng thuộc tòa khác:** từ chối, báo 403 "Bạn không có quyền xem phòng của tòa này".
