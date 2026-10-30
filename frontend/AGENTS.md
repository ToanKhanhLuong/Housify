# Frontend Housify – Hướng dẫn cho thành viên và AI IDE

Đọc hết file này trước khi code. Không chắc chỗ nào thì hỏi Hiếu (FE lead) hoặc bạn BE làm module đó. **Không tự đoán.**

Muốn xem component trông thế nào: chạy `npm run dev` rồi mở **`/ui-kit`** (code ở `src/routes/UiKitPage.jsx`).

---

## 0. Tài liệu là nguồn sự thật

FE và BE cùng bám một bộ tài liệu. Code nào lệch tài liệu là code sai.

| Cần biết                                                                                | Đọc ở đâu                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Nghiệp vụ, luồng chính, trường hợp phụ (A1, A2…), lỗi (E01…), câu thông báo | `docs/use_case.md` + `backend/src/modules/<module>/<module>.md` |
| URL, request, response, mã lỗi                                                          | `docs/api.md`                                                     |
| Field, giá trị enum                                                                     | `docs/database.md`, `src/constants/enums.js`                    |
| Đường dẫn trang, menu từng role                                                      | `src/constants/menus.js` + mục 7 file này                       |
| Component trông thế nào, dùng ra sao                                                  | `/ui-kit` + `src/routes/UiKitPage.jsx`                          |

Quy tắc:

- Thứ tự ưu tiên khi lệch nhau: **Use Case → api.md → code**. Thấy lệch thì báo An, không tự sửa theo ý mình.
- FE gọi **đúng** endpoint và **đúng tên field** như `docs/api.md`. Thiếu thì nhắn bạn BE của module bổ sung api.md trước, **không tự bịa**.
- BE chưa xong → dùng dữ liệu giả **đúng hình dạng response** trong api.md (mục 8).
- **Giao diện học theo Odoo, nội dung bám UC.** Mọi field, cột, nút, tab, câu chữ phải có căn cứ trong UC:
  - **Hiển thị dữ liệu đã có** (field có sẵn, dữ liệu liên quan, giá trị tính ra như "còn X ngày") → được, miễn API trả về.
  - **Thêm tính năng, field hoặc API mới** → phải chốt với An trước.
  - Chữ trên nút, câu thông báo, câu khi danh sách trống: dùng **đúng chữ trong UC**. Ví dụ UC-33 là "Xóa khỏi phòng", không tự đổi thành chữ khác.

---

## 1. Luật không được phá

1. Chỉ sửa file trong `src/modules/<module của mình>/`. File chung (mục 11) chỉ Hiếu sửa.
2. Thứ cơ bản dùng thẳng **React-Bootstrap**, thứ ghép dùng **`src/components/`**. Không tự tạo Button/Input/Card riêng. Không dùng thẻ HTML thô `<button>`, `<input>`, `<select>`, `<table>`, `<form>`.
3. Nút chỉ có 4 variant: `primary`, `secondary`, `danger`, `success`. **Không dùng `outline-*`**, `link`, `light`, `dark`, `info`, `warning`.
4. Không màu cứng (`#hex`, `rgb()`, `text-[#...]`), không `style={{}}`, không viết file CSS riêng. **Không tự gắn `text-white`, `text-dark`**: nút, badge, thông báo đã tự đúng độ tương phản.
5. Component **không gọi axios trực tiếp**. Mọi lời gọi API đi qua `<module>.api.js`.
6. Không viết chuỗi trạng thái trần (`'AVAILABLE'`). So sánh dùng `ROOM_STATUS.AVAILABLE` trong `constants/enums.js`; hiển thị dùng `StatusBadge`.
7. Không import file trong module của người khác. Cần dùng chung → nhờ Hiếu đưa vào phần chung.
8. Không tự đặt đường dẫn trang. Path theo `constants/menus.js` và bảng ở mục 7.
9. **Bảng ở trang danh sách không có nút trong từng dòng.** Bấm dòng để mở chi tiết (hoặc mở modal sửa với danh mục nhỏ). Sửa, xóa, khóa… nằm ở trang chi tiết hoặc trong modal.
10. **Nút thao tác đặt bên trái**, nút chính đứng đầu: cạnh tiêu đề trang, trên tờ giấy chi tiết, ở chân modal.
11. Trường bắt buộc, hoặc UC đánh dấu là trường quan trọng (vd CCCD, ngày sinh ở UC-31) → thêm `required` để hiện `*` đỏ, ở cả form lẫn trang chi tiết. Tiêu đề cột bảng không gắn `*`.
12. Không cài thêm thư viện khi chưa hỏi Hiếu.

---

## 2. Công nghệ

React 19 + Vite · react-router-dom 6 · React-Bootstrap 2 (Bootstrap 5.3) · Tailwind CSS v4 (chỉ utilities, không preflight) · axios · react-toastify · react-icons (**chỉ bộ `bi`**). Font Inter nạp ở `index.html`.

Màu, cỡ chữ (14px), bo góc, kiểu nút… đặt một lần trong khối "Giao diện Housify" của `src/index.css`. Trang **không tự chỉnh giao diện chung**.

Chạy: `npm run dev` (BE phải đang chạy ở cổng 8686, Vite tự chuyển `/api` sang BE).

