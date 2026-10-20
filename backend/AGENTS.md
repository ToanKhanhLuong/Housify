# Backend Housify – hướng dẫn cho AI IDE và thành viên nhóm

Đọc thêm: `../AGENTS.md` (tổng quan), `../docs/database.md` (18 collection – nguồn chuẩn cho model), `../docs/api.md` (danh sách API), `../docs/business_rule.md`.
**Trước khi code một module, đọc `src/modules/<tên>/<tên>.md`** – file đó mô tả nghiệp vụ của riêng module.

## Stack

Node.js ≥ 20, Express 4, Mongoose 8, MongoDB. **ES Modules** (`import` / `export`, luôn ghi đuôi `.js` khi import file nội bộ).
Joi để validate, bcryptjs để hash, jsonwebtoken, multer, brevo http để deploy chứ ko dùng email nodemailder, node-cron.

Chạy: `npm run dev` (nodemon, tự nạp lại khi lưu) hoặc `npm start`.
Thư viện cài theo nhu cầu từng module, không cài sẵn hết từ đầu.

## Cấu trúc một module (bắt buộc theo đúng khuôn `src/modules/room/`)

```
modules/<tên>/
  <tên>.md             mô tả nghiệp vụ module (đọc trước khi code)
  <tên>.routes.js      đường dẫn + middleware, không có logic
  <tên>.controller.js  lấy dữ liệu từ req → gọi service → ok()/created()
  <tên>.service.js     TOÀN BỘ nghiệp vụ, kiểm tra BR, transaction
  <tên>.validation.js  Joi schema
```

- Controller luôn bọc bằng `asyncHandler`, trả kết quả bằng `ok()` / `created()` trong `utils/response.js`.
- Lỗi nghiệp vụ: `throw new AppError('Thông báo tiếng Việt', statusCode)`. Không `res.status().json()` lung tung.
- Mỗi module tự khai báo đường dẫn đầy đủ (`/buildings/:buildingId/rooms`, `/rooms/:id`), file routes kết thúc bằng `export default router`.
- Không import chéo service của module khác nếu chỉ cần đọc model – import thẳng model.

## Validation – 3 tầng, không trộn

| Kiểm tra gì                                                                                | Viết ở đâu                                                                                  |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Hình thức dữ liệu: bắt buộc, kiểu, độ dài, định dạng                            | `<tên>.validation.js` – mỗi API một Joi schema, gắn ở routes bằng `validate(schema)` |
| Quy tắc cần tra DB / trạng thái: trùng tên, phòng còn hợp đồng, vượt sức chứa | `<tên>.service.js` → `throw new AppError(...)`                                            |
| Chốt chặn cuối: required, enum, unique                                                    | Mongoose schema                                                                                 |

- Rule dùng ở nhiều module (mật khẩu BR-005, email, SĐT, CCCD 12 số, ObjectId) viết **một lần** trong `src/utils/validators.js`, file validation import vào. Không chép lại regex.
- Thông báo lỗi Joi viết tiếng Việt theo từng ô.

## `src/routes.js`

Đã liệt kê sẵn 19 module, tất cả đang để comment. Làm xong module nào thì **bỏ comment đúng hai dòng** của module đó (một dòng `import`, một dòng `router.use`). Không đổi cấu trúc file này để tránh xung đột git.

## Format API

- Thành công: `{ success: true, data, message }`
- Lỗi: `{ success: false, message, errors }`
- Danh sách có phân trang: `?page=1&limit=10` → `data: { items, total, page, limit }` (dùng `utils/pagination.js`)

## Middleware

| Middleware                                        | Dùng khi                                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `auth`                                          | Mọi route cần đăng nhập. Đọc lại `user.status` mỗi request: không ACTIVE thì 401 (khóa là bị đá ra ngay) |
| `requireRole(ROLE.ADMIN, ...)`                  | Chặn theo vai trò                                                                                                        |
| `requireManagerBuilding`                        | Route của Manager: gắn `req.buildingId`; chưa được phân công thì 403                                            |
| `validate(schema, 'body' \| 'query' \| 'params')` | Mặc định `'body'`                                                                                                     |
| `upload`                                        | Route nhận file ảnh                                                                                                      |
| `sepayAuth`                                     | Chỉ cho webhook SePay                                                                                                     |
| `devOnly`                                       | Chỉ cho `/api/dev/*`, chặn khi production                                                                              |

