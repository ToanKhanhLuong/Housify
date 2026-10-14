# Frontend Housify – hướng dẫn cho AI IDE và thành viên nhóm

Đọc thêm: `../AGENTS.md` (tổng quan), `../docs/api.md` (API để gọi), `../docs/use_case.md` (UC ↔ trang).

## Stack

React + Vite, react-router-dom 6, axios, React-Bootstrap 5, Tailwind CSS v4.
Viết JavaScript (`.jsx` cho component), không dùng TypeScript.
Thư viện khác (react-toastify, Recharts…) cài khi trang đầu tiên cần đến, không cài sẵn.

Chạy: `npm run dev` → http://localhost:5173. Backend phải chạy song song ở cổng 8686.

## Thư mục

| Thư mục                      | Chứa gì                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/api/`                   | `axios.js` (instance dùng chung) + mỗi module một file `<module>.api.js`. **Component không gọi axios trực tiếp** |
| `src/pages/<role>/<module>/` | Trang và modal riêng của trang. Role: `public`, `common`, `admin`, `manager`, `customer`                              |
| `src/components/common/`     | UI dùng chung toàn app (DataTable, FormInput, ConfirmModal…)                                                                    |
| `src/components/<module>/`   | Khối nghiệp vụ dùng lại ở nhiều role (OccupantForm, SignatureBox, PaymentQR…)                                              |
| `src/layouts/`               | Khung trang theo role: AdminLayout, ManagerLayout, CustomerLayout, AuthLayout                                                      |
| `src/constants/`             | `enums.js` (chép y hệt backend), `statusLabels.js`, `menus.js`                                                             |
| `src/context/`               | `AuthContext.jsx` – user đang đăng nhập, login, logout                                                                      |
| `src/mocks/`                 | Dữ liệu giả đúng format `docs/api.md`, dùng khi BE chưa xong API                                                          |
| `src/routes/index.jsx`       | Route toàn app, chia khối theo role – thêm route của mình vào đúng khối                                                  |

## Quy tắc giao diện

- **Bootstrap cho component**: `Button`, `Modal`, `Table`, `Form`, `Badge`, `Tabs`, `Card`, `Input`, `Select`của react-bootstrap.
- **Tailwind cho bố cục**: `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `w-*`. Tránh class Tailwind trùng tên Bootstrap: `container`, `collapse`, `visible`, `invisible` (nguy hiểm nhất là `collapse`, react-bootstrap dùng nó trong Navbar và Accordion).
- `index.css` xếp Bootstrap và Tailwind vào layer riêng, **không nạp preflight** của Tailwind. Không sửa thứ tự layer trong file này.
- Toàn bộ chữ hiển thị viết **tiếng Việt**. Tên biến, hàm, file viết tiếng Anh.
- Trạng thái luôn hiện bằng `<StatusBadge>` + `statusLabels.js`, không tự viết nhãn trong trang.
- Tiền hiện bằng `<MoneyText>` theo dạng 000 000 000 (khoảng trắng giữa hàng nghìn) , ngày giờ bằng `utils/format.js`. theo dạng dd/MM/yyyy, nếu cần thiết sâu hơn thì dd/MM/yyyy HH:mm
- Mỗi trang danh sách phải có trạng thái: đang tải (`<Loading>`), rỗng (`<EmptyState>`), lỗi (toast) sẽ biến mất sau 5 giây. và lỗi hiện dưới Input rõ ràng báo đỏ
- Form: hiện lỗi dưới từng ô, nút submit bị khóa khi đang gửi.
- Nghiêm cấm tuyệt đối : KHÔNG dùng dạng outline cho Button hay các Component, Độ bo viền góc các loại như Div, Component, Button ko cần thiết phải tròn, cố gắng vuông  vắn một chút,

## Gọi API

- Dùng instance trong `api/axios.js`. Nó tự gắn token, tự đăng xuất khi gặp 401, và **đã bóc sẵn một lớp**: `await roomApi.list()` trả về thẳng `{ success, data, message }`, lấy dữ liệu ở `.data`.
- Lỗi ném ra có dạng `{ status, message, errors }` – hiện `message`  cho người dùng.
- `baseURL` là `/api`, Vite chuyển tiếp sang backend (xem `vite.config.js`). Không cần file `.env`. Đổi cổng backend thì sửa `vite.config.js`.
- BE chưa xong thì code với mock đúng format trong `docs/api.md`, BE xong chỉ việc đổi lại lời gọi.

## Phân quyền

- `ProtectedRoute` chặn theo role. Manager chưa được phân công tòa chỉ thấy Hồ sơ, Đổi mật khẩu, Thông báo (BR-023).
- Ẩn nút theo quyền ở FE chỉ để gọn giao diện; BE vẫn kiểm tra lại.

## Không được làm

- Không tự tính tiền "chính thức" ở FE. `utils/calcInvoice.js` chỉ để hiện tạm trên form, số đúng là số BE trả về.
- Không sửa `constants/enums.js` khác với backend, enum phải giống y như Backend
- Không thêm thư viện UI khác (MUI, Ant Design…).
- Không dùng Redux – state dùng chung để trong Context.
