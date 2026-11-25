# Module contract

> Vòng đời hợp đồng: tạo nháp, xem danh sách và chi tiết, sửa, gia hạn, hủy nháp, tự kết thúc khi hết hạn và hoàn cọc. **UC-24, UC-25, UC-26, UC-27, UC-45, UC-46.**
> Khách bấm link kích hoạt (UC-06) nằm ở module `activation`. Chấm dứt trước hạn (UC-28, UC-29) nằm ở module `termination`.

**Người làm:** BE An · FE Hưng · Iter 2

**Quyền**

- **Manager:** thực hiện mọi thao tác quản lý hợp đồng, nhưng chỉ trong phạm vi **tòa nhà mình đang được phân công quản lý**. Thao tác ngoài phạm vi tòa nhà sẽ bị từ chối với thông báo "Bạn không có quyền thực hiện thao tác này".
- **Customer:** chỉ được **xem** hợp đồng của chính mình.

---

## Vòng đời hợp đồng

- **Nháp** → khách kích hoạt (UC-06), phòng không còn bị ai giữ và khách không còn hợp đồng Đang hiệu lực nào khác → **Đang hiệu lực**
- **Nháp** → khách kích hoạt (UC-06), nhưng phòng vẫn còn hợp đồng của người trước **hoặc** khách vẫn còn hợp đồng Đang hiệu lực ở phòng khác → **Sắp hiệu lực** (`UPCOMING`)
- **Sắp hiệu lực** → khi cả hai điều kiện trên đã hết → **Đang hiệu lực** (hệ thống tự chuyển, xem mục "Đặt thuê nối tiếp")
- **Nháp** → Manager hủy (UC-46) → **Đã hủy**
- **Sắp hiệu lực** → đơn chấm dứt thỏa thuận được xác nhận (UC-28) → **Đã hủy**, khách **mất cọc**
- **Đang hiệu lực** → hết hạn tự nhiên (UC-45) hoặc đến ngày hiệu lực của đơn chấm dứt đã xác nhận (UC-28, UC-29) → **Đã kết thúc**
- Khi đang có đơn chấm dứt chờ xử lý hoặc chờ đến ngày hiệu lực, hợp đồng **vẫn ở trạng thái Đang hiệu lực** cho tới ngày hiệu lực của đơn.
- Khách đã kích hoạt nghĩa là Manager **đã thu cọc** (tiền mặt, ngoài hệ thống) trước khi gửi link mời.

### Phân biệt Đang hiệu lực và Sắp hiệu lực

Điểm phân biệt **không phải ngày bắt đầu**, mà là **phòng đã thuộc về hợp đồng này chưa**.

- **Đang hiệu lực:** hợp đồng đang giữ phòng, phòng là Đang thuê. Ngày bắt đầu có thể đã tới hoặc còn ở tương lai (phòng trống, khách kích hoạt sớm thì phòng được giữ chỗ từ lúc kích hoạt).
- **Sắp hiệu lực:** khách đã ký và đã cọc, nhưng đang **xếp hàng** chờ người trước trả phòng hoặc chờ chính mình trả phòng cũ.

| | Đang hiệu lực | Sắp hiệu lực |
|---|---|---|
| Phòng | Đang thuê, gắn với hợp đồng này | Vẫn của người trước, hoặc Trống nhưng đã được giữ chỗ |
| Số lượng mỗi phòng | Tối đa 1 | Tối đa 1 |
| Cư dân | Tính là đang ở phòng | Hồ sơ lưu sẵn, chưa tính là đang ở |
| Lập hóa đơn, báo sự cố | Có | Không |
| Manager sửa hợp đồng | Chỉ ghi chú | **Không sửa gì** |
| Khách sửa người ở cùng, thông tin cá nhân | Theo quy tắc hiện tại | **Không sửa gì**, chỉ xem, đổi mật khẩu và xác nhận đơn chấm dứt |
| Gia hạn | Có, nếu phòng chưa có hợp đồng nối tiếp | Không |
| Kết thúc bằng | Hết hạn hoặc đơn chấm dứt → Đã kết thúc | Đơn chấm dứt thỏa thuận → **Đã hủy**, mất cọc. Khách bị đơn phương ở phòng cũ → **Đã hủy**, được hoàn cọc |

