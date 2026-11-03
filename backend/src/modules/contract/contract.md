# Module contract

> Vòng đời hợp đồng: tạo nháp, xem danh sách và chi tiết, sửa, gia hạn, hủy nháp, tự kết thúc khi hết hạn và hoàn cọc. **UC-24, UC-25, UC-26, UC-27, UC-45, UC-46.**
> Khách bấm link kích hoạt (UC-06) nằm ở module `activation`. Chấm dứt trước hạn (UC-28, UC-29) nằm ở module `termination`.

**Người làm:** BE An · FE Hưng · Iter 2

**Quyền**

- **Manager:** thực hiện mọi thao tác quản lý hợp đồng, nhưng chỉ trong phạm vi **tòa nhà mình đang được phân công quản lý**. Thao tác ngoài phạm vi tòa nhà sẽ bị từ chối với thông báo "Bạn không có quyền thực hiện thao tác này".
- **Customer:** chỉ được **xem** hợp đồng của chính mình.

---

## Vòng đời hợp đồng

- **Nháp** → khách kích hoạt (UC-06) → **Đang hiệu lực**
- **Nháp** → Manager hủy (UC-46) → **Đã hủy**
- **Đang hiệu lực** → hết hạn tự nhiên (UC-45) hoặc đến ngày hiệu lực của đơn chấm dứt đã xác nhận (UC-28, UC-29) → **Đã kết thúc**
- Khi đang có đơn chấm dứt chờ xử lý hoặc chờ đến ngày hiệu lực, hợp đồng **vẫn ở trạng thái Đang hiệu lực** cho tới ngày hiệu lực của đơn.
- Mỗi phòng tại một thời điểm chỉ có **tối đa một** hợp đồng ở trạng thái Nháp hoặc Đang hiệu lực.

---

## UC-24 · Tạo hợp đồng thuê

**Ai dùng:** Manager

**Luồng chính**

- Manager chọn phòng đang **Trống** thuộc tòa nhà mình quản lý, mở biểu mẫu tạo hợp đồng.
- Biểu mẫu hiển thị sẵn **giá thuê và tiền cọc** lấy từ thông tin phòng ở chế độ chỉ xem.
- Manager nhập **ngày bắt đầu, thời hạn thuê (số tháng), số CCCD người đại diện, email người đại diện** và **ghi chú** (nếu có). Hệ thống tự tính ngày kết thúc theo chu kỳ tháng, kiểm tra định dạng CCCD và email.
- Manager chọn loại hợp đồng:
  - **Hợp đồng đơn:** chỉ có một người cư trú là người đại diện.
  - **Hợp đồng nhóm:** nhập thêm danh sách người ở cùng gồm **họ tên, CCCD, số điện thoại, ngày sinh, địa chỉ, mối quan hệ**.
- Khi xác nhận tạo hợp đồng, hệ thống thực hiện trong cùng một giao dịch:
  - Lưu hợp đồng ở trạng thái **Nháp**, chụp lại giá thuê và tiền cọc từ phòng.
  - Lưu trước danh sách người ở cùng (nếu là hợp đồng nhóm).
  - Sinh link kích hoạt duy nhất có thời hạn 24 giờ và gửi email lời mời cho người đại diện.
- Phòng vẫn giữ trạng thái **Trống** cho tới khi khách hàng hoàn tất kích hoạt hợp đồng.

**Các trường hợp**

- **Manager hủy thao tác:** không lưu dữ liệu, phòng vẫn Trống.
- **Gửi lại lời mời:** khi link cũ hết hạn hoặc thất lạc, Manager bấm gửi lại lời mời; hệ thống vô hiệu hóa mọi link mời chưa dùng trước đó của hợp đồng, tạo link mới có hạn 24 giờ, gửi lại email và ghi nhật ký thao tác.
- **CCCD thuộc khách cũ đã ngưng hoạt động:** cho phép tạo hợp đồng mới bình thường; khi khách kích hoạt, hệ thống sẽ mở lại tài khoản cũ.
- **Phòng không thuộc tòa nhà Manager quản lý:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".
- **Phòng không ở trạng thái Trống hoặc đã có hợp đồng Nháp / Đang hiệu lực:** từ chối, không cho tạo thêm hợp đồng.
- **CCCD người đại diện hoặc người ở cùng đang cư trú ở phòng khác:** từ chối, báo khách đang thuê hoặc đang ở phòng khác.
- **CCCD hoặc email gắn với tài khoản đã bị khóa do vi phạm:** từ chối, không cho phép tạo hợp đồng mới.
- **Email thuộc về tài khoản quản trị/quản lý hoặc đã gắn với khách hàng khác:** từ chối.
- **Số điện thoại người ở cùng bị trùng lặp hoặc đã thuộc về người khác trong hệ thống:** từ chối.
- **Hợp đồng đơn nhưng gửi kèm người ở cùng, hoặc hợp đồng nhóm nhưng không có người ở cùng:** từ chối.
- **Tổng số người (gồm người đại diện và người ở cùng) vượt quá sức chứa tối đa của loại phòng:** từ chối.
- **Ngày bắt đầu nằm trong quá khứ:** vẫn cho tạo (hợp đồng hồi tố) và trả kèm cảnh báo.
- **Gửi email thất bại:** hợp đồng nháp vẫn được lưu thành công, trả kèm cảnh báo để Manager gửi lại lời mời sau.

