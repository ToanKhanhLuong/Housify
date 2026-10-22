# Module incident

> Khách báo sự cố, Manager xử lý. **UC-43, UC-44.**

**Người làm:** BE Hiếu · FE Mạnh · Iter 2

**Quyền**

- **Customer:** gửi sự cố, xem lịch sử và trạng thái các đơn mình đã gửi.
- **Manager:** xem và xử lý sự cố thuộc **tòa mình phụ trách**.

---

## Vòng đời một đơn sự cố

```
Chờ xử lý ──Manager tiếp nhận──▶ Đang xử lý ──Manager giải quyết──▶ Đã giải quyết
    │                                 │
    └──────────Manager từ chối────────┴──────────▶ Bị từ chối
```

- Mỗi lần đổi trạng thái, **khách nhận thông báo**.
- **Lịch sử trạng thái** của đơn chính là chuỗi thông báo "Cập nhật sự cố" gắn với đơn đó, không lưu riêng.

**Bốn loại sự cố:** Dịch vụ · Thiết bị · Vi phạm · Khác.

---

## UC-43 · Gửi báo cáo sự cố

**Ai dùng:** Customer

**Điều kiện trước:** hợp đồng của khách **Đang hiệu lực**.

**Luồng chính**

1. Khách bấm "Tạo báo cáo sự cố".
2. Form: **loại sự cố, tiêu đề, mô tả chi tiết**, **ảnh đính kèm** (tùy chọn).
3. Bấm "Gửi" → lưu đơn ở trạng thái **Chờ xử lý**, ghi nhận phòng, hợp đồng, thời gian gửi, sinh **mã đơn**.
4. **Manager của tòa** nhận thông báo và email: *"Có đơn báo cáo mới từ Phòng [X]"*.
5. Khách nhận xác nhận đơn đã gửi thành công.

**Các trường hợp**

- **Khách hủy:** không lưu.
- **Tiêu đề hoặc mô tả trống:** báo lỗi.
- **Ảnh quá dung lượng:** báo giới hạn, yêu cầu nén hoặc bỏ ảnh.

**Quy tắc**

- Khách chỉ gửi sự cố cho **tòa mình đang ở** theo hợp đồng Đang hiệu lực.
- Mỗi đơn có **mã duy nhất** và lưu đủ lịch sử trạng thái.
- Khách xem được **lịch sử và trạng thái** các đơn đã gửi.
- Ảnh sự cố là ảnh công khai, tải qua module `upload`.

---

## UC-44 · Xử lý báo cáo sự cố

**Ai dùng:** Manager

**Luồng chính**

1. Manager vào mục "Báo cáo sự cố" → danh sách đơn, lọc theo **trạng thái, loại, phòng, thời gian**.
2. Chọn đơn, bấm **"Tiếp nhận"** → đơn chuyển **Đang xử lý**. Khách nhận thông báo *"Đơn của bạn đang được xử lý"*.
3. Xử lý xong, bấm **"Đánh dấu đã giải quyết"** kèm **ghi chú kết quả** → đơn chuyển **Đã giải quyết**, lưu thời điểm giải quyết. Khách nhận thông báo *"Đơn của bạn đã được giải quyết"*.

**Các trường hợp**

- **Từ chối đơn** (không hợp lệ, không thuộc trách nhiệm tòa): Manager nhập **lý do** → đơn chuyển **Bị từ chối**, khách nhận thông báo kèm lý do.
- **Đơn đã Đã giải quyết hoặc Bị từ chối:** không cho đổi nữa, báo *"Đơn đã được xử lý"*.
- **Manager xem đơn tòa khác:** từ chối, báo không có quyền.

**Quy tắc**

- Manager chỉ xử lý đơn từ khách thuộc **tòa mình phụ trách**.
- Mỗi lần đổi trạng thái đều ghi **Manager nào xử lý**. Đơn đã giải quyết lưu **thời điểm giải quyết**.
- Khách nhận thông báo **mỗi khi trạng thái thay đổi**.