### Đặt thuê nối tiếp

- **Ngày rời đi** của một hợp đồng Đang hiệu lực = ngày hiệu lực của đơn chấm dứt đã xác nhận (nếu có), nếu không thì là ngày kết thúc.
- Mỗi phòng có tối đa **một** hợp đồng Đang hiệu lực và **một** hợp đồng đang chờ (Nháp hoặc Sắp hiệu lực). Thời gian các hợp đồng của một phòng **không được chồng lên nhau**.
- Phòng đang có người thuê chỉ nhận hợp đồng nối tiếp khi hợp đồng hiện tại còn **không quá 1 tháng** tới ngày rời đi, và ngày bắt đầu của hợp đồng mới phải **sau** ngày rời đi.
- Không bắt buộc khoảng đệm giữa hai hợp đồng: Manager tự chọn ngày bắt đầu (ngay hôm sau, hoặc lùi vài ngày để dọn phòng).
- Người thuê hiện tại muốn ở tiếp thì phải gia hạn **trước** khi phòng có hợp đồng nối tiếp. Phòng đã có hợp đồng nối tiếp thì không gia hạn được nữa.
- Một khách đang thuê phòng khác vẫn được đặt trước phòng mới, miễn ngày bắt đầu phòng mới sau ngày rời đi của phòng cũ. **Một khách không bao giờ có hai hợp đồng Đang hiệu lực cùng lúc.**
- **Sắp hiệu lực → Đang hiệu lực:** mỗi khi một hợp đồng kết thúc (UC-45, UC-28, UC-29), ngay trong giao dịch kết thúc đó hệ thống kiểm tra hai hướng: phòng vừa trả có hợp đồng Sắp hiệu lực đang chờ không, và người đại diện vừa trả phòng có hợp đồng Sắp hiệu lực ở phòng khác không. Hợp đồng nào đã hết cả hai điều kiện chờ thì chuyển Đang hiệu lực, phòng chuyển Đang thuê, cư dân được tính là đang ở. Gửi thông báo cho người đại diện.
- **Khách bị chấm dứt đơn phương ở phòng cũ khi đang có hợp đồng Sắp hiệu lực:** ngay khi đơn đơn phương được Admin duyệt, hệ thống tự hủy hợp đồng Sắp hiệu lực (sang **Đã hủy**). Trường hợp này khách **được hoàn cọc** của hợp đồng Sắp hiệu lực, Manager trả tiền mặt ngoài hệ thống. Hệ thống gửi thông báo và email cho khách, báo hợp đồng bị hủy và liên hệ Manager nhận lại tiền cọc. Phòng mới hết giữ chỗ, phòng và hợp đồng của người trước không đổi.
- Trong lúc phòng Trống nhưng đã được giữ chỗ cho hợp đồng Sắp hiệu lực: không tạo được hợp đồng mới cho phòng, Admin không chuyển được phòng sang Bảo trì.

**Ví dụ** (hôm nay 25/11/2026):

