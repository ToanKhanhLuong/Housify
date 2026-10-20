
# Module dashboard

> Màn hình tổng quan và báo cáo. **UC-07, UC-47, UC-48.**
> Module này **chỉ đọc**: không có bảng riêng, không thay đổi dữ liệu nào. Mọi con số đều tổng hợp từ các module khác.

**Người làm:** BE Hiếu · FE Hiếu (UC-07, UC-47), Hưng (UC-48) · Iter 3

**Quyền**

- **Admin:** tổng quan **toàn hệ thống**, lọc được theo từng tòa.
- **Manager:** tổng quan **tòa mình phụ trách**.

---

## Cách hiểu các con số

| Con số                                           | Tính thế nào                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Doanh thu tháng**                        | Tổng tiền các hóa đơn **đã thanh toán** có ngày thanh toán trong tháng, tức tiền thực về |
| **Số người ở**                          | Cư dân đang ở, thuộc hợp đồng Đang hiệu lực                                                          |
| **Người mới chuyển vào / chuyển đi** | Cư dân có ngày vào ở / ngày chuyển ra trong tháng hiện tại                                           |
| **Số người dùng**                       | Tài khoản Manager và Customer đang hoạt động                                                             |
| **Sự cố chưa xử lý**                   | Đơn sự cố Chờ xử lý hoặc Đang xử lý                                                                  |
| **Hóa đơn chưa thu**                    | Hóa đơn Chờ thanh toán, kèm tổng tiền                                                                   |
| **Quá hạn**                               | Hóa đơn Chờ thanh toán đã qua hạn thanh toán                                                           |

Phòng và tòa **đã xóa** không tính vào bất kỳ con số nào.

---

## UC-07 · Tổng quan toàn hệ thống

**Ai dùng:** Admin

**Luồng chính**

1. Admin đăng nhập → **tự vào** màn hình tổng quan.
2. Hiện các ô số liệu:
   - Số tòa nhà.
   - Tổng số phòng, chia theo **Trống / Đang thuê / Bảo trì**.
   - **Doanh thu tháng hiện tại**.
   - Số hợp đồng **Đang hiệu lực**.
   - Số **sự cố chưa xử lý**.
   - Số **người dùng**, số **người ở**.
   - Số **người mới chuyển vào**, số **người mới chuyển đi**.
3. Admin **lọc theo một tòa** → các ô cập nhật theo tòa đó.
4. Bấm vào một ô → chuyển sang màn hình chi tiết tương ứng (danh sách phòng, hợp đồng, sự cố…).

**Các trường hợp**

- **Không có dữ liệu trong phạm vi lọc:** ô đó hiện *"Không có dữ liệu"*, các ô khác giữ nguyên.
- **Bỏ lọc tòa:** quay về số liệu toàn hệ thống.
- **Lỗi tải dữ liệu:** báo lỗi. Nếu giao diện còn dữ liệu lần trước thì hiện kèm ghi chú *"Dữ liệu có thể chưa cập nhật"*.

**Quy tắc**

- Chỉ Admin xem được tổng quan toàn hệ thống.
- Màn hình **chỉ đọc**, mọi thao tác phải đi qua chức năng tương ứng.

---

## UC-47 · Tổng quan tòa nhà

**Ai dùng:** Manager

**Luồng chính**

1. Manager đăng nhập → **tự vào** màn hình tổng quan, hoặc chọn "Tổng quan" trên menu.
2. Hiện các ô số liệu của **tòa mình**:
   - Tổng số phòng, số phòng **Trống / Đang thuê / Bảo trì**.
   - Số hóa đơn **chờ thanh toán**, kèm **tổng tiền chưa thu**.
   - Số **sự cố đang chờ xử lý**.
   - Số hợp đồng **hết hạn trong 30 ngày tới**.
   - **Doanh thu tháng hiện tại**.
3. Bấm vào một ô → chuyển sang màn hình chi tiết tương ứng.

**Các trường hợp**

- **Manager chưa được phân công tòa:** hiện *"Bạn chưa được cấp quyền quản lý tòa nhà"*.
- **Lỗi tải dữ liệu:** báo lỗi kỹ thuật.

**Quy tắc**

- Manager chỉ xem dữ liệu **tòa được phân công**.
- Màn hình **chỉ đọc**.

---

## UC-48 · Báo cáo doanh thu và tình trạng phòng

**Ai dùng:** Admin (toàn hệ thống) · Manager (tòa mình)

**Luồng chính**

1. Chọn khoảng thời gian: **tháng, quý hoặc năm**.
2. Hệ thống hiện:
   - **Tổng doanh thu** trong kỳ.
   - **Biểu đồ doanh thu theo tháng**.
   - **Tỷ lệ phòng trống / đang thuê** hiện tại.
   - Số hợp đồng **mới** (kích hoạt trong kỳ) và số hợp đồng **kết thúc** trong kỳ.
3. Admin **lọc theo tòa** → báo cáo cập nhật theo tòa đó.
4. Bảng **"Phòng chậm thanh toán"**: các phòng có hóa đơn quá hạn, **số ngày quá hạn, số tiền còn nợ**.

**Các trường hợp**

- **Kỳ đã chọn không có dữ liệu:** báo *"Không có dữ liệu cho kỳ này"*.
- **Lỗi tổng hợp:** báo lỗi hệ thống, đề nghị thử lại.

**Quy tắc**

- Admin xem toàn hệ thống, Manager chỉ xem tòa được phân công.
- Báo cáo **chỉ đọc**.