---

## 3. Cây thư mục

```
src/
├── api/           axios.js (instance chung), upload.api.js
├── components/    17 component dùng chung (mục 6)
├── constants/     enums.js, statusLabels.js, menus.js, regex.js
├── context/       AuthContext.jsx (useAuth)
├── layouts/       MainLayout, AuthLayout, Sidebar, Header, Brand
├── routes/        index.jsx (gom route), ProtectedRoute, GuestRoute, NotFoundPage, UiKitPage
├── utils/         session.js, format.js, formErrors.js
└── modules/
    └── <module>/
        ├── <module>.api.js       gọi API của module
        ├── <module>.routes.jsx   khai báo trang của module
        ├── XxxPage.jsx           các trang
        └── <module>.validate.js  kiểm tra dữ liệu nhập của các form trong module (tạo khi module có form)
        └── components/           modal, form, tab CHỈ module này dùng
```

Đặt file mới ở đâu:

- Chỉ module mình dùng → `modules/<module>/components/`.
- Nhiều module cần → báo Hiếu đưa vào `src/components/`.

16 module: `auth`, `activation`, `manager`, `notification`, `building`, `room`, `roomType`, `service`, `contract`, `occupant`, `invoice`, `payment`, `announcement`, `incident`, `termination`, `dashboard` (trùng tên module bên BE).

---

## 4. Đặt tên

| Loại                  | Quy tắc                                                   | Ví dụ                                     |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| Trang                  | `<Đối tượng><Việc>Page.jsx`                         | `RoomListPage`, `ContractDetailPage`    |
| Modal                  | `<Đối tượng><Việc>Modal.jsx`                        | `RoomTypeFormModal`, `LockManagerModal` |
| Tab                    | `<Đối tượng><Nội dung>Tab.jsx`                      | `ContractOccupantsTab`                    |
| File API               | `<module>.api.js`, `export default <module>Api`        | `roomApi.list()`                          |
| File route             | `<module>.routes.jsx`, `export default <module>Routes` | `roomRoutes`                              |
| Component              | PascalCase, `export default`                             |                                             |
| Hàm xử lý sự kiện | `handle<Việc>`                                          | `handleSubmit`, `handleDelete`          |
| State bật/tắt        | `show…`, `loading`, `submitting`, `is…`          | `showForm`, `isAdmin`                   |

---

## 5. Cần gì dùng nấy

| Cần                                       | Dùng                                                                                              | KHÔNG dùng                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Nút                                       | `Button` của react-bootstrap                                                                    | `<button>`, Button tự viết           |
| Ô nhập có nhãn + lỗi                  | `Input`                                                                                          | `Form.Group` tự ghép                 |
| Ô chọn                                   | `Select` + `toOptions()`                                                                       | `<select>`                             |
| Ô lọc trên thanh lọc trang danh sách    | `FilterSelect` (có `label` thì nhãn nằm trong ô)                                              | `Select` có nhãn nằm trên ô           |
| Đầu trang (tiêu đề + nút + bộ lọc) | `PageHeader`                                                                                     | `<h1>` tự đặt                       |
| Bảng danh sách                           | `DataTable`                                                                                      | `Table` tự dựng cho trang danh sách |
| Phân trang                                | `Pager` (khi API có `page`, `limit`, `total`)                                             | tự viết                                |
| Trạng thái                               | `StatusBadge`                                                                                    | `Badge` tự chọn màu                 |
| Thanh trạng thái ở trang chi tiết      | `StatusSteps`                                                                                    | tự vẽ                                  |
| Nhãn – giá trị ở trang chi tiết      | `FieldRow`                                                                                       | `<dl>`, bảng tự kẻ                  |
| Phần con trong trang chi tiết            | `Tabs` + `Tab` của react-bootstrap                                                            | tự làm tab                             |
| Tiền                                      | `MoneyText` hoặc `formatMoney()`                                                              | `toLocaleString` tự viết             |
| Ngày                                      | `formatDate`, `formatDateTime`, `formatPeriod`, `toDateInput`                              | tự cắt chuỗi ngày                    |
| Hỏi xác nhận                            | `ConfirmModal`                                                                                   | `window.confirm`                       |
| Form thêm/sửa                            | `Modal` của react-bootstrap, đặt trong `components/` của module                            | trang riêng cho form ngắn              |
| Ảnh                                       | `ImageUpload`                                                                                    | `<input type="file">`                  |
| Đang tải                                 | `SkeletonRows` giữ đúng bố cục danh sách; `Loading` cho chỗ nhỏ                                                                   | Spinner tự đặt                        |
| Không có dữ liệu                       | `EmptyState` (DataTable có sẵn)                                                                | chữ tự viết                           |
| Tải lỗi                                   | `ErrorState` trong khối bị lỗi, có nút "Thử lại"                                            | toast lỗi rồi để trống                 |
| Báo thành công/thất bại               | `toast` của react-toastify                                                                      | `alert()`, `Alert` tự bật tắt     |
| Thông báo nằm trên trang               | `Alert` variant `warning` / `info`                                                           |                                          |
| Icon                                       | `react-icons/bi`                                                                                 | bộ icon khác, emoji                    |
| Khối nội dung, tờ giấy chi tiết       | `Card` của react-bootstrap (không thêm bóng)                                                 | `div` tự kẻ viền, `shadow-*`      |
| Chia cột form                             | `Row` / `Col` của react-bootstrap                                                             |                                          |
| Bố cục                                   | Tailwind: `flex`, `grid`, `items-*`, `justify-*`, `w-*`, `max-w-*`, `md:grid-cols-*` |                                          |
| Khoảng cách                              | Bootstrap: `m-*`, `p-*`, `gap-*` từ 0 đến 5                                               | Tailwind kiểu `p-7`, `mt-[13px]`    |

