# Module announcement

> Manager gửi thông báo cho khách trong tòa. **UC-40.**
> Khách nhận và đọc thông báo qua chuông, thuộc module `notification` (UC-41).

**Người làm:** BE Toàn · FE Mạnh · Iter 2

**Quyền:** chỉ **Manager**, chỉ gửi cho khách thuộc **tòa mình phụ trách**.

---

## Lưu ở đâu

Không có bảng riêng cho thông báo chung. Mỗi người nhận có **một bản ghi thông báo** riêng (loại "Thông báo chung"), ghi rõ người gửi là Manager. Gửi cho 20 phòng thì sinh 20 bản ghi.

**Ai là người nhận:** **người đại diện** của các phòng đang có hợp đồng Đang hiệu lực. Người ở cùng không có tài khoản nên không nhận.

---

## UC-40 · Gửi thông báo đến Customer

**Ai dùng:** Manager

**Điều kiện trước:** tòa có ít nhất một khách đang hoạt động.

**Luồng chính**

1. Manager bấm "Gửi thông báo".
2. Form: **tiêu đề, nội dung, đối tượng nhận**:
   - **Tất cả** khách trong tòa, hoặc
   - **Chọn phòng cụ thể** (chỉ chọn được phòng đang có hợp đồng hiệu lực).
3. Bấm "Gửi" → tạo thông báo cho từng khách được chọn, gửi email, hiện trong chuông.
4. Báo *"Đã gửi thành công đến X tài khoản"*.

**Nội dung thường gặp:** lịch bảo trì, thay đổi nội quy, nhắc nhở, thông tin chung.

**Các trường hợp**

- **Manager hủy trước khi gửi:** không lưu.
- **Tòa không có khách nào đang hoạt động:** báo *"Không có tài khoản Customer nào để gửi thông báo"*.
- **Tiêu đề hoặc nội dung trống:** báo lỗi.
- **Gửi email lỗi:** thông báo trong ứng dụng **vẫn được tạo**, cảnh báo một số email gửi thất bại.

**Quy tắc**

- Manager chỉ gửi cho khách thuộc **tòa mình phụ trách**.
- Thông báo lưu đủ **người gửi, thời gian, nội dung, danh sách người nhận** và **không được xóa**.
