
# Module dev

> Công cụ hỗ trợ **test và demo**, không thuộc use case nào.
> Chỉ bật khi `.env` có `ENABLE_DEV_ROUTES=true`, tắt thì mọi đường dẫn ở đây trả "Không tìm thấy". Bản deploy để demo vẫn bật được, xong demo thì tắt.

**Người làm:** BE Toàn (Iter 2) · An thêm phần chạy việc tự động (Iter 3) · Không có giao diện, gọi bằng Postman.

**Quyền:** chỉ **Admin**.

---

## 1. Tạo dữ liệu test

**Dùng khi:** cần dữ liệu để làm và test mà không phải đợi module người khác xong. Ví dụ Toàn cần hợp đồng Đang hiệu lực để lập hóa đơn trong khi module hợp đồng chưa làm xong.

Gọi một lần, hệ thống tạo sẵn:

- Một tòa nhà, vài phòng, một loại phòng.
- Dịch vụ điện, nước, gửi xe, **đã đặt giá** cho tòa.
- Một tài khoản khách đang hoạt động, kèm hồ sơ người đại diện.
- Một hợp đồng **Đang hiệu lực** cho một phòng, phòng đó ở trạng thái Đang thuê.

**Quy tắc**

- Ghi thẳng vào database, **không đi qua** service của các module khác, nên dùng được ngay cả khi các module đó chưa code xong.
- Dữ liệu có tên dễ nhận ra (ví dụ "Tòa Test"), để biết đâu là dữ liệu giả.
- Mỗi người chạy trên database riêng của mình, không ảnh hưởng ai.

---

## 2. Giả lập SePay báo tiền về

**Dùng khi:** test thanh toán (UC-38) mà không chuyển khoản thật.

Truyền **mã hóa đơn** và **số tiền** → hệ thống xử lý **y hệt** như SePay báo thật: kiểm tra trùng, tìm hóa đơn, chuyển Đã thanh toán, gửi thông báo cho cả ba vai trò.

Gọi hai lần với cùng mã giao dịch để test trường hợp SePay báo trùng.

---

## 3. Chạy việc tự động ngay

**Dùng khi:** test các việc chạy theo lịch mà không phải chờ tới cuối ngày.

| Tên việc               | Làm gì                                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| `contractExpiry`       | Kết thúc hợp đồng hết hạn (UC-45)                                |
| `accountAfterEnd`      | Ngưng hoặc khóa tài khoản sau 24 giờ                              |
| `terminationReminder`  | Nhắc đơn chấm dứt ngày 1, 3, 6 và tự xác nhận ngày 7 (UC-28) |
| `terminationEffective` | Kết thúc hợp đồng tới ngày hiệu lực của đơn (UC-28, UC-29)  |
| `paymentReminder`      | Nhắc thanh toán theo các mốc (UC-49)                                |

**Mẹo test mốc ngày:** sửa ngày trong database bằng Compass (ví dụ lùi ngày tạo đơn chấm dứt về 7 ngày trước), rồi chạy việc tương ứng ngay.