Lưu ý: `p-3`, `gap-3`, `mb-4`… có ở cả Bootstrap lẫn Tailwind, **Bootstrap thắng**. Khoảng cách luôn tính theo thang Bootstrap (1 = 0.25rem, 2 = 0.5rem, 3 = 1rem, 4 = 1.5rem, 5 = 3rem).

---

## 6. Phần chung có sẵn

### Component (`src/components/`)

| Component        | Props                                                                                                                                                                                                | Ghi chú                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageHeader`   | `title`, `subtitle`, `backTo`, `actions`, `children`                                                                                                                                       | `actions`: nút, đặt ngay sau tiêu đề. `children`: đẩy sang phải (ô tìm, bộ lọc, `Pager`, `StatusSteps`). Trang chi tiết có thể bỏ `title`                                                                                                                                                                                      |
| `DataTable`    | `columns`, `data`, `loading`, `emptyMessage`, `rowKey` (mặc định `_id`), `onRowClick`                                                                                               | `columns = [{ key, title, render?, align?, className? }]`. `align: 'end'` cho cột số, tiền. Có sẵn khung, đang tải, trống                                                                                                                                                                                                                     |
| `Pager`        | `page`, `limit`, `total`, `onChange`                                                                                                                                                         | Hiện "1–20 / 57" + nút trước/sau                                                                                                                                                                                                                                                                                                                     |
| `StatusBadge`  | `map`, `value`                                                                                                                                                                                   | Badge nền nhạt, chữ đậm. `<StatusBadge map={INVOICE_STATUS_LABEL} value={invoice.status} />`                                                                                                                                                                                                                                                       |
| `StatusSteps`  | `map`, `steps`, `current`                                                                                                                                                                      | Thanh trạng thái hình mũi tên. Trạng thái ngoài luồng (vd `CANCELLED`) tự hiện ở cuối                                                                                                                                                                                                                                                      |
| `FieldRow`     | `label`, `required`, `children`                                                                                                                                                                | Nhãn đậm bên trái, giá trị bên phải. Chia 2 cột: bọc trong `<div className="grid lg:grid-cols-2 column-gap-5">`                                                                                                                                                                                                                              |
| `Input`        | `label`, `name`, `value`, `onChange`, `error`, `required`, `helpText`, `type`, `placeholder`, `disabled`, `readOnly`, `className` (mặc định `mb-3`)                     | Textarea: `as="textarea" rows={4}`. `required` chỉ hiện `*` đỏ. Prop khác truyền thẳng vào `Form.Control`                                                                                                                                                                                                                                 |
| `Select`       | `label`, `name`, `options` (`[{ value, label }]`), `placeholder` (mặc định `-- Chọn --`, truyền `null` để bỏ), `value`, `onChange`, `error`, `required`, `className` | `options={toOptions(ROOM_STATUS_LABEL)}`                                                                                                                                                                                                                                                                                                                |
| `FilterSelect` | `label`, `icon`, `name`, `options`, `placeholder`, `value`, `onChange`, `className` (mặc định `w-60`)                                                                 | Ô lọc đặt trong `PageHeader`. Có `label`: nhãn (kèm `icon` nếu có) nằm trong ô bên trái, vd `Tòa nhà` · `Housify Cầu Giấy`. Không `label`: icon phễu trong ô. `placeholder` là lựa chọn "Tất cả" (giá trị rỗng). Không báo lỗi, không dấu `*`                                                                                              |
| `MoneyText`    | `value`, `className`                                                                                                                                                                             | `1200000` → `1.200.000 ₫`                                                                                                                                                                                                                                                                                                                           |
| `ConfirmModal` | `show`, `title`, `message`, `children`, `confirmText`, `cancelText`, `variant`, `loading`, `onConfirm`, `onCancel`                                                               | Cần nhập lý do (UC-10, UC-37…) thì đặt `Input` làm `children`                                                                                                                                                                                                                                                                                 |
| `ImageUpload`  | `label`, `kind` (`PUBLIC` \| `CCCD`), `value`, `previewUrl`, `onChange`, `error`, `required`, `upload` (mặc định `true`), `disabled`                                      | Chọn ảnh là tải ngay. PUBLIC gửi `POST /uploads` → `onChange(url)`. CCCD gửi `POST /uploads/cccd` (không cần đăng nhập) → `onChange(publicId)`; ảnh đã có thì truyền `previewUrl` = `cccdFrontUrl` / `cccdBackUrl` lấy từ API hồ sơ. `upload={false}`: không tải, `onChange` nhận `File` (vd gửi sang OCR) |
| `Loading`      | không                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                                                           |
| `EmptyState`   | `message`, `children`                                                                                                                                                                            |                                                                                                                                                                                                                                                                                                                                                           |
| `SkeletonRows` | `rows`, `columns`, `media` | Khung xương khi đang tải: thanh xám phẳng đúng chỗ dữ liệu, bố cục không nhảy. `media` chừa ô ảnh 40px đầu dòng |
| `ControlBar`   | `actions`, `searchValue`, `onSearchChange`, `searchPlaceholder`, `filterGroups`, `selectedFilters`, `onFilterChange`, `groupByOptions`, `selectedGroupBy`, `onGroupByChange`, `count`, `view`, `onViewChange` | Thanh điều khiển Odoo một hàng (actions trái, search/facets/dropdown filter & group giữa, count + switch Thẻ/Bảng phải). Đi kèm helper `formatFilterQuery`, `groupArrayBy` (`src/utils/filter.js`) |
| `CardGrid`     | `children`, `minWidth`, `className` | Lưới thẻ responsive kiểu Odoo Kanban |
| `ItemCard`     | `to`, `onClick`, `image`, `placeholderText`, `title`, `badge`, `subtitle`, `stats`, `footer`, `children` | Thẻ đối tượng bấm được cả khối, hover viền đổi sang màu tím mận `#714B67` |
| `ModalForm`    | `show`, `onHide`, `title`, `onSubmit`, `submitText`, `cancelText`, `loading`, `onDelete`, `deleteText`, `size`, `children` | Modal form 2 cột chuẩn, nút Lưu/Hủy bên trái, nút Xóa bên phải |
| `ActionDropdown` | `title` (mặc định "Thao tác"), `items` (`[{ label, icon, onClick, danger, disabled, divider }]`), `align`, `children` | Nút "Thao tác ▾" xổ ra menu phụ / nguy hiểm ở trang chi tiết |
| `BlockedBox`   | `title`, `reasons`, `message`, `children` | Khung cảnh báo nền đỏ nhạt liệt kê các lý do bị chặn bởi ràng buộc nghiệp vụ |
| `ImageGalleryPicker` | `images`, `onChange`, `label`, `hint`, `disabled`, `maxImages` | Quản lý nhiều ảnh: ảnh đại diện lớn phía trên, hàng thumbnail nhỏ + nút tải lên bên dưới |
| `ErrorState`   | `message`, `detail`, `onRetry` | Lỗi tải trong một khối: câu nói rõ cái gì lỗi, `detail` là message của BE, nút "Thử lại" gọi `onRetry` |

