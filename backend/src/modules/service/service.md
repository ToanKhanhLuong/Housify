
# Module service

> Danh mục dịch vụ dùng chung và đơn giá theo từng tòa. **UC-21, UC-22.**
> Đây là nguồn dữ liệu để module `invoice` lập hóa đơn tháng.

**Người làm:** BE Toàn · FE Hiếu · Iter 1

**Quyền:** chỉ **Admin**. Manager không xem hay sửa giá; giá được hệ thống tự lấy khi Manager lập hóa đơn.

---

## Hai loại dịch vụ

| Loại                   | Ví dụ                                     | Trên hóa đơn tính thế nào                                                                             |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Theo chỉ số** | Điện, nước                              | Manager nhập chỉ số cũ và mới. Tiền = (mới − cũ) × đơn giá                                     |
| **Cố định**    | Gửi xe, máy giặt, thang máy, rác, WiFi | Mặc định số lượng 1, Manager sửa được khi hóa đơn còn nháp. Tiền = số lượng × đơn giá |

Admin chọn loại lúc tạo dịch vụ.

---

## UC-21 · Quản lý dịch vụ

**Ai dùng:** Admin

### Thêm dịch vụ

1. Admin bấm "Thêm dịch vụ".
2. Điền **tên dịch vụ, đơn vị tính, cách tính** (theo chỉ số hoặc cố định).
3. Lưu → dịch vụ có trong danh mục, sẵn sàng đặt giá ở UC-22.

**Đơn vị tính** chỉ để hiển thị (kWh, m³, tháng, người…), không ảnh hưởng cách tính tiền.

### Sửa

Admin sửa được tên, đơn vị tính, cách tính. Thay đổi chỉ áp dụng cho **hóa đơn lập sau này**. Hóa đơn đã lập giữ nguyên, vì mỗi dòng tiền đã chép lại tên và đơn giá lúc lập.

### Xóa

**Luôn xóa mềm**: dịch vụ biến khỏi danh mục và không còn xuất hiện trên hóa đơn mới, nhưng hóa đơn cũ vẫn hiện đầy đủ.

**Các trường hợp**

- **Tên trùng dịch vụ khác:** báo trùng, nhập tên khác.
- **Thiếu tên, đơn vị hoặc cách tính:** báo lỗi từng trường.
- **Xóa dịch vụ đã có trong hóa đơn:** vẫn cho xóa mềm, lịch sử hóa đơn giữ nguyên.
- **Admin hủy:** không thay đổi gì.

**Quy tắc**

- Tên dịch vụ **duy nhất** trong các dịch vụ đang hoạt động. Dịch vụ đã xóa thì tên được dùng lại.
- **Không bao giờ xóa vĩnh viễn** dịch vụ.

---

## UC-22 · Thiết lập giá dịch vụ

**Ai dùng:** Admin

**Ý tưởng chính:** mỗi dịch vụ ở mỗi tòa có **nhiều mức giá theo thời gian**. Mỗi mức giá có một **ngày bắt đầu áp dụng**. Không ghi đè giá cũ, mà thêm mức giá mới.

**Luồng chính**

1. Admin chọn tòa → mục "Giá dịch vụ" → chọn dịch vụ.
2. Hệ thống hiện **lịch sử các mức giá** và form nhập giá mới.
3. Admin nhập **đơn giá** và **ngày bắt đầu áp dụng** → xác nhận.
4. Lưu mức giá mới. Các mức giá cũ giữ nguyên.

**Hệ thống chọn giá nào khi lập hóa đơn**
Lấy mức giá có **ngày bắt đầu gần nhất mà không sau ngày lập hóa đơn**.

Ví dụ giá điện tòa A có hai mức: 3.500đ từ 01/01 và 4.000đ từ 01/11.

- Hóa đơn lập ngày 15/10 → dùng **3.500đ**.
- Hóa đơn lập ngày 05/11 → dùng **4.000đ**.

**Các trường hợp**

- **Trùng ngày bắt đầu với một mức giá đã có:** **sửa mức đó**, không tạo mức mới. Đây cũng là cách sửa một mức giá nhập sai.
- **Đơn giá không lớn hơn 0:** báo lỗi.
- **Ngày bắt đầu nằm trong quá khứ:** cảnh báo *"Ngày hiệu lực trong quá khứ — hóa đơn đã tạo sẽ không bị ảnh hưởng"*, **vẫn cho lưu**.
- **Dịch vụ hoặc tòa đã bị xóa:** không đặt giá được.

**Quy tắc**

- Đổi giá **không ảnh hưởng** hóa đơn đã lập, kể cả nháp, đã gửi hay đã thanh toán. Mỗi hóa đơn chốt đơn giá ngay lúc lập.
- Mức giá **không xóa được**, chỉ sửa được bằng cách nhập lại cùng ngày bắt đầu.
