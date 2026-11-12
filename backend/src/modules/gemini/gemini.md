# Module Gemini AI – Trợ lý ảo thông minh Housify

## 1. Giới thiệu tổng quan
Module `gemini` cung cấp trợ lý ảo thông minh (**Housify AI Assistant**) tích hợp trực tiếp trên nền tảng quản lý nhà trọ Housify, hỗ trợ chuyên biệt cho cả 3 vai trò người dùng theo đúng phạm vi phân quyền (RBAC):
- **Customer (Khách thuê - Role 2)**: Tra cứu thông tin phòng, hợp đồng, bảng giá dịch vụ tòa nhà, chi tiết từng dòng hóa đơn đã phát hành, tình trạng sự cố, thông tin liên hệ Quản lý tòa nhà và tư vấn đầy đủ quy chế nghiệp vụ (chuyển ra sớm, hoàn trả tiền cọc, quét QR SePay, người ở cùng).
- **Manager (Quản lý tòa nhà - Role 1)**: Nắm bắt số liệu vận hành thời gian thực của tòa nhà được phân công (phòng trống, phòng đang thuê kèm tên/SĐT khách, hóa đơn nháp chưa gửi, hóa đơn quá hạn, hợp đồng sắp hết hạn, hợp đồng chờ hoàn cọc, đơn chấm dứt, sự cố đang mở), hướng dẫn quy trình nghiệp vụ quản lý và tự động soạn thảo thông báo cư dân.
- **Admin (Chủ nhà trọ - Role 0)**: Cố vấn phân tích chiến lược toàn chuỗi (tổng doanh thu tháng & lũy kế, tỷ lệ lấp đầy toàn hệ thống, so sánh hiệu suất từng tòa nhà, công nợ quá hạn, danh sách nhân sự Manager, danh sách đơn chấm dứt hợp đồng đơn phương `UNILATERAL` đang chờ Admin phê duyệt).

---

## 2. Kiến trúc & Cơ chế truy vấn (Context-Injection RAG)

### Nguyên tắc bảo mật tuyệt đối:
- **KHÔNG kết nối trực tiếp AI vào Database**: Tránh hoàn toàn nguy cơ Prompt Injection, rò rỉ dữ liệu chéo giữa các phòng/tòa nhà hoặc sinh sai câu lệnh truy vấn.
- **Context-Injection hai lớp (Real-time Data + System Business Rules)**:
  1. **Lớp Dữ liệu thực tế (Real-time Scoped Data)**: Khi có request đến `POST /api/gemini/chat`, backend xác thực JWT (`req.user.role`), truy vấn MongoDB với bộ lọc phân quyền nghiêm ngặt của đúng vai trò đó.
  2. **Lớp Cẩm nang nghiệp vụ (Domain Knowledge Base)**: Nạp trực tiếp các quy tắc nghiệp vụ chuẩn của Housify (`docs/business_rule.md`, `docs/use_case.md`) phù hợp với từng vai trò để AI giải đáp chính xác mọi tình huống quy chế.

---

## 3. Phân quyền dữ liệu & Cẩm nang nghiệp vụ theo từng Role (RBAC Scope)