### Đăng nhập (`useAuth()` trong `context/AuthContext.jsx`)

| Trả về                   | Ý nghĩa                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `user`                   | Kết quả `GET /auth/me`: `{ _id, email, role, status, name, phone?, building?, cccd? }`. `role` là số, so với `ROLE` |
| `loading`                | Đang kiểm tra token lúc mở app                                                                                               |
| `login(token, remember)` | Trang đăng nhập gọi sau khi API login thành công                                                                           |
| `logout()`               | Xóa phiên                                                                                                                      |
| `reloadUser()`           | Gọi lại sau khi sửa hồ sơ để header cập nhật tên                                                                       |

### Hằng số và tiện ích

| File                          | Có gì                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `constants/enums.js`        | `ROLE`, `USER_STATUS`, `ROOM_STATUS`, `CONTRACT_STATUS`… **Chép y hệt từ BE, không sửa tay** |
| `constants/statusLabels.js` | `ROLE_LABEL`, `<ENUM>_LABEL` (chữ tiếng Việt + màu), `toOptions()`                                     |
| `constants/menus.js`        | `MENUS`, `HOME_PATH`, `NO_BUILDING_PATHS`                                                                  |
| `constants/regex.js`        | `PHONE_REGEX`, `CCCD_REGEX`, `EMAIL_REGEX`, `PASSWORD_REGEX` (giống BE)                                 |
| `utils/format.js`           | `formatMoney`, `formatDate`, `formatDateTime`, `formatPeriod`, `toDateInput`                           |
| `utils/formErrors.js`       | `toFieldErrors(err.errors)` → `{ field: message }`                                                          |
| `utils/filter.js`           | `formatFilterQuery(filters)` đổi filter sang query chuẩn, `groupArrayBy(items, key)` gom nhóm mảng            |

---

## 7. Trang và quyền

### Khai báo route trong `<module>.routes.jsx`

```jsx
// Route của module room
import { ROLE } from '../../constants/enums';
import RoomListPage from './RoomListPage';
import RoomDetailPage from './RoomDetailPage';

const roomRoutes = [
  { path: '/rooms', element: <RoomListPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
  { path: '/rooms/:id', element: <RoomDetailPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
];

export default roomRoutes;
```

| Kiểu trang                         | Khai báo                              | Ví dụ                          |
| ----------------------------------- | -------------------------------------- | -------------------------------- |
| Trong hệ thống (có sidebar)      | `{ path, element, roles }`           | đa số trang                    |
| Chỉ cho người chưa đăng nhập | `{ path, element, guestOnly: true }` | `/login`, `/forgot-password` |
| Công khai                          | `{ path, element }`                  | `/activate/manager/:token`     |

