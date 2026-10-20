
# Module upload

> Cổng duy nhất đưa ảnh lên Cloudinary. Không có use case riêng — đây là chức năng phục vụ cho các UC có ảnh.
> Ảnh **lưu trên Cloudinary**, còn database chỉ lưu chuỗi đường dẫn hoặc mã ảnh.

**Người làm:** BE Toàn · FE Hiếu (một ô chọn ảnh dùng chung cho mọi màn hình) · Iter 1

---

## Vì sao cần module này

Giao diện **không được** đưa ảnh thẳng lên Cloudinary. Làm vậy phải để khóa bí mật của Cloudinary trong code giao diện, ai mở trình duyệt cũng lấy được. Khi đó người lạ tải gì lên tài khoản của nhóm cũng được, và không chặn được việc xem ảnh CCCD.

Nên mọi ảnh đều đi qua backend: **giao diện → backend kiểm tra → Cloudinary → trả kết quả về giao diện.**

---

## Hai loại ảnh

| Loại                | Dùng cho                                 | Ai xem                                 | Trả về                                     |
| -------------------- | ----------------------------------------- | -------------------------------------- | -------------------------------------------- |
| **Công khai** | Ảnh tòa nhà, ảnh phòng, ảnh sự cố | Ai có đường dẫn cũng xem được | **Đường dẫn ảnh**                 |
| **Bảo vệ**   | Ảnh CCCD mặt trước, mặt sau          | Chỉ người có quyền                | **Mã ảnh**, không có đường dẫn |

**Ai được xem ảnh CCCD**

- **Của Manager:** chính Manager đó và Admin.
- **Của cư dân:** người đại diện của phòng và Manager của tòa.

Khi người có quyền mở hồ sơ, hệ thống mới tạo **link xem** cho ảnh CCCD. Việc tạo link này nằm ở module trả hồ sơ (`auth`, `manager`, `occupant`), không nằm ở module upload.

---

## Luồng chính

1. Người dùng chọn ảnh trên form và cho biết đây là ảnh **công khai** hay ảnh **CCCD**.
2. Giao diện gửi ảnh lên backend **ngay khi chọn**, trước khi bấm Lưu form.
3. Backend kiểm tra ảnh hợp lệ → đẩy lên Cloudinary đúng loại.
4. Trả về đường dẫn (ảnh công khai) hoặc mã ảnh (ảnh CCCD).
5. Giao diện giữ lại kết quả đó, khi bấm Lưu form thì gửi kèm theo.

**Ai được tải ảnh:** người **đã đăng nhập** (Admin, Manager, Customer).

**Ngoại lệ:** khách ở bước kích hoạt (UC-06) **chưa có tài khoản**, nên không dùng được cổng này. Ảnh CCCD của khách được **gửi kèm luôn trong form kích hoạt**.

---

## Các trường hợp

- **Không phải file ảnh:** từ chối, báo "Chỉ chấp nhận file ảnh".
- **Ảnh lớn hơn 5MB:** từ chối, báo vượt dung lượng, yêu cầu nén hoặc chọn ảnh khác.
- **Ảnh CCCD mờ, không đọc được:** hệ thống **không tự nhận ra** ảnh mờ. Người duyệt hồ sơ (Manager, Admin) xem và yêu cầu tải lại nếu cần.
- **Lỗi kết nối Cloudinary:** báo thử lại, không lưu gì.
- **Tải ảnh lên rồi nhưng không bấm Lưu form:** ảnh nằm thừa trên Cloudinary. **Chấp nhận**, không dọn, vì gói miễn phí đủ dung lượng cho dự án.
- **Bỏ ảnh cũ khỏi phòng hoặc tòa:** chỉ bỏ khỏi danh sách trong database, **không xóa** file trên Cloudinary.

---

## Ai dùng module này

| Module         | Ảnh gì                                                                             |
| -------------- | ------------------------------------------------------------------------------------ |
| `building`   | Ảnh tòa nhà (công khai)                                                          |
| `room`       | Ảnh phòng (công khai)                                                             |
| `incident`   | Ảnh đính kèm sự cố (công khai)                                                |
| `auth`       | Manager tự tải ảnh CCCD lần đầu (bảo vệ)                                     |
| `manager`    | Admin sửa ảnh CCCD Manager (bảo vệ)                                              |
| `occupant`   | Cập nhật ảnh CCCD cư dân (bảo vệ)                                             |
| `activation` | Ảnh CCCD khách lúc kích hoạt — **gửi kèm form, không qua cổng này** |
