
# Module notification

> Chuông thông báo trong ứng dụng: nhận, xem, đánh dấu đã đọc. **UC-41.**
> Module này chỉ **đọc** thông báo. Việc **tạo** thông báo nằm ở module sinh ra nó (hóa đơn, hợp đồng, sự cố, phân công...), qua helper dùng chung.

**Người làm:** BE An · FE Hiếu · Iter 1

---

## Vai trò trong hệ thống

Đây là hạ tầng dùng chung, không phải nghiệp vụ riêng lẻ. Mọi module khác đều gọi helper `notify()` để tạo thông báo, không module nào tự ghi thẳng vào cơ sở dữ liệu. Vì vậy helper này phải xong **sớm nhất trong iter 1**, trước khi các module khác cần tới.

**Mỗi người nhận có bản ghi riêng.** Manager gửi thông báo cho 20 phòng thì sinh 20 bản ghi, mỗi phòng một cái. Nhờ vậy trạng thái đã đọc của người này không ảnh hưởng người kia.

---

## UC-41 · Nhận và xem thông báo

**Ai dùng:** Admin, Manager, Customer

**Luồng chính**

1. Người dùng mở chuông hoặc mục Thông báo.
2. Hệ thống hiện danh sách **mới nhất trước**, cái chưa đọc có dấu hiệu riêng.
3. Bấm vào một thông báo → hiện nội dung đầy đủ, đồng thời đánh dấu đã đọc.
4. Có thể bấm **"Đánh dấu tất cả đã đọc"** để xử lý một lượt.

**Các trường hợp**

- **Chưa có thông báo nào:** hiện dòng báo trống.
- **Lỗi tải danh sách:** báo lỗi kỹ thuật.

**Quy tắc**

- Sắp xếp mới nhất trước.
- Đã đọc hay chưa tính **riêng từng người**.
- Thông báo **không bao giờ bị xóa**.

---

## Bấm vào thông báo thì mở đúng chỗ

Mỗi thông báo lưu **loại** và **mã bản ghi liên quan**. Giao diện dựa vào hai thứ đó để điều hướng, ví dụ thông báo hóa đơn mới thì mở đúng hóa đơn đó, thông báo đơn chấm dứt thì mở đúng đơn đó.

Có vài loại không gắn với bản ghi cụ thể, ví dụ thông báo chung từ Manager gửi cả tòa. Những cái đó bấm vào chỉ hiện nội dung, không điều hướng đi đâu.

---

## Các loại thông báo và ai nhận

| Loại                               | Sinh ra khi                                                          | Người nhận            |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------------ |
| Hóa đơn mới                     | Manager gửi hóa đơn                                              | Customer                 |
| Hóa đơn bị hủy                 | Manager hủy hóa đơn đã gửi                                    | Customer                 |
| Thanh toán thành công            | Tiền về, hóa đơn chuyển đã thanh toán                       | Customer, Manager, Admin |
| Nhắc thanh toán                   | Hệ thống nhắc theo lịch                                          | Customer                 |
| Hợp đồng được gia hạn        | Manager gia hạn                                                     | Customer                 |
| Hợp đồng đã kết thúc         | Hết hạn, hệ thống tự kết thúc                                 | Customer, Manager        |
| Đã hoàn tiền cọc               | Manager ghi nhận hoàn cọc                                         | Customer                 |
| Có đơn chấm dứt                | Manager lập đơn, **và cả các lần nhắc**                | Customer hoặc Admin     |
| Đơn chấm dứt được xác nhận | Khách xác nhận hoặc Admin duyệt                                 | Customer, Manager        |
| Đơn chấm dứt bị từ chối      | Admin từ chối đơn đơn phương                                 | Manager                  |
| Đơn chấm dứt bị hủy           | Manager hủy đơn                                                   | Customer                 |
| Được phân công tòa            | Admin gán tòa                                                      | Manager                  |
| Bị gỡ khỏi tòa                  | Admin gỡ hoặc thay người                                         | Manager                  |
| Cập nhật sự cố                  | Khách gửi sự cố mới, **và mỗi lần đổi trạng thái** | Manager hoặc Customer   |
| Thông báo chung                   | Manager gửi cả tòa, **và khi Admin cập nhật nội quy**   | Customer hoặc Manager   |

---

## Thông báo trong ứng dụng khác với email

Hai thứ này **tách rời nhau**:

- **Thông báo trong ứng dụng** phải luôn được tạo. Nó nằm trong cùng một lần ghi với dữ liệu nghiệp vụ, nên dữ liệu lưu được thì thông báo cũng có.
- **Email** gửi sau khi dữ liệu đã lưu xong. Gửi lỗi thì **không bao giờ** làm hỏng việc đã lưu, chỉ hiện cảnh báo cho người thao tác.

Nhờ vậy, mất kết nối tới dịch vụ gửi thư không bao giờ làm hỏng nghiệp vụ.

---

## Lịch sử nằm ngay trong danh sách thông báo

Hệ thống không có bảng riêng ghi lịch sử nhắc nhở hay lịch sử trạng thái sự cố. Những thứ đó chính là các bản ghi thông báo, tra bằng loại và mã bản ghi liên quan:

- **Đã nhắc đơn chấm dứt mấy lần:** đếm thông báo loại "có đơn chấm dứt" gắn với đơn đó.
- **Đã nhắc thanh toán mốc nào chưa:** tra thông báo loại "nhắc thanh toán" gắn với hóa đơn đó. Công việc chạy theo lịch kiểm tra trước khi gửi để không nhắc trùng.
- **Sự cố đã qua những trạng thái nào:** chuỗi thông báo loại "cập nhật sự cố" gắn với sự cố đó.

Vì thông báo không bị xóa nên các lịch sử này luôn đầy đủ.


## Chuông của Admin

Admin không nhận mọi thông báo trong hệ thống, chỉ nhận những gì liên quan trực tiếp tới mình:

- **Có đơn đơn phương chấm dứt chờ duyệt** — việc cần Admin xử lý, không ai làm thay được.
- **Thanh toán thành công** — tiền về tài khoản ngân hàng đứng tên Admin.

Những việc khác như sự cố, hóa đơn, gia hạn hợp đồng đều thuộc phạm vi Manager của tòa, Admin không nhận chuông để tránh nhiễu.