`routes/index.jsx` tự gom route của 16 module, **không ai sửa file này**. Trang chi tiết lấy id bằng `const { id } = useParams();`.

### Bảng đường dẫn

Admin và Manager dùng chung path (Manager bị giới hạn theo tòa). Trang riêng của Customer có tiền tố `/my-`. Path con (`/:id`, `/new`…) do module tự đặt dưới path gốc.

| Đường dẫn                                                    | Module                                  | Ai vào                       |
| ---------------------------------------------------------------- | --------------------------------------- | ----------------------------- |
| `/login`, `/forgot-password`                                 | auth                                    | Chưa đăng nhập            |
| `/activate/manager/:token`, `/activate/contract/:token`      | activation                              | Công khai (link trong email) |
| `/change-password`, `/notifications`                         | auth, notification                      | Cả 3 role                    |
| `/profile`                                                     | auth                                    | Manager, Customer             |
| `/dashboard`, `/reports`                                     | dashboard                               | Admin, Manager                |
| `/buildings` · `/my-building` · `/rules`                 | building                                | Admin · Manager · Customer  |
| `/rooms`                                                       | room                                    | Admin, Manager                |
| `/room-types`, `/services`, `/managers`, `/terminations` | roomType, service, manager, termination | Admin                         |
| `/contracts` · `/my-contract`                               | contract                                | Manager · Customer           |
| `/occupants` · `/my-room`                                   | occupant                                | Manager · Customer           |
| `/invoices` · `/my-invoices`                                | invoice                                 | Manager · Customer           |
| `/payments` · `/my-payments`                                | payment                                 | Manager · Customer           |
| `/incidents` · `/my-incidents`                              | incident                                | Manager · Customer           |
| `/announcements`                                               | announcement                            | Manager                       |

### Ẩn/hiện theo role và trạng thái

- Trang dùng chung cho nhiều role thì ẩn/hiện nút theo `user.role`, ví dụ Manager chỉ xem phòng (BR-052):
  ```jsx
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;
  ```
- Nút ở trang chi tiết hiện **theo trạng thái, đúng UC** (xem mẫu ở mục 9).
- Ẩn nút ở FE chỉ để giao diện gọn. **BE mới là nơi chặn thật.**
- Manager chưa được phân công tòa (BR-023): layout tự chặn, trang không cần xử lý.
- Token hết hạn hoặc tài khoản bị khóa: `axios.js` tự đăng xuất, trang không cần xử lý.

---

## 8. Gọi API

- Mỗi module một file `<module>.api.js`, `export default` một object, **mỗi hàm = một endpoint trong api.md**.
- Path viết như trong api.md, **không có** tiền tố `/api` (axios đã tự thêm).
- Mỗi hàm trả về `{ success, data, message }`. Lỗi ném ra `{ status, message, errors }`.
- Request có file thì truyền `FormData`.
- API danh sách có `page`, `limit`, `total` thì dùng `Pager`; không có thì thôi.

```js
// API module roomType – path thật lấy trong docs/api.md, đây chỉ là ví dụ minh họa
import api from '../../api/axios';

const roomTypeApi = {
  list: (params) => api.get('/room-types', { params }),
  create: (data) => api.post('/room-types', data),
  update: (id, data) => api.put(`/room-types/${id}`, data),
  remove: (id) => api.delete(`/room-types/${id}`),
};

export default roomTypeApi;
```

### Dữ liệu giả khi BE chưa xong

Đặt ngay trong file api, **đúng hình dạng response trong api.md**, để trang không phải sửa khi chuyển sang API thật:

```js
const MOCK = true; // BE xong: xóa MOCK, MOCK_ROOM_TYPES, fake và các nhánh giả
const MOCK_ROOM_TYPES = [{ _id: '1', name: 'Phòng đơn' }];
const fake = (data) => Promise.resolve({ success: true, data, message: '' });

const roomTypeApi = {
  list: (params) => (MOCK ? fake(MOCK_ROOM_TYPES) : api.get('/room-types', { params })),
};
```

---

## 9. Hai khuôn mẫu trang chuẩn Odoo

Mọi trang nghiệp vụ làm theo một trong hai khuôn dưới đây theo đúng mockup tham chiếu (`docs/mock/`). Tên field trong mẫu là minh họa, **tên thật lấy theo api.md**.

### Quy ước chung của 2 khuôn trang:
1. **Trang danh sách (Khuôn 1 - List / Kanban View theo Main.dc.html)**:
   - Dùng `ControlBar` ở đầu: nút chính bên trái, ô search debounced 300ms + facet tags + dropdown filter/group ở giữa, số lượng bản ghi + switch Thẻ/Bảng ở bên phải.
   - Khi ở dạng thẻ: dùng `CardGrid` bọc các `ItemCard`. Bấm cả thẻ mở chi tiết.
   - Khi ở dạng bảng: dùng `DataTable`. Bấm dòng mở chi tiết.
   - Khi danh sách trống: dùng `EmptyState` với thông báo đúng theo UC.
   - Form thêm / sửa nhanh: dùng `ModalForm` (tiêu đề, body 2 cột, footer nút bên trái).

