# Module occupant

> Quản lý cư dân của phòng: xem danh sách và chi tiết cư dân, cập nhật thông tin cư dân, thêm người ở cùng và rút tên người ở cùng. **UC-30, UC-31, UC-32, UC-33.**
> Hồ sơ cá nhân của khách thuê (Customer) cũng lưu tại bản ghi cư dân của hợp đồng chứ không nằm trực tiếp trong bảng tài khoản.

**Người làm:** BE An · FE Mạnh · Iter 2

**Phân quyền tổng quát**

- **Manager:** xem danh sách, xem chi tiết, chỉnh sửa thông tin, thêm người ở cùng và rút tên người ở cùng đối với cư dân thuộc tòa nhà mình đang được phân công quản lý.
- **Customer (người đại diện):** xem danh sách thành viên trong hợp đồng đang hiệu lực của phòng mình, xem chi tiết và chỉnh sửa thông tin người ở cùng trong phòng mình. Hồ sơ của chính người đại diện được cập nhật tại trang "Hồ sơ cá nhân" (UC-05).

---

## Hai vai trò cư dân trong phòng

- **Người đại diện:**
  - Có tài khoản đăng nhập hệ thống (đăng nhập bằng số CCCD 12 chữ số lưu trong hồ sơ cư dân đại diện và mật khẩu).
  - Hồ sơ cư dân và tài khoản được tạo hoặc kích hoạt lại khi khách bấm link xác nhận hợp đồng (UC-06).
- **Người ở cùng:**
  - Không có tài khoản đăng nhập hệ thống.
  - Hồ sơ cư dân do Manager nhập sẵn khi tạo hợp đồng nhóm dạng nháp (UC-24) hoặc thêm bổ sung khi hợp đồng đang hiệu lực (UC-32).
- **Khái niệm "đang ở":**
  - Chỉ những cư dân có trạng thái đang ở (`STAYED`) thuộc hợp đồng đang hiệu lực (`ACTIVE`) mới được tính là cư dân đang ở tại phòng.
  - Người ở cùng đã nhập kèm trong hợp đồng nháp (`DRAFT`) hoặc hợp đồng nháp đã hủy (`CANCELLED`) chưa từng thực sự vào ở nên không xuất hiện trong danh sách cư dân của tòa nhà.

---

## UC-30 · Xem danh sách và chi tiết cư dân

**Ai dùng:** Manager · Customer (người đại diện)

**Luồng chính cho Manager**

- Manager mở mục "Quản lý cư dân" của tòa nhà mình phụ trách.
- Hệ thống hiển thị danh sách cư dân có phân trang, mặc định chỉ hiển thị những người đang ở (trạng thái `STAYED` thuộc hợp đồng `ACTIVE`).
- Mỗi dòng trong danh sách gồm: họ tên, số CCCD, số điện thoại, thông tin phòng (số phòng, tầng), vai trò trong phòng (`Đại diện` hoặc `Ở cùng`), trạng thái cư trú và ngày vào ở.
- Manager có thể lọc danh sách theo phòng cụ thể trong tòa và theo trạng thái cư trú (`STAYED` đang ở hoặc `LEFT` đã chuyển đi).
- Khi chọn một cư dân bất kỳ trong danh sách, hệ thống trả về thông tin chi tiết gồm: họ tên, số điện thoại, email (nếu là người đại diện), ngày sinh, địa chỉ thường trú, số CCCD, quan hệ với người đại diện, vai trò, ngày bắt đầu ở, ngày chuyển ra (nếu có), thông tin phòng và hợp đồng, cùng đường dẫn có chữ ký tạm thời (`cccdFrontUrl`, `cccdBackUrl`) để xem ảnh CCCD 2 mặt ngay trong chi tiết hồ sơ mà không cần gọi đường dẫn xem ảnh riêng.

**Luồng chính cho Customer (người đại diện)**

- Người đại diện mở trang "Thành viên phòng" để xem toàn bộ danh sách thành viên thuộc hợp đồng đang hiệu lực (`ACTIVE`) của mình, kèm thông tin phòng và sức chứa tối đa của phòng.
- Người đại diện có thể bấm xem chi tiết từng thành viên trong phòng mình (kể cả ảnh CCCD mặt trước và mặt sau thông qua đường dẫn có chữ ký tạm thời).

**Các trường hợp ngoại lệ và chặn lỗi**

- **Tòa nhà chưa có cư dân nào thỏa điều kiện lọc:** trả về danh sách rỗng kèm thông báo *"Chưa có cư dân nào"*.
- **Manager lọc theo phòng không tồn tại:** từ chối và báo *"Không tìm thấy phòng"*.
- **Manager lọc theo phòng hoặc mở chi tiết cư dân thuộc tòa nhà khác:** từ chối và báo *"Bạn không có quyền thực hiện thao tác này"*.
- **Customer mở chi tiết cư dân thuộc phòng/hợp đồng không phải của mình:** từ chối và báo *"Bạn không có quyền thực hiện thao tác này"*.
- **Không tìm thấy hồ sơ cư dân theo mã yêu cầu:** từ chối và báo *"Không tìm thấy cư dân"*.