Mới có sẵn `notFound` và `errorHandler`. Các middleware còn lại tạo khi module đầu tiên cần đến.

## Helper dùng chung – KHÔNG tự viết lại

- `notify({ userIds, type, title, message, refId, createdBy, email })` – mọi thông báo chuông (+ mail nếu `email: true`)
- `audit({ actorId, action, targetType, targetId, reason, metadata })` – `actorId = null` khi hệ thống tự chạy
- `withTransaction(async (session) => { ... })` – mọi thao tác ghi nhiều collection
- `getCurrentPrice(serviceId, buildingId, date)` – đơn giá dịch vụ đang hiệu lực
- `validateCccd(cccd, dateOfBirth)` – kiểm CCCD
- `sendMail(template, data, to)`

Trong `src/utils/` hiện có `response.js`, `AppError.js`, `asyncHandler.js`. Các helper trên viết khi module đầu tiên cần.

## Quy tắc dữ liệu

- Enum chỉ lấy từ `src/constants/enums.js`. Không viết chuỗi `'ACTIVE'` trực tiếp trong code hoặc so sánh với chuỗi.
- Xóa mềm: `buildings`, `rooms` có `isDeleted` + `deletedAt`; `room_types`, `services` chỉ có `isDeleted`. Mọi truy vấn danh sách phải lọc `isDeleted: false`.
- Không có collection tầng: tầng là `buildings.floorCount`, phòng lưu `floorNumber`. Nội quy là `buildings.rules` (một bản, lưu đè).
- Hợp đồng chỉ có DRAFT | ACTIVE | ENDED | CANCELLED – **không có PENDING_TERMINATION**. Đang có đơn chấm dứt thì hợp đồng vẫn ACTIVE đến ngày hiệu lực.
- Snapshot: `contracts.rentPrice/deposit` chụp từ phòng lúc tạo hợp đồng; `invoices.items[].unitPrice/description` chụp lúc lập hóa đơn. Không đọc lại giá từ phòng / dịch vụ cho hợp đồng, hóa đơn cũ.
- Tổng hóa đơn luôn do server tính, không nhận `totalAmount` từ client.
- Token link mời, OTP: chỉ lưu bản hash.
- **Transaction bắt buộc** cho: kích hoạt hợp đồng (UC-06), kết thúc hợp đồng – đến ngày hiệu lực đơn chấm dứt (UC-28, UC-29) hoặc hết hạn (UC-45), phân công / thay Manager (UC-11), xóa tòa (cascade phòng, UC-14), hủy hợp đồng nháp (UC-46), tạo Manager (UC-08).
  Transaction cần replica set. Chạy máy thì bật replica set một node và thêm `?replicaSet=rs0` vào `MONGO_URI`; dùng Atlas thì có sẵn.

## Job định kỳ (`src/jobs/`)

Mỗi job là một file `<tên>.js` export hàm `run()`. `jobs/index.js` có hàm `startJobs()` liệt kê sẵn các job, đang để comment – viết xong job nào thì bỏ comment dòng của job đó.
`POST /api/dev/jobs/:name/run` gọi thẳng `run()` để test / demo, không phải đợi tới giờ.

## Không được làm

- Không thêm collection, field, enum mới khi chưa có trong `docs/database.md` – hỏi nhóm trước.
- Không tự đặt quy tắc nghiệp vụ không có trong use case.
- Không commit `.env`, không log mật khẩu / token.

## Tìm tài liệu ở đâu

- Nghiệp vụ từng module: `src/modules/<tên>/<tên>.md`
- Đường dẫn API: `docs/api.md`
- Cấu trúc dữ liệu: `docs/database.md`
- Quy tắc nghiệp vụ gốc: `docs/business_rule.md`
