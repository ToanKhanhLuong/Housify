# Module Gemini AI – Trợ lý ảo thông minh Housify

## 1. Giới thiệu tổng quan
Module `gemini` cung cấp trợ lý ảo thông minh (Housify AI Assistant) tích hợp trực tiếp trên nền tảng quản lý nhà trọ Housify, hỗ trợ cả 3 đối tượng người dùng:
- **Customer (Khách thuê)**: Tra cứu nhanh tiền phòng, tình trạng hóa đơn nợ, xem lại nội quy giờ giấc, hướng dẫn báo sự cố, quy trình hoàn trả tiền cọc.
- **Manager (Quản lý tòa nhà)**: Tra cứu danh sách phòng trống, đối soát danh sách hóa đơn quá hạn cần giục nợ, các hợp đồng sắp hết hạn trong 60 ngày tới, gợi ý soạn thảo thông báo bảo trì/điện nước.
- **Admin (Chủ nhà trọ)**: Báo cáo phân tích vĩ mô toàn chuỗi, tổng hợp doanh thu thực tế, tỷ lệ lấp đầy giữa các cơ sở, tổng nợ quá hạn và hiệu suất nhân sự.

---

## 2. Kiến trúc & Cơ chế truy vấn (Context-Injection RAG)

### Nguyên tắc bảo mật tuyệt đối:
- **KHÔNG kết nối trực tiếp AI vào Database**: Tránh nguy cơ Prompt Injection, rò rỉ dữ liệu hoặc sinh sai câu lệnh query.
- **Context-Injection**: Khi có request đến `POST /api/gemini/chat`, hệ thống xác thực JWT token của người dùng, dùng code backend chuẩn để query dữ liệu liên quan từ MongoDB, kiểm tra quyền chặt chẽ, đóng gói thành văn bản ngữ cảnh (Structured Context) rồi mới chuyển tới Gemini API.

---

## 3. Phân quyền và ranh giới dữ liệu (RBAC Data Boundaries)

| Vai trò (Role) | Dữ liệu AI được phép đọc | Rào chắn bảo mật (Bị cấm) |
| :--- | :--- | :--- |
| **Customer** | • Phòng đang thuê, giá thuê, hạn hợp đồng, tiền cọc.<br>• Hóa đơn kỳ này (đã trả chưa, số tiền nợ, hạn nộp).<br>• Nội quy của tòa nhà đang ở.<br>• Các sự cố phòng do chính mình báo cáo. | ❌ Cấm đọc thông tin phòng khác, doanh thu tòa nhà, thông tin cá nhân của người khác, mã token/hash. |
| **Manager** | • Danh sách phòng trống, giá và diện tích trong **tòa mình phụ trách**.<br>• Danh sách các phòng nợ tiền quá hạn của tòa đó.<br>• Các hợp đồng sắp hết hạn trong 30-60 ngày của tòa đó.<br>• Các sự cố phòng đang chờ xử lý của tòa đó. | ❌ Cấm đọc dữ liệu của các tòa nhà khác do Manager khác quản lý; không xem được tài khoản riêng của Admin. |
| **Admin** | • Tổng doanh thu chuỗi và doanh thu từng cơ sở.<br>• Tỷ lệ phòng trống, tỷ lệ lấp đầy giữa các tòa.<br>• Tổng công nợ quá hạn của cả hệ thống.<br>• Danh sách phân công công việc của các Manager. | ❌ Không đọc các thông tin nhạy cảm (mật khẩu băm, secret keys). |

---

## 4. Rào chắn 4 Model dự phòng chống quá tải (Cascade Fallback)

Hệ thống rào đón 4 mô hình Gemini ưu tiên theo thứ tự:
1. `gemini-2.5-flash`: Mô hình thế hệ mới nhất, thời gian phản hồi < 1 giây, ưu tiên hàng đầu.
2. `gemini-2.0-flash`: Mô hình dự phòng cấp 1, cân bằng hoàn hảo giữa tốc độ và độ chính xác.
3. `gemini-1.5-flash`: Mô hình dự phòng cấp 2, context 1 triệu tokens, cực kỳ bền bỉ.
4. `gemini-1.5-pro`: Mô hình suy luận chuyên sâu, làm chốt chặn cuối cùng.

Khi gọi API, nếu gặp mã lỗi `429` (Rate limit / Too many requests), `503` (Model overloaded) hoặc `500`, hệ thống tự động bắt lỗi và thử lại ngay với model kế tiếp trong mili-giây mà không làm đứt đoạn trải nghiệm của người dùng.

---

## 5. API Endpoint

### `POST /api/gemini/chat`
- **Quyền gọi:** Đã đăng nhập (`Customer`, `Manager`, `Admin`)
- **Body:**
  ```json
  {
    "message": "Phòng của tôi còn nợ hóa đơn nào không?",
    "history": [
      { "role": "user", "text": "Xin chào" },
      { "role": "model", "text": "Xin chào bạn Hiếu! Tôi là Trợ lý AI..." }
    ]
  }
  ```
- **Response 200:**
  ```json
  {
    "success": true,
    "data": {
      "reply": "Phòng 404 của bạn hiện có 1 hóa đơn chưa thanh toán...",
      "modelUsed": "gemini-2.5-flash",
      "roleId": 2
    }
  }
  ```
- **Lỗi:**
  - `400`: Nội dung tin nhắn rỗng hoặc vượt quá 2000 ký tự.
  - `401`: Chưa đăng nhập hoặc token hết hạn.
  - `503`: Toàn bộ các model Gemini đều đang quá tải hoặc gặp sự cố.
