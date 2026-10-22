
# Module contract

> Vòng đời hợp đồng: tạo nháp, xem, sửa, gia hạn, hủy nháp, tự kết thúc khi hết hạn và hoàn cọc. **UC-24, UC-25, UC-26, UC-27, UC-45, UC-46.**
> Khách bấm link kích hoạt (UC-06) nằm ở module `activation`. Chấm dứt trước hạn (UC-28, UC-29) nằm ở module `termination`.

**Người làm:** BE An · FE Hưng · Iter 2 (UC-45 làm ở Iter 3)

**Quyền**

- **Manager:** mọi thao tác, chỉ với hợp đồng thuộc **tòa mình phụ trách**.
- **Customer:** chỉ **xem** hợp đồng của phòng mình.

---

## Vòng đời hợp đồng

```
Nháp ──khách kích hoạt (UC-06)──▶ Đang hiệu lực ──hết hạn (UC-45)──────────▶ Đã kết thúc
  │                                     └──chấm dứt trước hạn (UC-28, 29)──▶ Đã kết thúc
  └──Manager hủy (UC-46)──▶ Đã hủy
```

- Đang có đơn chấm dứt thì hợp đồng **vẫn Đang hiệu lực** tới ngày hiệu lực của đơn.
- Mỗi phòng tại một thời điểm chỉ có **tối đa một** hợp đồng Nháp hoặc Đang hiệu lực.

---

## UC-24 · Tạo hợp đồng thuê

**Ai dùng:** Manager

**Luồng chính**

1. Manager chọn phòng **Trống** thuộc tòa mình, bấm "Tạo hợp đồng".
2. Form hiện sẵn **giá thuê, tiền cọc** lấy từ phòng, chỉ xem.
3. Manager nhập **ngày bắt đầu, thời hạn (tháng), CCCD người đại diện, email người đại diện**. Hệ thống tự tính ngày kết thúc, kiểm tra định dạng CCCD và email.
4. Chọn loại hợp đồng:
   - **Đơn:** một người.
   - **Nhóm:** nhập thêm thông tin người ở cùng — **họ tên, CCCD, số điện thoại, ngày sinh**.
5. Bấm "Gửi lời mời ký hợp đồng":
   - Tạo hợp đồng **Nháp**.
   - Sinh link mời duy nhất, hạn 24 giờ, gửi email cho khách.
6. Báo "Đã gửi lời mời thành công", hợp đồng hiện trong danh sách với trạng thái Nháp.

**Các trường hợp**

- **Manager hủy:** không lưu, phòng vẫn Trống.
- **Gửi lại lời mời** (link cũ hết hạn): link cũ bị vô hiệu, tạo link mới, gửi lại email.
- **CCCD thuộc khách cũ đã ngưng hoạt động:** cho tạo bình thường. Lúc kích hoạt hệ thống mở lại tài khoản cũ.
- **Phòng đã có hợp đồng Nháp hoặc Đang hiệu lực:** từ chối, báo phòng không còn trống.
- **CCCD đang gắn với tài khoản khách có hợp đồng Đang hiệu lực:** từ chối, báo khách đang thuê phòng khác.
- **CCCD thuộc tài khoản bị khóa** (từng bị chấm dứt do vi phạm): từ chối, không cho thuê lại.
- **Ngày bắt đầu trong quá khứ:** cảnh báo, **vẫn cho tạo** (hợp đồng hồi tố).
- **Gửi email lỗi:** hợp đồng **vẫn được tạo**, cảnh báo Manager gửi lại.
- **Hợp đồng nhóm vượt sức chứa phòng:** từ chối (BR-087).

**Quy tắc**

- Mỗi phòng tối đa **một** hợp đồng Nháp hoặc Đang hiệu lực.
- Giá thuê và tiền cọc **chép từ phòng lúc tạo**, sau này Admin đổi giá phòng cũng không ảnh hưởng.
- Link mời sống **24 giờ**, dùng **một lần**, gắn với đúng một hợp đồng.
- Phòng vẫn **Trống** cho tới khi khách kích hoạt.

---

## UC-25 · Xem danh sách và chi tiết hợp đồng

