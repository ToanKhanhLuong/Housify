# Module dev

> Công cụ hỗ trợ kiểm thử và trình diễn hệ thống, không thuộc use case nghiệp vụ của người dùng cuối.
> Chỉ bật khi biến môi trường `ENABLE_DEV_ROUTES` được đặt là `true`; khi tắt thì mọi đường dẫn trong module này trả lỗi không tìm thấy.

**Người làm:** BE Toàn · BE An (phần kích hoạt các công việc tự động) · Chỉ gọi qua công cụ kiểm thử API, không có giao diện người dùng.

**Quyền:** chỉ **Admin**.

---

## Chạy công việc tự động ngay lập tức

**Mục đích**

- Giúp chạy ngay một công việc định kỳ theo tên mà không phải chờ tới giờ hẹn của hệ thống khi kiểm thử hoặc trình diễn.

**Các công việc hỗ trợ chạy ngay**

- **Nhắc và tự xác nhận đơn chấm dứt thỏa thuận:** quét các đơn chấm dứt hai bên thỏa thuận đang chờ xử lý để gửi nhắc nhở vào các mốc ngày 1, 3, 6 kể từ ngày tạo đơn, hoặc tự động xác nhận khi đã đủ từ 7 ngày trở lên (UC-28).
- **Kết thúc hợp đồng theo đơn chấm dứt tới ngày hiệu lực:** quét các đơn chấm dứt đã xác nhận có ngày hiệu lực đã tới hoặc đã qua để kết thúc hợp đồng, trả phòng về trạng thái trống và cập nhật cư dân sang đã chuyển đi (UC-28, UC-29).
- **Kết thúc hợp đồng hết hạn tự nhiên:** quét các hợp đồng đang hiệu lực đã tới hoặc qua ngày kết thúc mà không có đơn chấm dứt đã xác nhận để kết thúc hợp đồng, hủy các đơn chấm dứt còn đang chờ của hợp đồng đó, trả phòng về trống và chuyển cư dân sang đã chuyển đi (UC-45).
- **Đổi trạng thái tài khoản sau 24 giờ kể từ khi kết thúc hợp đồng:** ngưng hoạt động tài khoản người đại diện (với hợp đồng hết hạn hoặc chấm dứt thỏa thuận) hoặc khóa tài khoản (với hợp đồng chấm dứt đơn phương) sau 24 giờ kể từ khi hợp đồng kết thúc nếu khách không còn hợp đồng đang hiệu lực nào khác.
- **Nhắc thanh toán hóa đơn:** chạy công việc nhắc thanh toán hóa đơn theo các mốc trước và sau hạn (UC-49).

**Các trường hợp**

- **Chưa bật cấu hình cho phép đường dẫn kiểm thử:** hệ thống từ chối và báo "Không tìm thấy".
- **Người gọi không phải Admin:** hệ thống từ chối quyền truy cập.
- **Tên công việc không tồn tại trong danh sách hỗ trợ:** hệ thống báo không tìm thấy công việc kèm danh sách các tên công việc hợp lệ.
