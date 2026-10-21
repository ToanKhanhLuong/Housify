# Frontend Housify – Hướng dẫn cho thành viên và AI IDE

Đọc hết file này trước khi code. Không chắc chỗ nào thì hỏi Hiếu (FE lead) hoặc bạn BE làm module đó. **Không tự đoán.**

---

## 0. Tài liệu là nguồn sự thật

FE và BE cùng bám một bộ tài liệu. Code nào lệch tài liệu là code sai.

| Cần biết                                                                                | Đọc ở đâu                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Nghiệp vụ, luồng chính, trường hợp phụ (A1, A2…), lỗi (E01…), câu thông báo | `docs/use_case.md` + `backend/src/modules/<module>/<module>.md` |
| URL, request, response, mã lỗi                                                          | `docs/api.md`                                                     |
| Field, giá trị enum                                                                     | `docs/database.md`, `src/constants/enums.js`                    |
| Đường dẫn trang, menu từng role                                                      | `src/constants/menus.js` + mục 7 file này                       |

Quy tắc:

- Thứ tự ưu tiên khi lệch nhau: **Use Case → api.md → code**. Thấy lệch thì báo An, không tự sửa theo ý mình.
- FE gọi **đúng** endpoint và **đúng tên field** như `docs/api.md`. Thiếu field hoặc endpoint → nhắn bạn BE của module bổ sung vào api.md trước, **không tự bịa**.
- BE chưa xong → dùng dữ liệu giả **đúng hình dạng response** trong api.md (mục 8).
- Câu thông báo, chữ trên nút, câu khi danh sách trống: lấy **đúng câu trong UC**.

---

## 1. Luật không được phá

1. Chỉ sửa file trong `src/modules/<module của mình>/`. File chung (mục 11) chỉ Hiếu sửa.
2. Thứ cơ bản dùng thẳng **React-Bootstrap**, thứ ghép dùng **`src/components/`**. Không tự tạo Button/Input/Card riêng. Không dùng thẻ HTML thô `<button>`, `<input>`, `<select>`, `<table>`, `<form>`.
3. Nút chỉ có 4 variant: `primary`, `secondary`, `danger`, `success`. Không dùng `outline-*`, `link`, `light`, `dark`, `info`, `warning`.
4. Không màu cứng (`#hex`, `rgb()`, `text-[#...]`), không `style={{}}`, không viết file CSS riêng. Màu dùng class của Bootstrap (`text-secondary`, `bg-body-tertiary`, `text-danger`…).
5. Component **không gọi axios trực tiếp**. Mọi lời gọi API đi qua `<module>.api.js`.
6. Không viết chuỗi trạng thái trần (`'AVAILABLE'`). So sánh dùng `ROOM_STATUS.AVAILABLE` trong `constants/enums.js`; hiển thị dùng `StatusBadge`.
7. Không import file trong module của người khác. Cần dùng chung → nhờ Hiếu đưa vào phần chung.
8. Không tự đặt đường dẫn trang. Path theo `constants/menus.js` và bảng ở mục 7.
9. Không cài thêm thư viện khi chưa hỏi Hiếu.

---

## 2. Công nghệ

React 19 + Vite · react-router-dom 6 · React-Bootstrap 2 (Bootstrap 5.3) · Tailwind CSS v4 (chỉ utilities, không preflight) · axios · react-toastify · react-icons (**chỉ bộ `bi`**).

Chạy: `npm run dev` (BE phải đang chạy ở cổng 8686, Vite tự chuyển `/api` sang BE, không cần `.env`).

---

## 3. Cây thư mục

```
src/
├── api/           axios.js (instance chung), upload.api.js
├── components/    10 component dùng chung (mục 5)
├── constants/     enums.js, statusLabels.js, menus.js, regex.js
├── context/       AuthContext.jsx (useAuth)
├── layouts/       MainLayout, AuthLayout, Sidebar, Header
├── routes/        index.jsx (gom route), ProtectedRoute, GuestRoute, NotFoundPage
├── utils/         session.js, format.js, formErrors.js
└── modules/
    └── <module>/
        ├── <module>.api.js       gọi API của module
        ├── <module>.routes.jsx   khai báo trang của module
        ├── XxxPage.jsx           các trang
        └── components/           modal, form, tab CHỈ module này dùng
```

Đặt file mới ở đâu:

- Chỉ module mình dùng → `modules/<module>/components/`.
- Nhiều module cần → báo Hiếu đưa vào `src/components/`.

