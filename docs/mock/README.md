# Mockup giao diện Housify – iter 1

Bản vẽ tham chiếu cho FE. Xem trực quan trên canvas "Housify Admin – Mockup giao diện" (claude.ai) – bấm Play trên từng artboard để thử.

## Quy tắc dùng (bắt buộc)

- Đây là **bản vẽ tham chiếu**: lấy bố cục, chữ trên nút, câu thông báo, các trạng thái (rỗng, lỗi, bị chặn, chỉ xem).
- **KHÔNG chép cú pháp mockup** (`{{ }}`, `<sc-if>`, `<sc-for>`, `<dc-import>`, `class Component extends DCLogic`) vào code React.
- **KHÔNG import `mockup-style.css`** vào dự án: file dùng tên lớp `.btn`, `.card`, `.modal`, `.badge`… trùng React-Bootstrap, sẽ làm vỡ giao diện. Chỉ đọc để lấy màu, khoảng cách, bo góc rồi đưa vào khối "Giao diện Housify" trong `frontend/src/index.css` theo quy ước `frontend/AGENTS.md`.
- **Dữ liệu trong mockup là dữ liệu mẫu** (tên, giá, số lượng). Code thật lấy từ API theo `docs/api.md`.
- Field hiển thị phải có trong `docs/database.md`. Mockup lệch tài liệu thì theo tài liệu.

## Cách đọc file `.dc.html`

- Phần HTML trong `<x-dc>` là giao diện. `class="..."` tra trong `mockup-style.css`.
- `{{ ten }}` = giá trị tính trong hàm `renderVals()` ở cuối file.
- `<sc-if value="{{ x }}">` = chỉ hiện khi `x` đúng. `<sc-for list="{{ ds }}" as="it">` = lặp danh sách.
- `onClick="{{ ham }}"` = xử lý khi bấm; logic nằm trong `renderVals()`.
- `constructor` chứa trạng thái ban đầu và dữ liệu mẫu.
- `data-props` (thẻ script cuối file) = tham số đổi trạng thái màn, ví dụ `startModal`, `role`.
- `<dc-import name="Sidebar">` = nhúng file `Sidebar.dc.html`.

## Danh sách file

| File | Màn hình | Tham số trạng thái | Người làm FE |
|---|---|---|---|
| `Sidebar.dc.html` | Menu trái theo vai trò (mục chưa làm để mờ) | `role`: admin / manager / managerNoBuilding / customer | An (khung chung) |
| `Topbar.dc.html` | Thanh trên: tiêu đề, chuông, menu tài khoản, xác nhận đăng xuất | `role`, `startOpen`: bell / user / logout | An (khung) – chuông: Hiếu |
| `Main.dc.html` | Danh sách tòa nhà (thẻ / bảng, bộ lọc, modal thêm) | `startModal`: create | Mạnh |
| `BuildingDetail.dc.html` | Chi tiết tòa: tab Phòng (theo tầng / bảng, bộ lọc), Giá dịch vụ, Nội quy; modal sửa tòa, quản lý tầng, thêm phòng, xóa bị chặn | `role`: admin / manager; `startTab`: rooms / prices / rules; `startModal`: edit / floors / roomCreate / delete | Mạnh |
| `RoomDetail.dc.html` | Chi tiết phòng, modal sửa, xác nhận xóa | `role`; `startModal`: edit / delete | Mạnh |
| `RoomTypes.dc.html` | Loại phòng (thẻ, modal thêm / sửa có sức chứa, xóa bị chặn) | `startModal`: create / edit / blocked | Mạnh |
| `Rules.dc.html` | Nội quy – Khách thuê xem | – | Mạnh |
| `Services.dc.html` | Dịch vụ (thẻ, bộ lọc, nhóm theo cách tính) + modal giá theo tòa, cảnh báo ngày quá khứ | `startModal`: create / price | Hiếu |
| `Notifications.dc.html` | Trang thông báo (Tất cả / Chưa đọc, đánh dấu đã đọc) | `role` | Hiếu |
| `ErrorPage.dc.html` | 404 / 403 | `code`: 404 / 403 | Hiếu (nền FE) |
| `Managers.dc.html` | Danh sách Manager (cột theo trạng thái, bộ lọc, modal thêm) | `startModal`: create | Hưng |
| `ManagerDetail.dc.html` | Chi tiết Manager, nút theo trạng thái; modal sửa, khóa (lý do), mở khóa, phân công tòa (có thay thế), gỡ phân công, xóa | `status`: ACTIVE / PENDING / LOCKED; `startModal`: edit / lock / unlock / assign / delete | Hưng |
| `Login.dc.html` | Đăng nhập Email / CCCD, các lỗi | `err`: wrong / locked / pending / inactive | Hưng |
| `ForgotPassword.dc.html` | Quên mật khẩu 3 bước | `step`: 1 / 2 / 3 | Hưng |
| `ActivateManager.dc.html` | Kích hoạt Manager, link hết hạn | `state`: valid / invalid | Hưng |
| `ChangePassword.dc.html` | Đổi mật khẩu | `role` | Hưng |
| `Profile.dc.html` | Hồ sơ Manager / Khách thuê / Manager chưa có tòa | `role`: manager / managerNoBuilding / customer | Hưng |
| `mockup-style.css` | Kiểu dáng của mockup – chỉ để tham khảo, KHÔNG import | – | – |

## Khuôn chung rút ra từ mockup

- **Trang danh sách**: thanh điều khiển một hàng (nút chính trái · ô tìm kiếm kiểu Odoo có bảng thả xuống Bộ lọc / Nhóm theo · số bản ghi + đổi Thẻ / Bảng). Mặc định dạng thẻ. Bấm thẻ / dòng mở chi tiết, không có nút trong dòng.
- **Trang chi tiết**: thanh thao tác (nút theo trạng thái bên trái, các bước trạng thái bên phải) → khối "tờ giấy" (tiêu đề lớn, thông tin 2 cột, tab).
- **Danh mục nhỏ** (loại phòng, dịch vụ): thẻ + modal thêm / sửa; Xóa nằm trong modal.
- **Thao tác nguy hiểm hoặc ít dùng** (Xóa tòa): gom vào nút "Thao tác ▾".
- **Bị chặn**: hiện lý do cụ thể từ BE (modal hoặc khung đỏ), không chỉ báo "thất bại".