2. **Trang chi tiết (Khuôn 2 - Detail / Paper View theo BuildingDetail.dc.html & ManagerDetail.dc.html)**:
   - Đầu trang `PageHeader`: nút `backTo`, breadcrumbs dạng mảng (`['Tòa nhà', 'Housify Cầu Giấy']`), nút chỉnh sửa chính bên trái, nút `ActionDropdown` "Thao tác ▾" cho các hành động phụ / nguy hiểm (xóa, khóa, gỡ phân công), thanh trạng thái `StatusSteps` bên phải.
   - Khung giấy `.hf-paper`:
     - Khối thông tin định danh: ảnh đại diện lớn (hoặc placeholder) bên trái, tiêu đề lớn h1 + địa chỉ / phụ đề + các badge trạng thái bên phải.
     - Khối thông tin chi tiết: các `FieldRow` chia 2 cột (`<div className="grid lg:grid-cols-2 column-gap-5">`), trường bắt buộc / quan trọng có `required` hiện `*` đỏ.
     - Khối ảnh thu nhỏ: dùng `ImageGalleryPicker` hoặc hàng thumbnail.
     - Tab nội dung liên quan: dùng `Tabs` + `Tab` (ví dụ: Tab Phòng, Tab Giá dịch vụ, Tab Nội quy).
     - Ràng buộc nghiệp vụ bị chặn: dùng `BlockedBox` hiển thị rõ lý do vì sao không thể xóa / khóa.

Mọi trang làm theo một trong hai khuôn dưới đây. Tên field trong mẫu là minh họa, **tên thật lấy theo api.md**.

### 9.1 Danh mục: bảng + modal (vd loại phòng UC-20, dịch vụ UC-21)

Bấm dòng mở modal sửa, nút "Thêm" ở đầu trang, nút "Xóa" nằm trong modal sửa.

`RoomTypeListPage.jsx`

```jsx
// UC-20: quản lý loại phòng (Admin). Bấm dòng để sửa, xóa nằm trong form sửa
import { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import roomTypeApi from './roomType.api';
import RoomTypeFormModal from './components/RoomTypeFormModal';

const RoomTypeListPage = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null: đóng form · {}: thêm mới · loại phòng: sửa
  const [deleting, setDeleting] = useState(null); // loại phòng đang chờ xác nhận xóa
  const [submitting, setSubmitting] = useState(false);

  const loadRoomTypes = useCallback(async () => {
    try {
      const res = await roomTypeApi.list();
      setRoomTypes(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoomTypes();
  }, [loadRoomTypes]);

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await roomTypeApi.remove(deleting._id);
      toast.success('Xóa loại phòng thành công');
      setDeleting(null);
      loadRoomTypes();
    } catch (err) {
      toast.error(err.message); // vd UC-20 E02: loại phòng đang được sử dụng
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [{ key: 'name', title: 'Tên loại phòng', className: 'fw-semibold' }];

  return (
    <>
      <PageHeader
        title="Loại phòng"
        actions={
          <Button variant="primary" onClick={() => setEditing({})}>
            Thêm loại phòng
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={roomTypes}
        loading={loading}
        emptyMessage="Chưa có loại phòng nào"
        onRowClick={(row) => setEditing(row)}
      />

      {/* render có điều kiện: mỗi lần mở là một form mới, không sót dữ liệu lần trước */}
      {editing && (
        <RoomTypeFormModal
          roomType={editing}
          onHide={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadRoomTypes();
          }}
          onDelete={() => {
            setDeleting(editing); // đóng form rồi mới mở hộp xác nhận, không chồng 2 modal
            setEditing(null);
          }}
        />
      )}

      <ConfirmModal
        show={Boolean(deleting)}
        title="Xóa loại phòng"
        message={`Bạn chắc chắn muốn xóa loại phòng "${deleting?.name}"?`}
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
};

export default RoomTypeListPage;
```

`components/RoomTypeFormModal.jsx`

```jsx
// UC-20: form thêm / sửa loại phòng. roomType = {} là thêm mới, có _id là sửa
import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import { toFieldErrors } from '../../../utils/formErrors';
import roomTypeApi from '../roomType.api';

const RoomTypeFormModal = ({ roomType, onHide, onSaved, onDelete }) => {
  const isEdit = Boolean(roomType._id);
  const [form, setForm] = useState({ name: roomType.name ?? '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // kiểm tra nhanh ở FE để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại
    if (!form.name.trim()) {
      setErrors({ name: 'Vui lòng nhập tên loại phòng' });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) await roomTypeApi.update(roomType._id, form);
      else await roomTypeApi.create(form);
      toast.success(isEdit ? 'Cập nhật loại phòng thành công' : 'Thêm loại phòng thành công');
      onSaved();
    } catch (err) {
      setErrors(toFieldErrors(err.errors)); // 422: lỗi hiện dưới từng ô
      if (!err.errors) toast.error(err.message); // lỗi khác (vd UC-20 E01 trùng tên): toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">{isEdit ? 'Sửa loại phòng' : 'Thêm loại phòng'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Input
            label="Tên loại phòng"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            required
            className="mb-0"
          />
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Lưu
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
          {isEdit && (
            <Button variant="danger" className="ms-auto" onClick={onDelete} disabled={submitting}>
              Xóa
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RoomTypeFormModal;
```