1. **Phòng trống, ngày bắt đầu ở tương lai:** P102 trống, C ký từ 10/12. C kích hoạt hôm nay → **Đang hiệu lực** ngay, phòng giữ chỗ cho C, hóa đơn tính từ tháng 12. Không có Sắp hiệu lực.
2. **Thuê nối tiếp:** A thuê P101 đến 31/12. Ngày 1/12 Manager tạo hợp đồng cho B từ 1/1/2027, B kích hoạt ngày 2/12 → **Sắp hiệu lực**. Cuối ngày 31/12 A kết thúc, B chuyển **Đang hiệu lực** ngay trong cùng giao dịch, phòng không lúc nào bị Trống. Ngày 20/12 A xin gia hạn → bị chặn.
3. **A chấm dứt sớm:** như ví dụ 2 nhưng A rời đi ngày 15/12 → B chuyển Đang hiệu lực từ 15/12, phòng giữ chỗ cho B. Ngày bắt đầu của B vẫn là 1/1, hóa đơn của B tính từ tháng 1.
4. **B đổi ý:** như ví dụ 2, ngày 10/12 B báo không thuê nữa → Manager lập đơn chấm dứt thỏa thuận, B xác nhận → hợp đồng B **Đã hủy**, B mất cọc. A không bị ảnh hưởng và có thể gia hạn lại, phòng lại nhận đặt nối tiếp.
5. **B chuyển phòng:** B đang thuê P205 đến 31/12, đặt P101 từ 1/1 (A cũng thuê P101 đến 31/12). Nếu A rời đi sớm ngày 15/12 thì B **vẫn Sắp hiệu lực** (B chưa trả P205), P101 Trống nhưng giữ chỗ cho B. Cuối ngày 31/12 B trả P205 → hợp đồng P101 chuyển Đang hiệu lực.
6. **B bị chấm dứt đơn phương ở phòng cũ:** như ví dụ 5, ngày 10/12 Admin duyệt đơn đơn phương với B ở P205 → hợp đồng P101 của B tự **Đã hủy**, B được hoàn cọc P101 bằng tiền mặt. A vẫn ở P101 như bình thường.

---

## UC-24 · Tạo hợp đồng thuê

**Ai dùng:** Manager

**Luồng chính**

- Manager chọn phòng thuộc tòa nhà mình quản lý, mở biểu mẫu tạo hợp đồng. Phòng phải đang **Trống**, hoặc đang có người thuê nhưng còn không quá 1 tháng tới ngày rời đi (đặt thuê nối tiếp).
- Biểu mẫu hiển thị sẵn **giá thuê và tiền cọc** lấy từ thông tin phòng ở chế độ chỉ xem.
- Manager nhập **ngày bắt đầu, thời hạn thuê (số tháng), số CCCD người đại diện, email người đại diện** và **ghi chú** (nếu có). Hệ thống tự tính ngày kết thúc theo chu kỳ tháng, kiểm tra định dạng CCCD và email.
- Manager chọn loại hợp đồng:
  - **Hợp đồng đơn:** chỉ có một người cư trú là người đại diện.
  - **Hợp đồng nhóm:** nhập thêm danh sách người ở cùng gồm **họ tên, CCCD, số điện thoại, ngày sinh, địa chỉ, mối quan hệ**.
- Khi xác nhận tạo hợp đồng, hệ thống thực hiện trong cùng một giao dịch:
  - Lưu hợp đồng ở trạng thái **Nháp**, chụp lại giá thuê và tiền cọc từ phòng.
  - Lưu trước danh sách người ở cùng (nếu là hợp đồng nhóm).
  - Sinh link kích hoạt duy nhất có thời hạn 24 giờ và gửi email lời mời cho người đại diện.
- Trạng thái phòng không đổi khi tạo hợp đồng nháp. Phòng chỉ đổi khi hợp đồng chuyển Đang hiệu lực.

**Các trường hợp**

- **Manager hủy thao tác:** không lưu dữ liệu, phòng giữ nguyên.
- **Gửi lại lời mời:** khi link cũ hết hạn hoặc thất lạc, Manager bấm gửi lại lời mời; hệ thống vô hiệu hóa mọi link mời chưa dùng trước đó của hợp đồng, tạo link mới có hạn 24 giờ, gửi lại email và ghi nhật ký thao tác.
- **CCCD thuộc khách cũ đã ngưng hoạt động:** cho phép tạo hợp đồng mới bình thường; khi khách kích hoạt, hệ thống sẽ mở lại tài khoản cũ.
- **Phòng không thuộc tòa nhà Manager quản lý:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".
- **Phòng đang Bảo trì, đã có hợp đồng Nháp / Sắp hiệu lực, hoặc hợp đồng hiện tại còn hơn 1 tháng tới ngày rời đi:** từ chối, báo "Phòng chưa nhận hợp đồng mới". Đã có hợp đồng nối tiếp thì báo "Phòng đã có hợp đồng nối tiếp từ ngày [ngày bắt đầu]".
- **Ngày bắt đầu không sau ngày rời đi của hợp đồng hiện tại (thời gian bị chồng lên):** từ chối, báo "Ngày bắt đầu phải sau ngày [ngày rời đi] (ngày trả phòng của hợp đồng hiện tại)".
- **CCCD người đại diện hoặc người ở cùng đang cư trú ở phòng khác và thời gian bị chồng lên:** từ chối, báo khách đang thuê hoặc đang ở phòng khác. Nếu hợp đồng mới bắt đầu sau ngày rời đi của phòng cũ thì cho phép (khách đặt trước để chuyển phòng).
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
  - **Customer:** xem hợp đồng hiện tại của chính mình (có phân trang), gồm cả hợp đồng Sắp hiệu lực.
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
  - **Khi hợp đồng ở trạng thái Sắp hiệu lực:** không cho sửa gì. Cần đổi thì khách và Manager thống nhất hủy qua đơn chấm dứt thỏa thuận (UC-28), rồi tạo hợp đồng mới.
  - **Khi hợp đồng ở trạng thái Đang hiệu lực:** chỉ cho phép sửa **ghi chú / điều khoản**. Các trường giá thuê, tiền cọc, CCCD đại diện, email đại diện, ngày bắt đầu, thời hạn đều bị khóa.
