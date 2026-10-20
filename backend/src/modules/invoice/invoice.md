
# Module invoice

> Hóa đơn tháng: lập, gửi, xem, hủy. **UC-34, UC-35, UC-36, UC-37.**
> Thanh toán qua SePay (UC-38), lịch sử thanh toán (UC-39) và nhắc thanh toán (UC-49) nằm ở module `payment`.

**Người làm:** BE Toàn · FE Hiếu · Iter 2

**Quyền**

- **Manager:** lập, gửi, hủy, xem hóa đơn của các phòng thuộc **tòa mình phụ trách**.
- **Customer:** chỉ **xem** hóa đơn của phòng mình, **không thấy hóa đơn nháp**.

---

## Vòng đời hóa đơn

```
Nháp ──Manager gửi (UC-35)──▶ Chờ thanh toán ──tiền về (UC-38)──▶ Đã thanh toán
  │                                 │
  └──Manager hủy (UC-37)──▶ Đã hủy ◀┘
```

| Trạng thái               | Sửa được không                                   | Khách thấy không       |
| -------------------------- | ----------------------------------------------------- | ------------------------- |
| **Nháp**            | Sửa được                                          | Không                    |
| **Chờ thanh toán** | **Khóa**, muốn sửa phải hủy rồi lập lại | Có, kèm QR              |
| **Đã thanh toán** | Khóa                                                 | Có                       |
| **Đã hủy**        | Khóa                                                 | Có, nếu đã từng gửi |

**Quá hạn** không phải một trạng thái, mà được tính ra từ hạn thanh toán và ngày hiện tại.

---

## Các dòng trên một hóa đơn

| Loại dòng               | Lấy từ đâu                                         | Tính tiền                                          |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| **Tiền phòng**    | Giá thuê ghi trên hợp đồng                       | Tự điền                                           |
| **Điện, nước**  | Dịch vụ tính theo chỉ số của tòa                | (chỉ số mới − chỉ số cũ) × đơn giá        |
| **Phí cố định** | Dịch vụ cố định của tòa (gửi xe, máy giặt…) | Số lượng × đơn giá, số lượng mặc định 1 |
| **Phát sinh**      | Manager tự thêm (tên khoản, số tiền)             | Nhập tay                                            |

**Tổng tiền = tiền phòng + điện + nước + phí cố định + phát sinh.** Hệ thống tự tính, không cho nhập tay tổng.

**Dịch vụ nào lên hóa đơn:** chỉ các dịch vụ **tòa đó đã đặt giá** (UC-22). Mỗi tòa một bộ riêng.

---

## UC-34 · Lập hóa đơn tháng

**Ai dùng:** Manager

**Điều kiện trước**

- Phòng có hợp đồng **Đang hiệu lực**.
- Admin đã đặt giá dịch vụ cho tòa (UC-22).

**Luồng chính**

1. Manager chọn phòng, bấm "Tạo hóa đơn tháng".
2. Form tự điền: **kỳ tháng, tiền phòng, các phí cố định**.
3. Manager nhập **chỉ số điện, nước** (cũ và mới). Chỉ số cũ tự điền theo hóa đơn trước, Manager vẫn sửa được. Hệ thống tự tính tiền điện, tiền nước.
4. Thêm **chi phí phát sinh** nếu có (tên khoản, số tiền).
5. Xem lại tổng, bấm "Lưu nháp" → hóa đơn **Nháp**, hiện **mã hóa đơn**.

### Lập hàng loạt

Manager chọn nhiều phòng cùng lúc → hệ thống tạo hóa đơn **Nháp** cho từng phòng, tự điền tiền phòng và phí cố định. **Chỉ số điện nước nhập sau** cho từng phòng.

**Các trường hợp**

- **Manager hủy:** không lưu.
- **Chỉ số mới nhỏ hơn chỉ số cũ:** báo *"Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ"*.
- **Phòng đã có hóa đơn Nháp hoặc Chờ thanh toán trong cùng kỳ:** cảnh báo, hỏi Manager **tạo thêm** hay **sửa hóa đơn cũ**.
- **Dịch vụ của tòa chưa có giá áp dụng tại ngày lập:** cảnh báo *"Chưa có đơn giá [Dịch vụ X] cho tòa nhà này"*, **vẫn cho tiếp tục** với giá 0.

**Quy tắc**