16 module: `auth`, `activation`, `manager`, `notification`, `building`, `room`, `roomType`, `service`, `contract`, `occupant`, `invoice`, `payment`, `announcement`, `incident`, `termination`, `dashboard` (trùng tên module bên BE).

---

## 4. Đặt tên

| Loại                  | Quy tắc                                                   | Ví dụ                                 |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------- |
| Trang                  | `<Đối tượng><Việc>Page.jsx`                         | `RoomListPage`, `RoomDetailPage`    |
| Modal                  | `<Đối tượng><Việc>Modal.jsx`                        | `RoomFormModal`, `LockManagerModal` |
| Tab                    | `<Đối tượng><Nội dung>Tab.jsx`                      | `BuildingRulesTab`                    |
| File API               | `<module>.api.js`, `export default <module>Api`        | `roomApi.list()`                      |
| File route             | `<module>.routes.jsx`, `export default <module>Routes` | `roomRoutes`                          |
| Component              | PascalCase, `export default`                             |                                         |
| Hàm xử lý sự kiện | `handle<Việc>`                                          | `handleSubmit`, `handleDelete`      |
| State bật/tắt        | `show…`, `loading`, `submitting`, `is…`          | `showForm`, `isAdmin`               |

---

## 5. Cần gì dùng nấy

| Cần                         | Dùng                                                                                              | KHÔNG dùng                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Nút                         | `Button` của react-bootstrap                                                                    | `<button>`, Button tự viết           |
| Ô nhập có nhãn + lỗi    | `Input`                                                                                          | `Form.Group` tự ghép                 |
| Ô chọn                     | `Select` + `toOptions()`                                                                       | `<select>`                             |
| Bảng danh sách             | `DataTable`                                                                                      | `Table` tự dựng cho trang danh sách |
| Đầu trang                  | `PageHeader`                                                                                     | `<h1>` tự đặt                       |
| Trạng thái                 | `StatusBadge`                                                                                    | `Badge` tự chọn màu                 |
| Tiền                        | `MoneyText` hoặc `formatMoney()`                                                              | `toLocaleString` tự viết             |
| Ngày                        | `formatDate`, `formatDateTime`, `formatPeriod`, `toDateInput`                              | tự cắt chuỗi ngày                    |
| Hỏi xác nhận              | `ConfirmModal`                                                                                   | `window.confirm`                       |
| Form thêm/sửa              | `Modal` của react-bootstrap, đặt trong `components/` của module                            | trang riêng cho form ngắn              |
| Ảnh                         | `ImageUpload`                                                                                    | `<input type="file">`                  |
| Đang tải                   | `Loading` (DataTable có sẵn)                                                                   | Spinner tự đặt                        |
| Không có dữ liệu         | `EmptyState` (DataTable có sẵn)                                                                | chữ tự viết                           |
| Báo thành công/thất bại | `toast` của react-toastify                                                                      | `alert()`, `Alert` tự bật tắt     |
| Icon                         | `react-icons/bi`                                                                                 | bộ icon khác, emoji                    |
| Khối nội dung              | `Card` của react-bootstrap + `className="shadow-sm"`                                          | `div` tự kẻ viền                    |
| Chia cột form               | `Row` / `Col` của react-bootstrap                                                             |                                          |
| Bố cục                     | Tailwind: `flex`, `grid`, `items-*`, `justify-*`, `w-*`, `max-w-*`, `md:grid-cols-*` |                                          |
| Khoảng cách                | Bootstrap: `m-*`, `p-*`, `gap-*` từ 0 đến 5                                               | Tailwind kiểu `p-7`, `mt-[13px]`    |

Lưu ý: `p-3`, `gap-3`, `mb-4`… có ở cả Bootstrap lẫn Tailwind, **Bootstrap thắng**. Vì vậy khoảng cách luôn tính theo thang Bootstrap (1 = 0.25rem, 2 = 0.5rem, 3 = 1rem, 4 = 1.5rem, 5 = 3rem).

---

## 6. Phần chung có sẵn

### Component (`src/components/`)