- Khi lưu thay đổi, hệ thống cập nhật hợp đồng và ghi nhật ký thao tác kèm giá trị trước và sau khi sửa.

**Các trường hợp**

- **Đổi CCCD hoặc email người đại diện trên hợp đồng Nháp:**
  - CCCD và email mới phải vượt qua đầy đủ các bước kiểm tra tính hợp lệ và tính duy nhất giống như lúc tạo hợp đồng (không trùng người ở cùng trong hợp đồng, không đang ở phòng khác, không thuộc tài khoản bị khóa, email không thuộc tài khoản khác).
  - Ngay trong cùng giao dịch cập nhật, toàn bộ link mời kích hoạt cũ chưa sử dụng của hợp đồng sẽ bị chuyển sang hết hiệu lực. Sau đó Manager tự bấm "Gửi lại lời mời" để phát hành link mới cho khách.
- **Đổi ngày bắt đầu hoặc thời hạn trên hợp đồng Nháp nối tiếp:** kiểm lại quy tắc đặt thuê nối tiếp như lúc tạo (ngày bắt đầu phải sau ngày rời đi của hợp đồng hiện tại của phòng và của phòng cũ của khách).
- **Hợp đồng Sắp hiệu lực:** từ chối, báo "Hợp đồng sắp hiệu lực không được chỉnh sửa".
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

- **Hợp đồng không ở trạng thái Đang hiệu lực (đang Nháp, Sắp hiệu lực, Đã kết thúc hoặc Đã hủy):** từ chối, báo "Chỉ gia hạn được hợp đồng đang hiệu lực".
- **Phòng đã có hợp đồng nối tiếp (Nháp hoặc Sắp hiệu lực):** từ chối, báo "Phòng đã có hợp đồng nối tiếp từ ngày [ngày bắt đầu]".
- **Người đại diện đã có hợp đồng Sắp hiệu lực ở phòng khác và ngày kết thúc mới chồng lên ngày bắt đầu của hợp đồng đó:** từ chối.
- **Hợp đồng đang có đơn chấm dứt đang xử lý (Chờ xử lý hoặc Đã xác nhận chưa tới ngày hiệu lực):** từ chối, báo "Không thể gia hạn hợp đồng đang có đơn chấm dứt đang xử lý".
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
- **Hợp đồng Sắp hiệu lực (khách đã kích hoạt):** không hủy ở đây. Khách đã ký và đã cọc nên phải đi qua đơn chấm dứt thỏa thuận (UC-28): Manager lập đơn, khách xác nhận, hợp đồng sang **Đã hủy** và khách **mất cọc**.
- **Khách hàng bấm vào link mời cũ sau khi hợp đồng nháp đã bị hủy:** hệ thống từ chối và báo "Link không còn hiệu lực".
- **Hợp đồng không thuộc tòa nhà Manager quản lý:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".
- **Gửi email lỗi:** hợp đồng nháp vẫn bị hủy thành công, hệ thống trả kèm cảnh báo gửi email thất bại.

---