---

## UC-25 · Xem danh sách và chi tiết hợp đồng

**Ai dùng:** Manager · Customer

**Luồng chính**

- **Xem danh sách hợp đồng:**
  - **Manager:** xem danh sách các hợp đồng thuộc tòa nhà mình quản lý, hỗ trợ lọc theo trạng thái hợp đồng và theo phòng, kết quả có phân trang và sắp xếp hợp đồng mới nhất lên trước.
  - **Customer:** xem hợp đồng hiện tại của chính mình (có phân trang).
- **Xem chi tiết hợp đồng:**
  - Hiển thị đầy đủ: **thông tin phòng** (số phòng, tầng, loại phòng, sức chứa, tòa nhà), **thông tin người đại diện** (nếu hợp đồng đang ở trạng thái Nháp thì chỉ có CCCD và email; nếu đã kích hoạt thì có đầy đủ họ tên, CCCD, email, số điện thoại, ngày sinh, địa chỉ), **danh sách cư dân** thuộc hợp đồng, **ngày bắt đầu, ngày kết thúc, giá thuê, tiền cọc, trạng thái, ghi chú**.

**Các trường hợp**

- **Chưa có hợp đồng nào khớp điều kiện:** trả về danh sách rỗng.
- **Không tìm thấy hợp đồng theo mã yêu cầu:** báo "Không tìm thấy hợp đồng".
- **Manager lọc theo phòng hoặc mở chi tiết hợp đồng của tòa nhà khác:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".
- **Customer mở xem chi tiết hợp đồng không phải của mình:** từ chối, báo "Bạn không có quyền xem hợp đồng này".

---

## UC-26 · Cập nhật hợp đồng

**Ai dùng:** Manager

**Luồng chính**

- Manager chọn hợp đồng thuộc tòa nhà mình quản lý để chỉnh sửa:
  - **Khi hợp đồng ở trạng thái Nháp:** cho phép sửa **CCCD người đại diện, email người đại diện, ngày bắt đầu, thời hạn thuê (số tháng – hệ thống tự tính lại ngày kết thúc) và ghi chú**.
  - **Khi hợp đồng ở trạng thái Đang hiệu lực:** chỉ cho phép sửa **ghi chú / điều khoản**. Các trường giá thuê, tiền cọc, CCCD đại diện, email đại diện, ngày bắt đầu, thời hạn đều bị khóa.
- Khi lưu thay đổi, hệ thống cập nhật hợp đồng và ghi nhật ký thao tác kèm giá trị trước và sau khi sửa.

**Các trường hợp**

- **Đổi CCCD hoặc email người đại diện trên hợp đồng Nháp:**
  - CCCD và email mới phải vượt qua đầy đủ các bước kiểm tra tính hợp lệ và tính duy nhất giống như lúc tạo hợp đồng (không trùng người ở cùng trong hợp đồng, không đang ở phòng khác, không thuộc tài khoản bị khóa, email không thuộc tài khoản khác).
  - Ngay trong cùng giao dịch cập nhật, toàn bộ link mời kích hoạt cũ chưa sử dụng của hợp đồng sẽ bị chuyển sang hết hiệu lực. Sau đó Manager tự bấm "Gửi lại lời mời" để phát hành link mới cho khách.
- **Đổi ngày bắt đầu trên hợp đồng Nháp:** hệ thống tính lại ngày kết thúc theo thời hạn thuê và đồng bộ lại ngày vào ở của những người ở cùng đã khai báo trước trong hợp đồng nháp.
- **Hợp đồng Đang hiệu lực nhưng gửi lên trường khác ngoài ghi chú:** từ chối, báo "Hợp đồng đang hiệu lực chỉ được sửa ghi chú".
- **Hợp đồng Nháp nhưng gửi lên các trường bị khóa (như giá thuê, tiền cọc, mã phòng, loại hợp đồng):** từ chối.
- **Hợp đồng ở trạng thái Đã kết thúc hoặc Đã hủy:** từ chối, báo "Không thể chỉnh sửa hợp đồng đã kết thúc hoặc đã hủy".
- **Hợp đồng không thuộc tòa nhà Manager quản lý:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".

---

## UC-27 · Gia hạn hợp đồng

**Ai dùng:** Manager

**Luồng chính**