Danh sách có trang chi tiết riêng (phòng, hợp đồng, hóa đơn…) thì `onRowClick={(row) => navigate(`/rooms/${row._id}`)}`, nút "Thêm" vẫn ở `actions`.

### 9.2 Trang chi tiết kiểu Odoo (vd hợp đồng UC-25)

Hàng nút bên trái + thanh trạng thái bên phải, bên dưới là tờ giấy (`Card`) với tiêu đề lớn, nhãn – giá trị chia 2 cột, phần con để trong `Tabs`. **Nút hiện theo trạng thái, đúng UC.**

```jsx
// UC-25: chi tiết hợp đồng (Manager). Nút theo trạng thái: UC-26 sửa, UC-27 gia hạn,
// UC-28 / UC-29 chấm dứt, UC-46 hủy hợp đồng nháp, UC-45 hoàn cọc. Mỗi nút mở một modal trong components/
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Tab, Tabs } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import StatusSteps from '../../components/StatusSteps';
import FieldRow from '../../components/FieldRow';
import MoneyText from '../../components/MoneyText';
import DataTable from '../../components/DataTable';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import { CONTRACT_STATUS } from '../../constants/enums';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import contractApi from './contract.api';

const STEPS = [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED];

const ContractDetailPage = () => {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadContract = useCallback(async () => {
    try {
      const res = await contractApi.detail(id);
      setContract(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  if (loading) return <Loading />;
  if (!contract) return <EmptyState message="Không tìm thấy hợp đồng" />;

  const { status } = contract;
  const isDraft = status === CONTRACT_STATUS.DRAFT;
  const isActive = status === CONTRACT_STATUS.ACTIVE;

  const occupantColumns = [
    { key: 'name', title: 'Họ tên', className: 'fw-medium' },
    { key: 'cccd', title: 'CCCD' },
    { key: 'phone', title: 'Số điện thoại' },
    { key: 'role', title: 'Vai trò', render: (row) => (row.isRepresentative ? 'Đại diện' : 'Ở cùng') },
    {
      key: 'actions',
      title: '',
      align: 'end',
      // bảng con trong trang chi tiết được có 1 nút cuối dòng; UC-33 chỉ áp dụng người ở cùng, hợp đồng ACTIVE
      render: (row) =>
        isActive &&
        !row.isRepresentative && (
          <Button variant="secondary" size="sm">
            Xóa khỏi phòng
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        backTo="/contracts"
        actions={
          <>
            {isActive && <Button variant="primary">Gia hạn</Button>}
            {(isDraft || isActive) && <Button variant="secondary">Chỉnh sửa</Button>}
            {isActive && <Button variant="secondary">Tạo đơn chấm dứt</Button>}
            {isActive && <Button variant="secondary">Đơn phương chấm dứt</Button>}
            {isDraft && <Button variant="secondary">Hủy hợp đồng</Button>}
            {/* UC-45: chỉ hợp đồng kết thúc đúng hạn và chưa hoàn cọc; điều kiện lấy theo dữ liệu API trả về */}
          </>
        }
      >
        <StatusSteps map={CONTRACT_STATUS_LABEL} steps={STEPS} current={status} />
      </PageHeader>

      <Card>
        <Card.Body className="p-4">
          <div className="small text-secondary">Hợp đồng thuê phòng</div>
          <h2 className="h3 fw-semibold mb-4">{contract.code}</h2>

          <div className="grid lg:grid-cols-2 column-gap-5 mb-4">
            <div>
              <FieldRow label="Phòng" required>{contract.room?.code}</FieldRow>
              <FieldRow label="Người đại diện" required>{contract.representative?.name}</FieldRow>
              <FieldRow label="Loại hợp đồng" required>
                {CONTRACT_TYPE_LABEL[contract.contractType]?.label}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Ngày bắt đầu" required>{formatDate(contract.startDate)}</FieldRow>
              <FieldRow label="Ngày kết thúc" required>{formatDate(contract.endDate)}</FieldRow>
              <FieldRow label="Giá thuê" required>
                <MoneyText value={contract.rentPrice} />
              </FieldRow>
              <FieldRow label="Tiền cọc" required>
                <MoneyText value={contract.deposit} />
              </FieldRow>
            </div>
          </div>

          <Tabs defaultActiveKey="occupants" className="mb-3">
            <Tab eventKey="occupants" title={`Cư dân (${contract.occupants?.length ?? 0})`}>
              <DataTable columns={occupantColumns} data={contract.occupants} />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </>
  );
};

export default ContractDetailPage;
```

---

## 10. Thông báo, lỗi và giao diện

### Thông báo và lỗi