## UC-45 · Kết thúc hợp đồng khi hết hạn và hoàn cọc

**Ai dùng:** Hệ thống (tự chạy) · Manager (hoàn cọc)

### Hệ thống tự kết thúc khi hết hạn

- Khi ngày kết thúc của hợp đồng đã tới hoặc đã qua mà hợp đồng vẫn Đang hiệu lực và không có đơn chấm dứt ở trạng thái Đã xác nhận, hệ thống thực hiện trong cùng một giao dịch:
  - Chuyển hợp đồng sang **Đã kết thúc**.
  - Chuyển phòng sang **Trống**, rồi kiểm tra hợp đồng Sắp hiệu lực đang chờ (của phòng này và của người đại diện ở phòng khác) theo mục "Đặt thuê nối tiếp". Hợp đồng nào đủ điều kiện thì chuyển Đang hiệu lực, phòng của nó chuyển **Đang thuê**.
  - Chuyển toàn bộ cư dân đang ở sang **đã chuyển đi** với ngày chuyển ra là ngày kết thúc hợp đồng.
  - Nếu hợp đồng đang có đơn chấm dứt ở trạng thái Chờ xử lý thì tự động chuyển đơn đó sang **Đã hủy** với lý do *"Hợp đồng đã hết hạn"*.
  - Tạo thông báo trong ứng dụng gửi cho người đại diện và Manager quản lý tòa nhà.
- Gửi email thông báo kết thúc hợp đồng cho người đại diện.
- Sau 24 giờ kể từ khi hợp đồng kết thúc (nếu khách không còn hợp đồng Đang hiệu lực hoặc Sắp hiệu lực nào khác), hệ thống chuyển tài khoản người đại diện sang trạng thái **ngưng hoạt động** và ghi nhật ký. Quy tắc này cũng áp dụng 24 giờ sau khi hợp đồng Sắp hiệu lực bị hủy qua đơn chấm dứt thỏa thuận.

### Manager xem trước và ghi nhận hoàn cọc

- **Điều kiện được hoàn cọc:** chỉ áp dụng cho hợp đồng ở trạng thái **Đã kết thúc** do hết hạn tự nhiên (không có bất kỳ đơn chấm dứt nào ở trạng thái Đã xác nhận) và mỗi hợp đồng chỉ được ghi nhận hoàn cọc **một lần duy nhất**.
- **Xem trước thông tin hoàn cọc:** hệ thống trả về số tiền đặt cọc trên hợp đồng kèm danh sách các hóa đơn đang chờ thanh toán (nếu có) và thông báo cảnh báo tổng số hóa đơn cùng tổng số tiền chưa thanh toán để Manager đối chiếu trước khi trả tiền mặt.
- **Xác nhận hoàn cọc:**
  - Hệ thống thực hiện trong cùng một giao dịch: lưu thời điểm hoàn cọc, lưu Manager thực hiện hoàn cọc, tạo thông báo hoàn tiền đặt cọc cho người đại diện và ghi nhật ký cập nhật hợp đồng.
  - Sau khi lưu xong, hệ thống bắt buộc gửi email xác nhận hoàn trả tiền đặt cọc cho người đại diện.

**Các trường hợp chặn khi hoàn cọc**

- **Hợp đồng có đơn chấm dứt ở trạng thái Đã xác nhận (chấm dứt trước hạn do thỏa thuận hoặc đơn phương):** từ chối hoàn cọc, báo "Hợp đồng chấm dứt trước hạn không được hoàn cọc".
- **Hợp đồng chưa ở trạng thái Đã kết thúc:** từ chối, báo "Chỉ có thể hoàn cọc cho hợp đồng đã kết thúc".
- **Hợp đồng đã được ghi nhận hoàn cọc trước đó:** từ chối, báo rõ thời điểm đã hoàn cọc và họ tên người đã thực hiện hoàn cọc.
- **Hợp đồng không thuộc tòa nhà Manager quản lý:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".
- **Gửi email xác nhận hoàn cọc thất bại:** dữ liệu hoàn cọc và thông báo trong ứng dụng vẫn được lưu thành công, hệ thống trả kèm cảnh báo gửi email thất bại.