| Vai trò | 1. Dữ liệu thời gian thực AI được cấp (Real-time DB) | 2. Cẩm nang nghiệp vụ AI nắm vững (Business Rules) | 3. Rào chắn bảo mật (Bị cấm) |
| :--- | :--- | :--- | :--- |
| **Customer**<br>*(Khách thuê)* | • Hồ sơ đại diện, thông tin Phòng, Loại phòng & Sức chứa tối đa.<br>• Tên, SĐT & Email của Quản lý tòa nhà.<br>• Hợp đồng đang thuê (giá thuê, tiền cọc, ngày bắt đầu/kết thúc, trạng thái hoàn cọc).<br>• Danh sách người ở cùng (`STAYED`).<br>• Bảng giá dịch vụ hiện hành của tòa nhà (điện, nước, dịch vụ).<br>• Hóa đơn **đã phát hành** (`sentAt != null`, trạng thái `PENDING`/`PAID`) kèm chi tiết chỉ số điện nước từng dòng.<br>• Đơn chấm dứt hợp đồng và lịch sử sự cố của phòng.<br>• Nội quy tòa nhà. | • **Chuyển ra sớm (UC-28, BR-073)**: Quy trình 4 bước lập đơn thỏa thuận (`MUTUAL`), xác nhận điện tử (tự xác nhận sau 7 ngày), quy định **mất cọc** khi chấm dứt trước hạn.<br>• **Đơn phương chấm dứt (UC-29)**: Mất cọc + khóa tài khoản vĩnh viễn (`LOCKED`) sau 24h.<br>• **Hoàn cọc (UC-45, BR-130, 131)**: Chỉ hoàn 100% cọc khi hết hạn tự nhiên (`ENDED`), hư hỏng tính vào dòng `EXTRA` hóa đơn cuối.<br>• **Thanh toán QR SePay (UC-38)**: Hạn nộp = ngày gửi + 7 ngày, nhắc tự động.<br>• **Người ở cùng (UC-30..33)**: Chỉ đại diện có tài khoản đăng nhập bằng CCCD. | ❌ Cấm đọc hóa đơn nháp (`DRAFT`) chưa gửi.<br>❌ Cấm đọc thông tin phòng khác, khách khác hoặc doanh thu tòa nhà. |
| **Manager**<br>*(Quản lý tòa)* | • Thông tin tòa nhà được phân công & bảng giá dịch vụ của tòa.<br>• Chi tiết từng phòng **Trống (`AVAILABLE`)**, **Đang thuê (`OCCUPIED`)** kèm tên/SĐT khách đại diện & số người ở, **Bảo trì (`MAINTENANCE`)**.<br>• Hợp đồng `ACTIVE`, hợp đồng nháp `DRAFT`, hợp đồng sắp hết hạn trong 60 ngày.<br>• Hợp đồng `ENDED` đủ điều kiện hoàn cọc nhưng chưa hoàn.<br>• Đơn chấm dứt hợp đồng trong tòa.<br>• Hóa đơn **Nháp (`DRAFT`)** chưa gửi, hóa đơn **Chờ thu (`PENDING`)**, hóa đơn **Quá hạn** kèm tên/SĐT khách, và doanh thu thực thu tháng này của tòa.<br>• Danh sách sự cố đang chờ/đang xử lý trong tòa. | • **Giới hạn quyền (BR-023, 030, 031)**: Chỉ quản lý 1 tòa; không tự đổi phòng sang `MAINTENANCE` (quyền Admin); không tự sửa giá dịch vụ.<br>• **Cho thuê (UC-24, 06, 46)**: Tạo HĐ `DRAFT`, link kích hoạt 24h, gửi lại lời mời hoặc hủy nháp; mở lại khách `INACTIVE`, chặn khách `LOCKED`.<br>• **Hóa đơn (UC-34..37)**: Lập nháp `DRAFT` -> Gửi `PENDING` (sinh QR, hạn 7 ngày) -> Hủy nếu sai.<br>• **Chấm dứt & Hoàn cọc (UC-28, 29, 45)**: Phân biệt `MUTUAL` (khách xác nhận) và `UNILATERAL` (trình Admin duyệt); quy tắc hoàn cọc BR-073.<br>• **Soạn thông báo (UC-40)**: Tự động viết mẫu thông báo cư dân. | ❌ Cấm đọc dữ liệu của các tòa nhà cơ sở khác không được phân công. |
| **Admin**<br>*(Chủ nhà trọ)* | • Tổng quan chuỗi: Tổng tòa nhà, tổng số phòng, tỷ lệ lấp đầy toàn chuỗi, tổng số cư dân.<br>• Tài chính vĩ mô: Doanh thu thực thu tháng này, tổng doanh thu lũy kế, tổng tiền chờ thu (`PENDING`), tổng nợ quá hạn toàn chuỗi.<br>• Bảng so sánh chi tiết từng tòa nhà (tỷ lệ lấp đầy, Manager phụ trách, doanh thu tháng, nợ quá hạn, số sự cố).<br>• Danh sách toàn bộ nhân sự Manager (`ACTIVE`, `PENDING`, `LOCKED`, tòa phụ trách).<br>• Danh sách **Đơn chấm dứt đơn phương (`UNILATERAL` - `PENDING`)** đang chờ Admin phê duyệt (UC-29). | • **Quyền tối cao cơ sở vật chất (UC-12..23)**: Tạo/sửa/xóa tòa nhà, tầng, loại phòng, phòng; đổi trạng thái phòng `AVAILABLE <-> MAINTENANCE`; thiết lập dịch vụ & bảng giá theo ngày hiệu lực (`effectiveFrom` - BR-057, 058).<br>• **Quản trị nhân sự Manager (UC-08..11)**: Tạo Manager, phân công 1-1 với tòa nhà, khóa/mở khóa (`LOCKED`), xóa cứng khi còn `PENDING`.<br>• **Duyệt chấm dứt đơn phương (UC-29)**: Duyệt (`CONFIRMED`) hoặc Từ chối (`REJECTED`), hệ quả mất cọc và khóa `LOCKED` khách vi phạm sau 24h. | ❌ Không trích xuất mật khẩu băm (`password`), token bí mật. |

