# Housify – Ngữ cảnh dự án cho AI IDE

> File này được Antigravity, Cursor, Copilot… tự đọc khi sinh code.
> `backend/` và `frontend/` có `AGENTS.md` riêng với quy ước chi tiết – đọc thêm file ở thư mục bạn đang sửa.

## Dự án

Housify – web quản lý nhà trọ cho thuê (đồ án môn WDP301, nhóm 5 người).
Quản lý tòa nhà, tầng, phòng, hợp đồng, cư dân, hóa đơn, thanh toán QR qua SePay, thông báo, sự cố.

**3 vai trò** (là role, không phải module riêng):

| Role     | Là ai                                        | Đăng nhập bằng                                                      |
| -------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| Admin    | Chủ nhà trọ, tạo sẵn bằng seed          | Email + mật khẩu                                                      |
| Manager  | Nhân viên quản lý một tòa               | Email + mật khẩu (tự đặt qua link kích hoạt)                     |
| Customer | Người đại diện thuê phòng (sinh viên) | **Số CCCD** + mật khẩu (tự đặt khi kích hoạt hợp đồng) |

Người ở cùng (không phải đại diện) **không có tài khoản**, chỉ là bản ghi trong `occupants`.

## Stack

- Backend: Node.js + Express + MongoDB (Mongoose), ES Modules
- Frontend: React + Vite + Tailwind CSS v4 + React-Bootstrap
- Thanh toán: SePay webhook + mã QR VietQR. Mail: nodemailer. Job định kỳ: node-cron

## Cấu trúc repo

```
backend/    API Express – xem backend/AGENTS.md
frontend/   React app – xem frontend/AGENTS.md
docs/
  database.md        18 collection + enum (NGUỒN CHUẨN cho model)
  housify-erd.puml   sơ đồ ERD (ảnh: housify-erd.png)
  api.md             danh sách API theo module – FE và BE cùng theo
  business_rule.md   vòng đời trạng thái, transaction, snapshot, quyền từng role
  use_case.md        UC-01..49 → module BE, trang FE, iteration, người làm
```

Nghiệp vụ chi tiết của từng module: `backend/src/modules/<tên>/<tên>.md`.

## Kiến trúc

```
React (5173) ──/api/...──► Express (8686) ──► MongoDB
SePay ──webhook──► module payment
node-cron ──► src/jobs/*.js (chạy chung process backend)
nodemailer ──► email
```

- **FE**: trang `pages/<role>/<module>/` → `api/<module>.api.js` → `api/axios.js` (gắn token) → `/api/...`, Vite chuyển tiếp sang backend.
- **BE**: `routes.js` → `<module>.routes.js` (middleware `auth`, `requireRole`, `validate`) → controller → service (nghiệp vụ, transaction, `notify`, `audit`) → model. Lỗi ném ra đều về `errorHandler`.
- **Job**: node-cron gọi `run()` của từng file trong `src/jobs/`; job gọi lại service, không viết nghiệp vụ riêng.
- **Ảnh**: upload vào `backend/uploads/`, DB chỉ lưu đường dẫn.
- **Đăng nhập**: JWT gửi qua header `Authorization: Bearer <token>`; mỗi request BE đọc lại `user.status` (bị khóa là bị đá ra ngay).

## Chạy dự án

```
# cửa sổ 1
cd backend  && npm start     # http://localhost:8686
# cửa sổ 2
cd frontend && npm run dev     # http://localhost:5173
```

Frontend gọi `/api/...`; Vite đã chuyển tiếp sang backend nên không cần cấu hình CORS.
`backend/.env` không commit – mỗi người tự tạo, tối thiểu có `PORT`, `MONGO_URI`, `JWT_SECRET`.

## Nguyên tắc khi sinh code

1. **Nguồn chuẩn: dữ liệu theo `docs/database.md`, luồng xử lý theo use case.** Không tự thêm quy tắc nghiệp vụ, collection, field, enum. Cần thêm thì hỏi nhóm và cập nhật `docs/database.md` trước.
2. Code chia theo **module nghiệp vụ** (room, contract, invoice…), không chia theo role.
3. Giải pháp đơn giản, dễ đọc – đây là đồ án sinh viên, không over-engineering (không microservice, không Redux, không socket).
4. Tên biến / hàm / file tiếng Anh; chữ hiển thị cho người dùng và thông báo lỗi **tiếng Việt**.
5. Mỗi file mở đầu bằng một dòng comment tiếng Việt nói file làm gì, kèm số UC nếu có.
6. Enum chỉ lấy từ `constants/enums.js` (backend và frontend giống hệt nhau).
7. Làm đến đâu tạo file đến đó. Không dựng sẵn hàng loạt file rỗng cho module chưa tới lượt.

## Git

- Branch: `main` (nộp bài), `develop` (gộp code), `be/feature/<module>`, `fe/feature/<module>`,
- Commit: `feature(<module>: ...`, `docs: ...` – nội dung tiếng Việt, ngắn.
- PR vào main, cần 1 người khác duyệt. Không push thẳng `main`.

## Thành viên

| Người | Vai trò                                |
| ------- | --------------------------------------- |
| An      | Backend                                 |
| Toàn   | Backend                                 |
| Hiếu   | Frontend lead + một số module backend |
| Hưng   | Frontend                                |
| Mạnh   | Frontend                                |