**Ai dùng:** Manager · Customer

**Luồng chính**

1. Vào mục "Hợp đồng":
   - **Manager:** danh sách hợp đồng của tòa, lọc theo trạng thái và phòng.
   - **Customer:** hợp đồng hiện tại của phòng mình.
2. Chọn một hợp đồng → hiện **thông tin phòng, người đại diện, danh sách cư dân, ngày bắt đầu, ngày kết thúc, giá thuê, tiền cọc, trạng thái**.

**Các trường hợp**

- **Chưa có hợp đồng nào:** báo "Chưa có hợp đồng nào".
- **Customer xem hợp đồng phòng khác:** từ chối, báo không có quyền.

**Quy tắc**

- Customer chỉ xem hợp đồng phòng mình.
- Manager chỉ xem hợp đồng thuộc tòa được phân công.

---

## UC-26 · Cập nhật hợp đồng

**Ai dùng:** Manager

**Áp dụng cho hợp đồng Nháp hoặc Đang hiệu lực.**

**Luồng chính**

1. Manager chọn hợp đồng, bấm "Chỉnh sửa" → form hiện các trường được phép sửa.
2. Sửa, bấm "Lưu" → cập nhật, ghi nhật ký.

**Sửa được gì**

- **Khi Nháp:** CCCD và email người đại diện, ngày bắt đầu, ghi chú, điều khoản đặc biệt. Sửa xong thì gửi lại lời mời.
- **Khi Đang hiệu lực:** chỉ ghi chú và điều khoản đặc biệt. Giá thuê, tiền cọc, CCCD đại diện, ngày bắt đầu **bị khóa**.

**Các trường hợp**

- **Manager hủy:** không lưu.
- **Hợp đồng Đã kết thúc hoặc Đã hủy:** từ chối, báo không sửa được.
- **Sửa trường bị khóa:** các trường đó hiện dạng chỉ xem trên form.

**Quy tắc**

- Mọi thay đổi ghi nhật ký: ai sửa, lúc nào.

---

## UC-27 · Gia hạn hợp đồng

**Ai dùng:** Manager

**Luồng chính**

1. Manager chọn hợp đồng Đang hiệu lực sắp hết hạn, bấm "Gia hạn".
2. Form: **số tháng gia hạn** (mặc định 12), **ngày kết thúc mới** (tự tính), **ghi chú**.
3. Xác nhận → cập nhật ngày kết thúc, ghi nhật ký.
4. Khách nhận **thông báo trong ứng dụng và email** về việc gia hạn.

**Các trường hợp**

- **Manager hủy:** không thay đổi.
- **Hợp đồng không Đang hiệu lực:** từ chối.
- **Số tháng không lớn hơn 0:** báo lỗi.

**Quy tắc**

- Chỉ gia hạn hợp đồng Đang hiệu lực.
- Gia hạn **chỉ dời ngày kết thúc**. Giá thuê, cư dân, điều khoản giữ nguyên, muốn đổi thì tạo hợp đồng mới.

---

## UC-46 · Hủy hợp đồng nháp

**Ai dùng:** Manager

**Dùng khi:** khách không kích hoạt hoặc đổi ý không thuê nữa. Không để hợp đồng nháp treo mãi làm khóa phòng.

**Luồng chính**

1. Manager chọn hợp đồng **Nháp** thuộc tòa mình, bấm "Hủy hợp đồng".
2. Hiện hộp xác nhận kèm ô **lý do hủy (tùy chọn)**.
3. Xác nhận → **cùng một lần**:
   - Hợp đồng → **Đã hủy**.
   - Link mời còn hiệu lực → hết hiệu lực.
   - Người ở cùng đã nhập kèm → **đã chuyển đi** (giữ lại, không xóa).
   - Ghi nhật ký kèm lý do.
4. Gửi email cho khách: *"Lời mời ký hợp đồng phòng [X] đã bị hủy"*. Báo "Đã hủy hợp đồng".
5. Phòng vẫn **Trống**, tạo được hợp đồng mới.

**Các trường hợp**