---

## 4. Rào chắn Model Cascade Fallback & Tối ưu tốc độ tức thì (~1s)

Hệ thống thiết lập cơ chế tự động chuyển đổi dự phòng qua danh sách mô hình Gemini thế hệ 3.x và 2.5 được sắp xếp ưu tiên theo tốc độ phản hồi thực tế:
1. `gemini-3.6-flash`: Mô hình 3.x siêu tốc, phản hồi ~1s khi tắt thinkingBudget.
2. `gemini-2.5-flash`: Mô hình thế hệ 2.5 cực kỳ ổn định, tốc độ dưới 1s.
3. `gemini-3-flash-preview`: Bản thử nghiệm độ trễ siêu thấp (~0.8s).
4. `gemini-3.5-flash`: Bản 3.5 suy luận logic vững chắc.
5. `gemini-3.5-flash-lite`: Bản lite thế hệ 3.5 tiết kiệm tài nguyên.
6. `gemini-flash-lite-latest`: Bản lite mới nhất tự động trỏ.
7. `gemini-flash-latest`: Bản flash mới nhất tự động trỏ.
8. `gemini-3.8-flash`: Bản 3.8 dự phòng nâng cao khi các model trước quá tải.
9. `gemini-pro-latest`: Bản Pro chuyên sâu làm chốt chặn cuối cùng.

**Cơ chế tối ưu hóa tốc độ (Zero-Thinking Latency):**
Các model thế hệ mới mặc định bật tính năng "Extended Thinking" (suy nghĩ ngầm) khiến thời gian chờ kéo dài 15-20s. Hệ thống tự động thiết lập `thinkingConfig: { thinkingBudget: 0 }` trên các model hỗ trợ, giúp bỏ qua bước suy nghĩ ngầm và xuất trực tiếp câu trả lời, rút ngắn thời gian phản hồi từ ~20s xuống còn **~1 - 3 giây**!

---

## 5. API Endpoint

### `POST /api/gemini/chat`
- **Quyền gọi:** Đã đăng nhập (`Customer`, `Manager`, `Admin`)
- **Body:**
  ```json
  {
    "message": "Tôi muốn chuyển ra sớm hơn hợp đồng quy định có được không?",
    "history": []
  }
  ```
- **Response 200:**
  ```json
  {
    "success": true,
    "data": {
      "reply": "Chào bạn, bạn hoàn toàn được phép chuyển ra sớm thông qua quy trình Chấm dứt hợp đồng hai bên thỏa thuận (MUTUAL)...",
      "modelUsed": "gemini-2.5-flash",
      "roleId": 2
    }
  }
  ```