---

## UC-31 · Sửa thông tin cư dân

**Ai dùng:** Manager · Customer (người đại diện)

**Luồng chính**

- **Đối với Manager:**
  - Mở chi tiết cư dân thuộc tòa nhà mình quản lý (thuộc hợp đồng đang ở trạng thái nháp `DRAFT` hoặc đang hiệu lực `ACTIVE`).
  - Được phép chỉnh sửa toàn bộ thông tin của mọi cư dân trong tòa, bao gồm cả họ tên và số CCCD của người đại diện cũng như của người ở cùng.
  - Khi Manager đổi số CCCD của người đại diện, hệ thống chỉ cập nhật số CCCD trong hồ sơ cư dân đại diện (đó là tên đăng nhập của khách hàng); trường `representativeCccd` trên bản ghi hợp đồng giữ nguyên số CCCD lúc ký và bị khóa sau khi hợp đồng chuyển sang `ACTIVE`.
- **Đối với Customer (người đại diện):**
  - Chỉ được chỉnh sửa thông tin của **người ở cùng** khi hợp đồng của phòng mình đang hiệu lực (`ACTIVE`).
  - Người đại diện được phép chỉnh sửa toàn bộ thông tin của người ở cùng trong phòng mình (họ tên, số CCCD, số điện thoại, ngày sinh, địa chỉ, quan hệ với đại diện, ảnh CCCD mặt trước và mặt sau).
  - Nếu người đại diện gọi đường dẫn sửa cư dân này cho chính hồ sơ của mình thì hệ thống chặn và hướng dẫn sang trang Hồ sơ cá nhân.
- Sau khi kiểm tra hợp lệ, hệ thống cập nhật dữ liệu trong một giao dịch (transaction) và ghi nhật ký `UPDATE_OCCUPANT` lưu lại đầy đủ giá trị trước và sau khi chỉnh sửa.

**Quy tắc kiểm tra dữ liệu**

- **Kiểm tra định dạng số CCCD:**
  - Số CCCD chỉ kiểm tra đủ 12 chữ số (theo `CCCD_REGEX` / `isCccd` dùng chung toàn hệ thống). Nếu sai định dạng thì báo *"Số CCCD phải gồm đúng 12 chữ số"*.
- **Kiểm tra trùng lặp trong phòng và toàn hệ thống:**
  - Số CCCD mới không được trùng với bất kỳ cư dân nào khác trong cùng hợp đồng (với hợp đồng `ACTIVE` đối chiếu trên danh sách cư dân `occupants`, gồm cả số CCCD hiện tại của cư dân đại diện).
  - Số CCCD mới không được trùng với cư dân đang ở (`STAYED`) tại một hợp đồng đang hiệu lực khác.
  - Nếu đổi số CCCD của người đại diện, số CCCD mới không được thuộc về một tài khoản khách hàng (Customer) khác đã có trong hệ thống.
  - Số điện thoại mới phải đúng định dạng 10 số bắt đầu bằng số 0 và không được trùng với bất kỳ Manager hay cư dân nào khác trong hệ thống (trừ các bản ghi lịch sử của chính cùng một người theo số CCCD).

**Các trường hợp bị chặn**

- **Người đại diện gọi API sửa cư dân cho chính hồ sơ của mình:** chặn và báo *"Thông tin của bạn vui lòng cập nhật ở trang Hồ sơ cá nhân"*.
- **Manager sửa cư dân của hợp đồng đã kết thúc (`ENDED`) hoặc đã hủy (`CANCELLED`):** chặn và báo *"Chỉ được chỉnh sửa thông tin cư dân thuộc hợp đồng nháp hoặc đang hiệu lực"*.
- **Customer sửa người ở cùng khi hợp đồng không ở trạng thái `ACTIVE`:** chặn và báo *"Chỉ được chỉnh sửa thông tin cư dân khi hợp đồng đang hiệu lực"*.
- **Manager thao tác ngoài tòa nhà mình quản lý hoặc Customer thao tác trên cư dân phòng khác:** chặn và báo *"Bạn không có quyền thực hiện thao tác này"*.
- **Số CCCD không đủ 12 chữ số:** chặn và báo *"Số CCCD phải gồm đúng 12 chữ số"*.
- **Số CCCD trùng người khác trong cùng hợp đồng:** chặn và báo *"CCCD trùng với cư dân khác trong phòng"*.
- **Số CCCD mới của người đại diện đã thuộc tài khoản khách hàng khác:** chặn và báo *"Số CCCD mới đã thuộc về tài khoản khách hàng khác trong hệ thống"*.
- **Số điện thoại đã tồn tại ở người khác:** chặn và báo *"Số điện thoại đã tồn tại trong hệ thống"*.

---

## UC-32 · Thêm người ở cùng

**Ai dùng:** Manager

**Điều kiện trước**