| Component        | Props                                                                                                                                                                                                | Ghi chú                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Input`        | `label`, `name`, `value`, `onChange`, `error`, `required`, `helpText`, `type`, `placeholder`, `disabled`, `className` (mặc định `mb-3`)                                   | Textarea: thêm `as="textarea" rows={4}`. `required` chỉ hiện dấu `*` đỏ. Prop khác truyền thẳng vào `Form.Control`                               |
| `Select`       | `label`, `name`, `options` (`[{ value, label }]`), `placeholder` (mặc định `-- Chọn --`, truyền `null` để bỏ), `value`, `onChange`, `error`, `required`, `className` | Lấy options từ bảng nhãn: `toOptions(ROOM_STATUS_LABEL)`                                                                                                     |
| `PageHeader`   | `title`, `subtitle`, `backTo`, `children`                                                                                                                                                    | `children` là các nút bên phải. Trang chi tiết thêm `backTo="/rooms"`                                                                                   |
| `DataTable`    | `columns`, `data`, `loading`, `emptyMessage`, `rowKey` (mặc định `_id`), `onRowClick`                                                                                               | `columns = [{ key, title, render?, className? }]`. Đã bọc sẵn `Card`, có sẵn đang tải + trống                                                         |
| `StatusBadge`  | `map`, `value`                                                                                                                                                                                   | `<StatusBadge map={INVOICE_STATUS_LABEL} value={invoice.status} />`                                                                                              |
| `MoneyText`    | `value`, `className`                                                                                                                                                                             | `1200000` → `1.200.000 đ`                                                                                                                                    |
| `ConfirmModal` | `show`, `title`, `message`, `children`, `confirmText`, `cancelText`, `variant`, `loading`, `onConfirm`, `onCancel`                                                               | Cần nhập lý do (UC-10, UC-37…) thì đặt `Input as="textarea"` làm `children`                                                                            |
| `ImageUpload`  | `label`, `kind` (`PUBLIC` \| `CCCD`), `value`, `previewUrl`, `onChange`, `error`, `required`, `upload` (mặc định `true`), `disabled`                                      | Mặc định tải ngay lên `POST /uploads`: PUBLIC trả url, CCCD trả publicId. `upload={false}`: `onChange` nhận `File` để tự gửi multipart (UC-06) |
| `Loading`      | không                                                                                                                                                                                               |                                                                                                                                                                    |
| `EmptyState`   | `message`, `children`                                                                                                                                                                            |                                                                                                                                                                    |

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

`routes/index.jsx` tự gom route của 16 module, **không ai sửa file này**.

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

### Ẩn/hiện theo role

- Một trang dùng chung cho nhiều role thì ẩn/hiện nút theo `user.role`, ví dụ Manager chỉ xem phòng (BR-052):
  ```jsx
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;
  ```
- Ẩn nút ở FE chỉ để giao diện gọn. **BE mới là nơi chặn thật**, FE không cần tự kiểm tra quyền phức tạp.
- Manager chưa được phân công tòa (BR-023): layout tự chặn, trang không cần xử lý.
- Token hết hạn hoặc tài khoản bị khóa: `axios.js` tự đăng xuất, trang không cần xử lý.

---

## 8. Gọi API

- Mỗi module một file `<module>.api.js`, `export default` một object, **mỗi hàm = một endpoint trong api.md**.
- Path viết như trong api.md, **không có** tiền tố `/api` (axios đã tự thêm).
- Mỗi hàm trả về `{ success, data, message }`. Lỗi ném ra `{ status, message, errors }`.
- Request có file thì truyền `FormData`.

```js
// API module room – path thật lấy trong docs/api.md, đây chỉ là ví dụ minh họa
import api from '../../api/axios';

const roomApi = {
  list: (params) => api.get('/rooms', { params }),
  detail: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  remove: (id) => api.delete(`/rooms/${id}`),
};

export default roomApi;
```

### Dữ liệu giả khi BE chưa xong

Đặt ngay trong file api, **đúng hình dạng response trong api.md**, để trang không phải sửa khi chuyển sang API thật:

```js
const MOCK = true; // BE xong: xóa MOCK, MOCK_ROOMS, fake và các nhánh giả
const MOCK_ROOMS = [{ _id: '1', code: 'P101', floor: 1, price: 2500000, status: 'AVAILABLE' }];
const fake = (data) => Promise.resolve({ success: true, data, message: '' });