- **Manager hủy thao tác:** không thay đổi gì.
- **Chỉ nhập sai CCCD, email, ngày bắt đầu:** không cần hủy, sửa ở UC-26 rồi gửi lại lời mời.
- **Hợp đồng không phải Nháp:** từ chối. Hợp đồng Đang hiệu lực phải chấm dứt qua UC-28 hoặc UC-29.
- **Khách bấm link sau khi đã hủy:** báo "Link không còn hiệu lực".
- **Gửi email lỗi:** hợp đồng **vẫn bị hủy**, cảnh báo gửi thư thất bại.
- **Lỗi lưu:** quay lại như cũ, hợp đồng vẫn Nháp.

**Quy tắc**

- Chỉ hủy được hợp đồng Nháp.
- Hủy là **vĩnh viễn**, muốn cho thuê lại thì tạo hợp đồng mới. Hợp đồng đã hủy **vẫn lưu** để tra cứu.
- Người ở cùng của hợp đồng đã hủy **không hiện** trong danh sách cư dân của tòa.

---

## UC-45 · Kết thúc hợp đồng khi hết hạn và hoàn cọc

**Ai dùng:** Hệ thống (tự chạy) · Manager (hoàn cọc)

### Hệ thống tự kết thúc

**Cuối ngày kết thúc** của hợp đồng, nếu hợp đồng Đang hiệu lực, không được gia hạn và **không có đơn chấm dứt đã xác nhận**, hệ thống làm **cùng một lần**:

- Hợp đồng → **Đã kết thúc**.
- Phòng → **Trống**.
- Toàn bộ cư dân đang ở → **đã chuyển đi**, ngày chuyển ra là ngày kết thúc.

Sau đó gửi **thông báo và email** cho người đại diện và Manager: *"Hợp đồng phòng [X] đã kết thúc"*.

**24 giờ sau:** tài khoản người đại diện → **ngưng hoạt động**.

### Manager ghi nhận hoàn cọc

Sau khi bàn giao phòng, Manager trả cọc **bằng tiền mặt**, hệ thống chỉ ghi nhận.

1. Manager mở hợp đồng Đã kết thúc, bấm "Hoàn cọc".
2. Hệ thống hiện **số tiền cọc** theo hợp đồng, **các hóa đơn chưa thanh toán** (nếu có), nút "Xác nhận đã hoàn cọc".
3. Manager xác nhận → lưu thời điểm và người thực hiện.
4. Gửi **email và thông báo** cho người đại diện: *"Đã hoàn [số tiền] tiền cọc phòng [X]"*.

**Các trường hợp**

- **Lập hóa đơn tháng cuối:** Manager chốt chỉ số điện nước, lập hóa đơn (UC-34) **trong ngày kết thúc** khi hợp đồng còn hiệu lực. Hư hỏng tính vào chi phí phát sinh.
- **Hợp đồng được gia hạn trước ngày kết thúc:** không xử lý, vì ngày kết thúc đã dời.
- **Còn hóa đơn chưa thanh toán khi hoàn cọc:** cảnh báo *"Phòng còn [n] hóa đơn chưa thanh toán, tổng [Y]đ"*, **vẫn cho** xác nhận.
- **Hợp đồng kết thúc do đơn chấm dứt:** **không hoàn cọc**.
- **Đã hoàn cọc rồi:** không cho ghi nhận lần hai, hiện thời điểm và người đã hoàn.
- **Lỗi khi tự kết thúc:** quay lại như cũ, lần quét kế tiếp làm lại.
- **Gửi email lỗi:** dữ liệu vẫn lưu, ghi lỗi, cho gửi lại.

**Quy tắc**

- Chỉ hợp đồng **kết thúc đúng hạn** (không có đơn chấm dứt đã xác nhận) mới được hoàn cọc. Hoàn **đủ** số tiền cọc trên hợp đồng, hư hỏng thu qua hóa đơn.
- Mỗi hợp đồng chỉ hoàn cọc **một lần**. Tiền cọc hoàn bằng tiền mặt, hệ thống chỉ ghi nhận.
- Thông báo hoàn cọc **bắt buộc gửi email**, vì tài khoản khách có thể đã ngưng hoạt động.