- Manager chọn hợp đồng **Đang hiệu lực** thuộc tòa nhà mình quản lý và thực hiện gia hạn.
- Nhập **số tháng gia hạn** (số nguyên lớn hơn 0, mặc định là 12 tháng) và **ghi chú** (tùy chọn).
- Hệ thống thực hiện trong cùng một giao dịch:
  - Chỉ **dời ngày kết thúc** của hợp đồng thêm đúng số tháng gia hạn tính nối tiếp từ ngày kết thúc hiện tại. Giá thuê, tiền cọc, danh sách cư dân và điều khoản trên hợp đồng được giữ nguyên.
  - Tạo thông báo trong ứng dụng gửi tới tài khoản người đại diện.
  - Ghi nhật ký cập nhật hợp đồng kèm ngày kết thúc cũ và ngày kết thúc mới.
- Sau khi lưu xong, hệ thống gửi email thông báo gia hạn cho người đại diện.

**Các trường hợp**

- **Hợp đồng không ở trạng thái Đang hiệu lực (đang Nháp, Đã kết thúc hoặc Đã hủy):** từ chối, báo "Chỉ gia hạn được hợp đồng đang hiệu lực".
- **Số tháng gia hạn không phải số nguyên lớn hơn 0:** từ chối, báo lỗi dữ liệu không hợp lệ.
- **Hợp đồng không thuộc tòa nhà Manager quản lý:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".
- **Gửi email thông báo lỗi:** việc gia hạn vẫn được lưu thành công, hệ thống trả kèm cảnh báo gửi email thất bại.

---

## UC-46 · Hủy hợp đồng nháp

**Ai dùng:** Manager

**Luồng chính**

- Khi khách hàng đổi ý không thuê nữa hoặc không kích hoạt hợp đồng, Manager chọn hợp đồng **Nháp** thuộc tòa nhà mình quản lý để hủy (kèm lý do hủy tùy chọn).
- Hệ thống thực hiện trong cùng một giao dịch:
  - Chuyển trạng thái hợp đồng sang **Đã hủy**.
  - Chuyển toàn bộ link mời kích hoạt còn hiệu lực của hợp đồng sang **hết hiệu lực**.
  - Chuyển trạng thái những người ở cùng đã nhập kèm trong hợp đồng nháp sang **đã chuyển đi** (giữ nguyên bản ghi để lưu vết, không xóa khỏi cơ sở dữ liệu).
  - Phòng vẫn giữ nguyên trạng thái **Trống**, không thay đổi gì.
  - Ghi nhật ký cập nhật hợp đồng kèm lý do hủy.
- Sau khi giao dịch hoàn tất, hệ thống gửi email tới địa chỉ email người đại diện với nội dung: *"Lời mời ký hợp đồng phòng [X] đã bị hủy"*.
- Sau khi hủy, phòng có thể được chọn để tạo hợp đồng mới ngay lập tức.

**Các trường hợp**

- **Hợp đồng không ở trạng thái Nháp:** từ chối, báo "Chỉ hủy được hợp đồng nháp. Hợp đồng đang hiệu lực phải chấm dứt qua đơn chấm dứt".
- **Khách hàng bấm vào link mời cũ sau khi hợp đồng nháp đã bị hủy:** hệ thống từ chối và báo "Link không còn hiệu lực".
- **Hợp đồng không thuộc tòa nhà Manager quản lý:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".
- **Gửi email lỗi:** hợp đồng nháp vẫn bị hủy thành công, hệ thống trả kèm cảnh báo gửi email thất bại.

---

## UC-45 · Kết thúc hợp đồng khi hết hạn và hoàn cọc

**Ai dùng:** Hệ thống (tự chạy) · Manager (hoàn cọc)

### Hệ thống tự kết thúc khi hết hạn

- Cuối ngày kết thúc của hợp đồng, nếu hợp đồng vẫn Đang hiệu lực, chưa được gia hạn và không có đơn chấm dứt đã xác nhận, hệ thống thực hiện trong cùng một giao dịch:
  - Chuyển hợp đồng sang **Đã kết thúc**.
  - Chuyển phòng sang **Trống**.
  - Chuyển toàn bộ cư dân đang ở sang **đã chuyển đi** với ngày chuyển ra là ngày kết thúc hợp đồng.
- Gửi thông báo trong ứng dụng và email cho người đại diện cùng Manager quản lý tòa.
- Sau 24 giờ kể từ khi hợp đồng kết thúc, tài khoản người đại diện được chuyển sang trạng thái **ngưng hoạt động**.

### Manager ghi nhận hoàn cọc

- Chỉ áp dụng cho hợp đồng **Đã kết thúc đúng hạn** (không có đơn chấm dứt đã xác nhận) và chỉ được ghi nhận hoàn cọc **một lần duy nhất**.
- Manager kiểm tra số tiền cọc trên hợp đồng và danh sách hóa đơn chưa thanh toán (nếu có), sau đó xác nhận đã hoàn cọc bằng tiền mặt.
- Hệ thống lưu thời điểm hoàn cọc, người thực hiện, gửi thông báo và email cho người đại diện.
