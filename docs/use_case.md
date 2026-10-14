
# Use case → module, trang, phân công

Nội dung đầy đủ từng UC nằm trong file use case (docx) của nhóm. File này để tra nhanh UC nằm ở đâu trong code, iteration nào, ai làm.

Iter 1: tuần 6 · Iter 2: tuần 7–8 · Iter 3: tuần 9 · Tuần 10: kiểm thử, rà soát.

## Phần nền – xong trước khi chia việc

Làm và đẩy lên `main` trước, cả nhóm pull về rồi mới code module:
`enums.js` (BE + FE) · 18 model · seed role + tài khoản Admin · middleware `auth`, `requireRole`, `validate` + `utils/validators.js` · helper `sendMail` (Brevo), `notify`, `audit`, `withTransaction`.

## Bảng UC

| UC | Tên                                             | Module BE                          | Trang FE                                                             | Iter                  | BE    | FE                                           |
| -- | ------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------- | --------------------- | ----- | -------------------------------------------- |
| 01 | Đăng nhập                                     | auth                               | public/LoginPage                                                     | 1                     | An    | Hiếu                                        |
| 02 | Đăng xuất                                     | auth                               | (nút trên Topbar)                                                  | 1                     | An    | Hiếu                                        |
| 03 | Đổi mật khẩu                                 | auth                               | common/ChangePasswordPage                                            | 1                     | An    | Hiếu                                        |
| 04 | Quên mật khẩu                                 | auth                               | public/ForgotPasswordPage                                            | 1                     | An    | Hiếu                                        |
| 05 | Xem & cập nhật hồ sơ (Manager)               | auth                               | common/ProfilePage                                                   | 1                     | An    | Hiếu                                        |
| 06 | Kích hoạt tài khoản + xác nhận hợp đồng | activation                         | public/ContractActivationPage                                        | 2                     | An    | Hưng                                        |
| 07 | Tổng quan toàn hệ thống                      | dashboard                          | admin/dashboard                                                      | 3                     | Hiếu | Hiếu                                        |
| 08 | Tạo & kích hoạt Manager                       | manager, activation                | admin/managers, public/ManagerActivationPage                         | 1                     | An    | Hưng (form tạo), Hiếu (trang kích hoạt) |
| 09 | Danh sách & quản lý Manager                   | manager                            | admin/managers                                                       | 1                     | An    | Hưng                                        |
| 10 | Khóa / mở khóa Manager                        | manager                            | admin/managers/LockManagerModal                                      | 1                     | An    | Hưng                                        |
| 11 | Phân công Manager                              | manager                            | AssignBuildingModal, AssignManagerModal                              | 1                     | An    | Hưng                                        |
| 12 | Tạo tòa nhà                                   | building                           | admin/buildings/BuildingFormPage                                     | 1                     | Toàn | Hưng                                        |
| 13 | Xem & cập nhật tòa nhà                       | building                           | admin/buildings, manager/building                                    | 1                     | Toàn | Hưng                                        |
| 14 | Xóa tòa nhà                                   | building                           | admin/buildings/BuildingDetailPage                                   | 1                     | Toàn | Hưng                                        |
| 15 | Quản lý tầng                                  | building                           | admin/buildings/FloorsTab                                            | 1                     | Toàn | Hưng                                        |
| 16 | Tạo phòng                                      | room                               | admin/rooms/RoomFormPage                                             | 1                     | Toàn | Hưng                                        |
| 17 | Cập nhật phòng                                | room                               | admin/rooms/RoomFormPage                                             | 1                     | Toàn | Hưng                                        |
| 18 | Xóa phòng                                      | room                               | admin/buildings/RoomsTab                                             | 1                     | Toàn | Hưng                                        |
| 19 | Xem chi tiết phòng                             | room                               | admin/rooms/RoomDetailPage                                           | 1                     | Toàn | Hưng                                        |
| 20 | Quản lý loại phòng                           | roomType                           | admin/room-types                                                     | 1                     | Toàn | Hưng                                        |
| 21 | Quản lý dịch vụ                              | service                            | admin/services/ServicePage                                           | 1                     | Toàn | Mạnh                                        |
| 22 | Thiết lập giá dịch vụ                       | service                            | admin/services/ServicePricePage                                      | 1                     | Toàn | Mạnh                                        |
| 23 | Quản lý nội quy                               | building                           | components/building/RulesEditor, customer/rules                      | 1 (trang Customer: 3) | Toàn | Mạnh                                        |
| 24 | Tạo hợp đồng thuê                           | contract                           | manager/contracts/ContractCreatePage                                 | 2                     | An    | Hưng                                        |
| 25 | Xem hợp đồng                                  | contract                           | manager/contracts, customer/contract                                 | 2                     | An    | Hưng                                        |
| 26 | Cập nhật hợp đồng                           | contract                           | manager/contracts/ContractEditModal                                  | 2                     | An    | Hưng                                        |
| 27 | Gia hạn hợp đồng                             | contract                           | manager/contracts/RenewModal                                         | 2                     | An    | Hưng                                        |
| 28 | Chấm dứt (hai bên thỏa thuận)               | termination                        | TerminationCreateModal, customer/termination                         | 2                     | An    | Hưng                                        |
| 29 | Đơn phương chấm dứt                        | termination                        | TerminationCreateModal, admin/terminations                           | 2                     | An    | Hưng                                        |
| 30 | Xem danh sách cư dân                          | occupant                           | manager/occupants                                                    | 2                     | Toàn | Mạnh                                        |
| 31 | Cập nhật thông tin cư dân                   | occupant                           | components/occupant/OccupantForm, customer/profile, customer/members | 2                     | Toàn | Mạnh                                        |
| 32 | Thêm người ở cùng                           | occupant                           | manager/occupants/AddOccupantModal                                   | 2                     | Toàn | Mạnh                                        |
| 33 | Xóa người ở cùng                            | occupant                           | manager/occupants/LeaveOccupantModal                                 | 2                     | Toàn | Mạnh                                        |
| 34 | Tạo hóa đơn tháng                           | invoice                            | manager/invoices/InvoiceFormPage                                     | 2                     | Toàn | Hiếu                                        |
| 35 | Gửi hóa đơn                                  | invoice                            | manager/invoices/InvoiceReviewPage                                   | 2                     | Toàn | Hiếu                                        |
| 36 | Xem chi tiết hóa đơn                         | invoice                            | manager/invoices, customer/invoices                                  | 2                     | Toàn | Hiếu (Manager), Mạnh (Customer)            |
| 37 | Hủy hóa đơn                                  | invoice                            | manager/invoices/CancelInvoiceModal                                  | 2                     | Toàn | Hiếu                                        |
| 38 | Thanh toán qua QR SePay                         | payment                            | customer/invoices/MyInvoiceDetailPage                                | 2                     | Toàn | Mạnh                                        |
| 39 | Lịch sử thanh toán                            | payment                            | manager/payments, customer/payments                                  | 2                     | Toàn | Mạnh                                        |
| 40 | Gửi thông báo                                 | announcement                       | manager/announcements                                                | 2                     | Toàn | Mạnh                                        |
| 41 | Xem thông báo                                  | notification                       | common/NotificationsPage, NotificationBell                           | 1                     | Toàn | Mạnh                                        |
| 42 | Thông báo thanh toán thành công             | payment (gọi `notify`)          | —                                                                   | 2                     | Toàn | —                                           |
| 43 | Gửi báo cáo sự cố                           | incident                           | customer/incidents                                                   | 2                     | Hiếu | Hiếu                                        |
| 44 | Xử lý sự cố                                  | incident                           | manager/incidents                                                    | 2                     | Hiếu | Hiếu                                        |
| 45 | Hết hạn hợp đồng & hoàn cọc               | contract + `jobs/contractExpiry` | manager/contracts/RefundDepositModal                                 | 3                     | Toàn | Hưng                                        |
| 46 | Hủy hợp đồng nháp                           | contract                           | manager/contracts/CancelDraftModal                                   | 2                     | An    | Hưng                                        |
| 47 | Tổng quan tòa nhà (Manager)                   | dashboard                          | manager/dashboard                                                    | 3                     | Hiếu | Mạnh                                        |
| 48 | Báo cáo doanh thu & tình trạng phòng        | dashboard                          | admin/reports                                                        | 3                     | Hiếu | Hiếu                                        |
| 49 | Nhắc thanh toán tự động                     | `jobs/paymentReminder`           | —                                                                   | 3                     | Toàn | —                                           |

Ngoài bảng:

- **Khung FE, component chung** (layout, DataTable, StatusBadge…): Hiếu, Iter 1.
- **Khách cũ quay lại** (UC-24 A3, UC-06 – mở lại tài khoản INACTIVE): An + Hưng, Iter 3.
- **OCR CCCD** (UC-31 A2, A3): An + Hưng, Iter 3, làm nếu kịp.
- **Job chấm dứt** (nhắc ngày 1, 3, 6, tự xác nhận sau 7 ngày, kết thúc đúng ngày hiệu lực, khóa / ngừng tài khoản sau 24h): An, Iter 2, cùng UC-28, 29.

## Mục tiêu demo cuối mỗi iter

- **Iter 1:** đăng nhập đủ 3 role; Admin tạo Manager → Manager kích hoạt; Admin dựng tòa, phòng, dịch vụ, giá.
- **Iter 2:** tạo hợp đồng → khách kích hoạt → hóa đơn → QR → PAID → sự cố → chấm dứt → ENDED.
- **Iter 3:** chạy trọn mọi UC; hết hạn → hoàn cọc; dashboard, báo cáo có số thật.

## Cắt nếu trễ (theo thứ tự)

1. OCR ·
