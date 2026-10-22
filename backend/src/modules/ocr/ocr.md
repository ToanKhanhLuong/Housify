
# Module ocr

> Đọc số CCCD từ ảnh mặt trước, để đỡ phải gõ tay. Phục vụ **UC-31 (A2, A3)** và bước so CCCD ở **UC-06 (E04)**.
> **Làm nếu kịp.** Đây là phần cắt đầu tiên nếu trễ tiến độ, hệ thống vẫn chạy đủ khi không có nó.

**Người làm:** BE Toàn · Iter 3

**Quyền:** Manager, Customer.

---

## Luồng chính

1. Người dùng tải ảnh **CCCD mặt trước**.
2. Hệ thống đọc ảnh, tìm **dãy 12 chữ số**.
3. Đọc được → tự điền vào ô CCCD, **vẫn cho sửa**.
4. Người dùng đối chiếu với thẻ gốc, tích **"Đã đối chiếu với thẻ gốc"** rồi mới lưu.

**Các trường hợp**

- **Không đọc được số:** cảnh báo, chuyển sang **nhập tay**, vẫn bắt tích đối chiếu.
- **Ảnh mờ, sai định dạng:** yêu cầu tải lại.

**Quy tắc**

- OCR **chỉ gợi ý**, không tự quyết điều gì và **không tự lưu**. Người dùng luôn là người xác nhận cuối.
- **Chưa có OCR** thì mọi chỗ dùng nó chuyển sang nhập tay:
  - UC-31: nhập số CCCD bằng tay, vẫn tích đối chiếu.
  - UC-06: **bỏ qua** bước so số trên ảnh với số Manager đã nhập.
- Ở UC-06 khách **chưa có tài khoản**, nên không gọi được chức năng này từ giao diện. Nếu làm OCR thì module `activation` gọi OCR **ngay trên server** với ảnh khách gửi kèm form kích hoạt.

**Gợi ý kỹ thuật:** dùng thư viện miễn phí chạy ngay trên server (ví dụ Tesseract.js), không cần khóa API, chỉ cần đọc chữ số.