- Tiền phòng lấy theo **giá đã chốt trên hợp đồng**, Admin đổi giá phòng sau này không ảnh hưởng.
- Đơn giá dịch vụ **chốt ngay lúc lập**, sau này Admin đổi giá cũng không ảnh hưởng hóa đơn này.
- Chi phí phát sinh **chỉ thêm được khi còn Nháp**.
- Mã hóa đơn **duy nhất**, không dấu, không khoảng trắng, vì nó là nội dung chuyển khoản. Dạng `HD` + năm tháng + 4 ký tự, ví dụ `HD2610K7QX`.

---

## UC-35 · Gửi hóa đơn

**Ai dùng:** Manager

**Điều kiện trước:** hóa đơn **Nháp**, hợp đồng của phòng **Đang hiệu lực**.

**Luồng chính**

1. Manager chọn hóa đơn Nháp, bấm "Gửi hóa đơn".
2. Hiện trang xem lại: **các khoản, tổng tiền, hạn thanh toán**.
3. Manager xác nhận → hệ thống **sinh mã QR VietQR** gồm **số tài khoản Admin, tổng tiền, mã hóa đơn làm nội dung**.
4. Hóa đơn chuyển **Chờ thanh toán**, lưu thời điểm gửi, đặt **hạn thanh toán = lúc gửi + 7 ngày**.
5. Gửi **thông báo trong ứng dụng và email kèm QR** cho người đại diện.
6. Báo *"Đã gửi hóa đơn thành công"*.

**Các trường hợp**

- **Manager hủy:** hóa đơn vẫn Nháp.
- **Hóa đơn không phải Nháp:** từ chối.
- **Gửi thông báo hoặc email lỗi:** hóa đơn **vẫn chuyển** Chờ thanh toán, cảnh báo *"Gửi thông báo thất bại — Customer chưa nhận được"*. Manager gửi lại thủ công.

**Quy tắc**

- Đã gửi thì **khóa**, muốn sửa phải hủy (UC-37) rồi lập lại.
- QR chứa **chính xác** số tài khoản Admin, số tiền bằng tổng hóa đơn, nội dung là mã hóa đơn. **Khách không sửa được số tiền.**
- Mỗi lần gửi lưu lại thời điểm gửi.

---

## UC-36 · Xem chi tiết hóa đơn

**Ai dùng:** Manager · Customer

**Danh sách**

- **Manager:** mọi hóa đơn của tòa, lọc theo trạng thái, kỳ tháng, phòng.
- **Customer:** hóa đơn của phòng mình, trừ hóa đơn nháp.

**Luồng chính**

1. Chọn hóa đơn → hiện **mã hóa đơn, kỳ tháng, các khoản chi tiết, tổng tiền, trạng thái, hạn thanh toán**.
2. **Customer** xem thêm **mã QR** và tình trạng **còn hạn / quá hạn**.
3. Hóa đơn đã thanh toán thì xem được **lịch sử thanh toán**: số tiền, ngày thanh toán, mã giao dịch SePay.

**Các trường hợp**

- **Hóa đơn Đã thanh toán:** hiện dấu **"Đã thanh toán"**, ngày thanh toán, **đúng hạn hay quá hạn**.
- **Customer xem hóa đơn phòng khác:** từ chối, báo không có quyền.

**Quy tắc**

- Customer chỉ xem hóa đơn phòng mình.
- **Đúng hạn / quá hạn** được tính ra, không lưu:
  - Đã thanh toán: đúng hạn khi ngày trả không sau hạn, quá hạn khi trả sau hạn.
  - Chưa thanh toán: quá hạn khi hôm nay đã qua hạn.

---

## UC-37 · Hủy hóa đơn

**Ai dùng:** Manager

**Dùng khi:** phát hiện sai sót như nhập sai chỉ số, thiếu phụ phí. Hủy rồi lập lại hóa đơn đúng.

**Điều kiện trước:** hóa đơn **Nháp** hoặc **Chờ thanh toán**.

**Luồng chính**

1. Manager chọn hóa đơn, bấm "Hủy hóa đơn".
2. Nhập **lý do hủy (bắt buộc)**, xác nhận.
3. Hóa đơn chuyển **Đã hủy**, lưu lý do.
4. Nếu hóa đơn đang **Chờ thanh toán**: gửi thông báo cho khách *"Hóa đơn [mã] đã được hủy bởi Manager"*. Báo thành công.

**Các trường hợp**

- **Manager hủy thao tác:** không thay đổi.
- **Hóa đơn Đã thanh toán:** từ chối, báo *"Không thể hủy hóa đơn đã thanh toán"*.
- **Không nhập lý do:** không cho xác nhận.

**Quy tắc**

- **Không bao giờ hủy hóa đơn đã thanh toán**, vì tiền đã về tài khoản Admin.
- Lý do hủy là **bắt buộc**, lưu cùng hóa đơn.