const roomApi = {
  list: (params) => (MOCK ? fake(MOCK_ROOMS) : api.get('/rooms', { params })),
};
```

---

## 9. Mẫu trang danh sách + form

Mọi trang danh sách làm theo khuôn này: gọi API, lọc, bảng, thêm/sửa trong Modal, xóa có xác nhận.

### `RoomListPage.jsx`

```jsx
// UC-19: danh sách phòng (Admin, Manager). Admin thêm/sửa/xóa (UC-16, 17, 18), Manager chỉ xem (BR-052)
import { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import MoneyText from '../../components/MoneyText';
import Select from '../../components/Select';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { ROOM_STATUS_LABEL, toOptions } from '../../constants/statusLabels';
import roomApi from './room.api';
import RoomFormModal from './components/RoomFormModal';

const RoomListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === ROLE.ADMIN;

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [formRoom, setFormRoom] = useState(null); // null: đóng form · {}: thêm mới · phòng: sửa
  const [deleting, setDeleting] = useState(null); // phòng đang chờ xác nhận xóa
  const [submitting, setSubmitting] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      const res = await roomApi.list({ status: status || undefined });
      setRooms(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await roomApi.remove(deleting._id);
      toast.success('Xóa phòng thành công');
      setDeleting(null);
      loadRooms();
    } catch (err) {
      toast.error(err.message); // vd UC-18 E01: "Không thể xóa phòng đang có khách thuê"
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'code', title: 'Mã phòng' },
    { key: 'floor', title: 'Tầng' },
    { key: 'price', title: 'Giá thuê', render: (row) => <MoneyText value={row.price} /> },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={ROOM_STATUS_LABEL} value={row.status} />,
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            title: '',
            className: 'text-end text-nowrap',
            render: (row) => (
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // không mở trang chi tiết khi bấm nút
                    setFormRoom(row);
                  }}
                >
                  Sửa
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleting(row);
                  }}
                >
                  Xóa
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Danh sách phòng">
        {isAdmin && (
          <Button variant="primary" onClick={() => setFormRoom({})}>
            Thêm phòng
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-4">
        <Select
          name="status"
          options={toOptions(ROOM_STATUS_LABEL)}
          placeholder="Tất cả trạng thái"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={rooms}
        loading={loading}
        emptyMessage="Không tìm thấy phòng phù hợp"
        onRowClick={(row) => navigate(`/rooms/${row._id}`)}
      />

      {/* render có điều kiện: mỗi lần mở là một form mới, không sót dữ liệu lần trước */}
      {formRoom && (
        <RoomFormModal
          room={formRoom}
          onHide={() => setFormRoom(null)}
          onSaved={() => {
            setFormRoom(null);
            loadRooms();
          }}
        />
      )}

      <ConfirmModal
        show={Boolean(deleting)}
        title="Xóa phòng"
        message={`Bạn chắc chắn muốn xóa phòng ${deleting?.code}?`}
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
};

export default RoomListPage;
```

### `components/RoomFormModal.jsx`

```jsx
// UC-16 tạo phòng, UC-17 sửa phòng (Admin). room = {} là thêm mới, có _id là sửa
import { useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import { toFieldErrors } from '../../../utils/formErrors';
import roomApi from '../room.api';

// kiểm tra nhanh ở FE để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại
const validate = (form) => {
  const errors = {};
  if (!form.code.trim()) errors.code = 'Vui lòng nhập mã phòng';
  if (!(Number(form.price) > 0)) errors.price = 'Giá thuê phải lớn hơn 0'; // BR-045
  return errors;
};

const RoomFormModal = ({ room, onHide, onSaved }) => {
  const isEdit = Boolean(room._id);
  const [form, setForm] = useState({
    code: room.code ?? '',
    floor: room.floor ?? '',
    price: room.price ?? '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    const payload = { ...form, floor: Number(form.floor), price: Number(form.price) };
    setSubmitting(true);
    try {
      if (isEdit) await roomApi.update(room._id, payload);
      else await roomApi.create(payload);
      toast.success(isEdit ? 'Cập nhật phòng thành công' : 'Tạo phòng thành công'); // câu theo UC
      onSaved();
    } catch (err) {
      setErrors(toFieldErrors(err.errors)); // 422: lỗi hiện dưới từng ô
      if (!err.errors) toast.error(err.message); // lỗi khác (trùng mã, mất mạng…): toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">{isEdit ? 'Sửa phòng' : 'Thêm phòng'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Input
                label="Mã phòng"
                name="code"
                value={form.code}
                onChange={handleChange}
                error={errors.code}
                disabled={isEdit} // BR-046: không đổi mã phòng
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Tầng"
                name="floor"
                type="number"
                value={form.floor}
                onChange={handleChange}
                error={errors.floor}
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Giá thuê (đ)"
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                error={errors.price}
                required
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            {isEdit ? 'Lưu' : 'Tạo'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RoomFormModal;
```

---

## 10. Thông báo, lỗi và giao diện

### Thông báo và lỗi

| Tình huống                                                | Cách hiện                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| Thành công                                                | `toast.success('…')`, câu đúng UC                                    |
| Lỗi 422 (sai từng ô)                                     | Hiện dưới ô: `setErrors(toFieldErrors(err.errors))`                  |
| Lỗi khác (trùng, không đủ điều kiện, mất mạng…) | `toast.error(err.message)`. BE đã trả câu tiếng Việt, hiện thẳng |
| Danh sách trống                                           | `emptyMessage` đúng câu UC (thường ở A1)                           |
| Cần xác nhận                                             | `ConfirmModal`, câu hỏi đúng UC                                      |

Không hiện lỗi kỹ thuật hay tiếng Anh cho người dùng.

### Giao diện

- Mỗi trang: `PageHeader` → bộ lọc (nếu có) → nội dung trong `DataTable` hoặc `Card`.
- Mỗi khu vực tối đa **1 nút `primary`**, nút đặt **bên phải**. Nút trong bảng dùng `size="sm"`.
- Ý nghĩa màu nút: `primary` hành động chính · `secondary` phụ, Hủy, Sửa · `danger` xóa, khóa, hủy đơn · `success` xác nhận, duyệt.
- Nút gửi dữ liệu: khi đang gửi thì `disabled` + `Spinner` như mẫu.
- Form dài chia 2 cột bằng `Row` / `Col md={6}`. Không đặt độ rộng cố định bằng px.
- Màu sắc, font, bo góc chung được chỉnh ở `index.css`. **Trang không tự chỉnh giao diện chung.**

---

## 11. Git và file chung

### File chung: chỉ Hiếu sửa

`src/api/`, `src/components/`, `src/layouts/`, `src/context/`, `src/routes/`, `src/constants/`, `src/utils/`, `App.jsx`, `main.jsx`, `index.css`, `vite.config.js`, `package.json`, `AGENTS.md`.

- Cần thêm nhãn trạng thái, component chung, thư viện… → nhắn Hiếu.
- `constants/enums.js`: khi BE đổi thì chép đè từ `backend/src/constants/enums.js`, không sửa tay.

### Nhánh và commit

- Nhánh: `fe/feature/<module>`, tạo từ `main` mới nhất.
- Commit: `<loại>(<module>): <mô tả>`, loại gồm `feat`, `fix`, `refactor`, `style`, `docs`, `chore`. Ví dụ: `feat(room): danh sách phòng và form tạo phòng`.
- Đầu mỗi buổi code: `git pull origin main` rồi merge vào nhánh mình để không bị lệch xa.
- PR nhỏ, mỗi PR một module hoặc một nhóm UC.

### Checklist trước khi mở PR

- [ ] Chỉ sửa file trong module mình (`git diff --stat main`)
- [ ] Endpoint, tên field đúng `docs/api.md`; BE xong rồi thì đã xóa dữ liệu giả
- [ ] Đủ luồng chính + các trường hợp A*, E* trong UC; câu thông báo đúng UC
- [ ] Không thẻ HTML thô, không `style={{}}`, không màu cứng, không chuỗi trạng thái trần
- [ ] Nút đúng 4 variant, nút gửi có trạng thái đang gửi
- [ ] Đã thử bằng role được vào và role không được vào
- [ ] `npm run lint` không lỗi, đã chạy `npm run format`
- [ ] Console trình duyệt không có lỗi đỏ

---

## 12. Dành cho AI IDE

- Trước khi viết code: đọc file này, `backend/src/modules/<module>/<module>.md`, mục UC tương ứng trong `docs/use_case.md` và mục module trong `docs/api.md`.
- Chỉ tạo và sửa file trong `src/modules/<module>/`. Thấy cần sửa file chung (mục 11) → **dừng lại và báo người dùng**, không tự sửa.
- Không cài thư viện mới. Không tạo component trùng với `src/components/`.
- Không đoán endpoint hay field. Không có trong api.md → hỏi người dùng.
- Làm theo khuôn mẫu ở mục 9.
- Đầu mỗi file viết 1 dòng comment tiếng Việt: file làm gì, thuộc UC nào.