| Tình huống                                                                                    | Cách hiện                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thành công                                                                                    | `toast.success('…')`, câu đúng UC                                                                                                                           |
| Thành công nhưng có cảnh báo (vd gửi mail lỗi)                                          | `res.data?.warning` có thì `toast.warning(res.data.warning)`, không có thì `toast.success(…)`                                                         |
| BE hỏi xác nhận thêm (409 ở API có cờ xác nhận trong api.md, vd thay Manager UC-11 A1) | Hiện `ConfirmModal` với `err.message`, bấm xác nhận thì gửi lại request kèm cờ đó. 409 ở API khác (trùng dữ liệu) xử lý như lỗi thường |
| Lỗi 422 (sai từng ô)                                                                         | Hiện dưới ô: `setErrors(toFieldErrors(err.errors))`                                                                                                         |
| Lỗi khác (trùng, không đủ điều kiện, mất mạng…)                                     | `toast.error(err.message)`. BE đã trả câu tiếng Việt, hiện thẳng                                                                                        |
| Danh sách trống                                                                               | `emptyMessage` đúng câu UC (thường ở A1). UC không ghi thì dùng "Chưa có <đối tượng> nào"                                                       |
| Cần xác nhận                                                                                 | `ConfirmModal`, câu hỏi đúng UC                                                                                                                             |
| Lưu ý cố định trên trang                                                                  | `Alert` variant `warning` hoặc `info`                                                                                                                      |

Không hiện lỗi kỹ thuật hay tiếng Anh cho người dùng.

### Giao diện

- **Trang danh sách:** `PageHeader` (tiêu đề + nút "Thêm…" + bên phải là ô tìm, bộ lọc, `Pager`) → `DataTable`. Bấm dòng để mở chi tiết.
- **Trang chi tiết:** `PageHeader` (nút theo trạng thái + `StatusSteps`) → `Card` tờ giấy (tiêu đề lớn, `FieldRow` 2 cột, `Tabs`).
- **Form:** trong `Modal`; form dài chia 2 cột bằng `Row` / `Col md={6}`. Chân modal: nút chính → Hủy ở bên trái, nút Xóa (nếu có) tách sang phải.
- **Nút:** đặt bên trái, nút chính đứng đầu, mỗi khu vực tối đa **1 nút `primary`**. Nút trong bảng con dùng `size="sm"`.
- **Màu nút:** `primary` hành động chính · `secondary` phụ, Hủy, Sửa · `danger` xóa, khóa, hủy đơn (dùng ở nút xác nhận) · `success` xác nhận, duyệt.
- **Nút gửi dữ liệu:** khi đang gửi thì `disabled` + `Spinner` như mẫu.
- **Số và tiền:** căn phải (`align: 'end'` trong `DataTable`).
- Không đặt độ rộng cố định bằng px. Không thêm bóng đổ.

---

## 11. Git và file chung

### File chung: chỉ Hiếu sửa

`src/api/`, `src/components/`, `src/layouts/`, `src/context/`, `src/routes/`, `src/constants/`, `src/utils/`, `App.jsx`, `main.jsx`, `index.css`, `index.html`, `vite.config.js`, `package.json`, `AGENTS.md`.

- Cần thêm nhãn trạng thái, component chung, thư viện… → nhắn Hiếu.
- Thêm hoặc sửa component chung thì cập nhật luôn `UiKitPage.jsx` và mục 6 file này.
- `constants/enums.js`: khi BE đổi thì chép đè từ `backend/src/constants/enums.js`, không sửa tay.

### Nhánh và commit

- Nhánh: `fe/feature/<module>`, tạo từ `main` mới nhất.
- Commit: `<loại>(<module>): <mô tả>`, loại gồm `feat`, `fix`, `refactor`, `style`, `docs`, `chore`. Ví dụ: `feat(roomType): danh sách và form loại phòng`.
- Đầu mỗi buổi code: `git pull origin main` rồi merge vào nhánh mình để không bị lệch xa.
- PR nhỏ, mỗi PR một module hoặc một nhóm UC.

### Checklist trước khi mở PR

- [ ] Chỉ sửa file trong module mình (`git diff --stat main`)
- [ ] Endpoint, tên field đúng `docs/api.md`; BE xong rồi thì đã xóa dữ liệu giả
- [ ] Đủ luồng chính + các trường hợp A*, E* trong UC; chữ trên nút và câu thông báo đúng UC
- [ ] Không thêm field, cột, nút, tab mà UC không có căn cứ
- [ ] Bảng danh sách không có nút trong dòng; nút thao tác đặt bên trái; nút hiện theo trạng thái
- [ ] Trường bắt buộc có `required`
- [ ] Không thẻ HTML thô, không `style={{}}`, không màu cứng, không `outline-*`, không chuỗi trạng thái trần
- [ ] Đã thử bằng role được vào và role không được vào
- [ ] `npm run lint` không lỗi, đã chạy `npm run format`
- [ ] Console trình duyệt không có lỗi đỏ

---

## 12. Dành cho AI IDE

- Trước khi viết code: đọc file này, `backend/src/modules/<module>/<module>.md`, mục UC tương ứng trong `docs/use_case.md`, mục module trong `docs/api.md`, và `src/routes/UiKitPage.jsx` để thấy cách dùng component.
- Chỉ tạo và sửa file trong `src/modules/<module>/`. Thấy cần sửa file chung (mục 11) → **dừng lại và báo người dùng**, không tự sửa.
- Không cài thư viện mới. Không tạo component trùng với `src/components/`.
- Không đoán endpoint hay field. Không có trong api.md → hỏi người dùng.
- Không thêm field, cột, nút, tab, tính năng mà UC không có. Giao diện học Odoo nhưng nội dung là của Housify.
- Làm theo một trong hai khuôn mẫu ở mục 9.
- Đầu mỗi file viết 1 dòng comment tiếng Việt: file làm gì, thuộc UC nào.