- Hợp đồng thuộc tòa nhà Manager đang quản lý và phải đang ở trạng thái hiệu lực (`ACTIVE`).
- Số người đang ở hiện tại của phòng (đếm toàn bộ cư dân `STAYED` của hợp đồng, bao gồm cả người đại diện) chưa đạt sức chứa tối đa của loại phòng.

**Luồng chính**

- Manager mở chi tiết hợp đồng đang hiệu lực và chọn chức năng "Thêm người ở cùng".
- Manager nhập thông tin người ở cùng mới: họ tên, số CCCD, số điện thoại, ngày sinh, ngày bắt đầu ở (mặc định là ngày hiện tại nếu không truyền), quan hệ với người đại diện, địa chỉ và ảnh CCCD 2 mặt (nếu có).
- Hệ thống kiểm tra:
  - Hợp đồng đang hiệu lực (`ACTIVE`) và thuộc tòa nhà của Manager.
  - Số lượng cư dân đang ở (`STAYED`) chưa chạm trần sức chứa (`capacity`) của loại phòng.
  - Số CCCD gồm đúng 12 chữ số (`CCCD_REGEX` / `isCccd`).
  - Số CCCD chưa tồn tại trong danh sách cư dân (`occupants`) của hợp đồng và không đang ở tại phòng khác.
  - Số điện thoại chưa thuộc về Manager hay người khác trong hệ thống.
- Hệ thống tạo bản ghi cư dân mới với vai trò người ở cùng (`isRepresentative: false`, không tạo tài khoản đăng nhập), trạng thái `STAYED`, giữ nguyên trạng thái hợp đồng và phòng, đồng thời ghi nhật ký `ADD_OCCUPANT`.

**Các trường hợp bị chặn**

- **Hợp đồng không ở trạng thái `ACTIVE` (đang là `DRAFT`, `ENDED` hoặc `CANCELLED`):** chặn và báo *"Chỉ thêm được người ở cùng khi hợp đồng đang hiệu lực"*.
- **Số người đang ở đã bằng hoặc vượt sức chứa loại phòng:** chặn và báo *"Phòng đã đạt sức chứa tối đa (X người)"* (với X là sức chứa của loại phòng).
- **Số CCCD không đủ 12 chữ số:** chặn và báo *"Số CCCD phải gồm đúng 12 chữ số"*.
- **Số CCCD đã có trong danh sách cư dân của hợp đồng:** chặn và báo *"CCCD đã tồn tại trong danh sách cư dân của phòng"*.
- **Số CCCD đang ở tại phòng khác:** chặn và báo *"Người mang số CCCD này hiện đang ở phòng khác"*.
- **Số điện thoại trùng với người khác trong hệ thống:** chặn và báo *"Số điện thoại đã tồn tại trong hệ thống"*.
- **Manager thao tác trên hợp đồng thuộc tòa nhà khác:** chặn và báo *"Bạn không có quyền thực hiện thao tác này"*.

---

## UC-33 · Rút tên người ở cùng

**Ai dùng:** Manager

**Ý nghĩa nghiệp vụ**

- Ghi nhận một người ở cùng chuyển ra khỏi phòng khi hợp đồng vẫn đang tiếp tục hiệu lực.
- Không xóa bản ghi cư dân khỏi cơ sở dữ liệu; chỉ chuyển trạng thái cư dân sang đã chuyển đi (`LEFT`) và lưu lại ngày chuyển ra để bảo toàn lịch sử cư trú.

**Luồng chính**

- Manager chọn một người ở cùng đang ở trong hợp đồng `ACTIVE` thuộc tòa nhà mình quản lý và bấm "Rút tên / Xóa khỏi phòng".
- Manager nhập ngày chuyển ra (mặc định là ngày hôm nay nếu không nhập, không được trước ngày bắt đầu vào ở của cư dân đó) và ghi chú (tùy chọn).
- Hệ thống chuyển trạng thái của cư dân đó sang `LEFT`, cập nhật `exitDate`, giữ nguyên hợp đồng, phòng và tài khoản của người đại diện, đồng thời ghi nhật ký `REMOVE_OCCUPANT` kèm ngày chuyển ra và ghi chú.

**Các trường hợp bị chặn**

- **Cư dân được chọn là người đại diện (`isRepresentative: true`):** chặn và báo *"Không thể xóa người đại diện theo luồng này — vui lòng dùng chấm dứt hợp đồng"*.
- **Cư dân đã ở trạng thái chuyển đi (`LEFT`):** chặn và báo *"Người này đã chuyển đi"*.
- **Hợp đồng không ở trạng thái đang hiệu lực (`ACTIVE`):** chặn và báo *"Chỉ rút tên được người ở cùng khi hợp đồng đang hiệu lực"*.
- **Ngày chuyển ra trước ngày bắt đầu ở (`joinDate`):** chặn và báo *"Ngày chuyển ra không được trước ngày bắt đầu ở"*.
- **Manager thao tác trên cư dân thuộc tòa nhà khác:** chặn và báo *"Bạn không có quyền thực hiện thao tác này"*.
