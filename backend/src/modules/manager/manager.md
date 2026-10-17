# Module manager

Module lo vòng đời tài khoản Manager: Admin tạo tài khoản, xem và sửa thông tin, khóa hoặc mở khóa, và phân công Manager phụ trách tòa nhà. Tương ứng UC-08 (phần Admin tạo và gửi link), UC-09, UC-10, UC-11. Phần Manager bấm link tự đặt mật khẩu nằm ở module activation.

Chỉ Admin dùng được module này; Manager và Customer không truy cập được chức năng nào ở đây.

## Tạo tài khoản Manager (UC-08)

Admin điền họ tên, email, số điện thoại, cả ba đều bắt buộc. Hệ thống kiểm tra email chưa ai dùng và số điện thoại chưa trùng Manager khác, trùng thì từ chối và báo rõ trường nào trùng.

Tài khoản tạo ra ở trạng thái Chưa kích hoạt, chưa có mật khẩu, chưa phụ trách tòa nào. Admin không đặt mật khẩu cho Manager và cũng không biết mật khẩu của họ. Hệ thống sinh một link kích hoạt riêng, hiệu lực 24 giờ, dùng được một lần, rồi tự gửi email cho Manager. Email chỉ có tên hệ thống, email đăng nhập và nút kích hoạt, không chứa mật khẩu.

Email gửi thất bại thì tài khoản vẫn được tạo và vẫn Chưa kích hoạt, hệ thống báo Admin biết để vào danh sách gửi lại. Admin bấm Hủy giữa chừng thì không tạo gì cả.

Manager đã kích hoạt mà chưa được phân công tòa thì chỉ vào được hồ sơ cá nhân, đổi mật khẩu, thông báo và đăng xuất, những mục còn lại hiện thông báo chưa được cấp quyền quản lý tòa nhà.

## Xem danh sách và quản lý (UC-09)

Danh sách hiện họ tên, email, số điện thoại, trạng thái (Chưa kích hoạt, Active, Locked) và tòa đang phụ trách. Admin lọc theo trạng thái hoặc tìm theo tên. Chưa có Manager nào thì hiện dòng báo trống.

Mở hồ sơ một Manager, Admin thấy thao tác tùy theo trạng thái. Tài khoản đã kích hoạt thì sửa được thông tin, khóa hoặc mở khóa, phân công tòa. Tài khoản chưa kích hoạt thì gửi lại link, xóa tài khoản, phân công tòa, nhưng không sửa được thông tin.

Gửi lại link kích hoạt chỉ áp dụng cho tài khoản chưa kích hoạt. Link cũ bị vô hiệu ngay, link mới hiệu lực 24 giờ, và thao tác được ghi lại. Gửi email lỗi thì báo Admin thử lại sau.

Sửa thông tin chỉ áp dụng cho tài khoản đã kích hoạt. Admin sửa được họ tên, email, số điện thoại, địa chỉ, ngày sinh và ảnh CCCD hai mặt. Email hoặc số điện thoại mới trùng người khác thì từ chối. Ảnh CCCD mờ hoặc sai định dạng thì bắt tải lại, chưa đạt thì không cho lưu. Mọi thay đổi đều được ghi lại kèm người sửa và thời điểm.

Tài khoản chưa kích hoạt mà sai thông tin thì không sửa, Admin xóa đi rồi tạo lại. Xóa là xóa hẳn, coi như chưa từng tạo, link đã gửi cũng không còn dùng được, người nhận bấm vào sẽ thấy báo link không tồn tại. Chỉ tài khoản chưa kích hoạt mới xóa được.

## Khóa và mở khóa (UC-10)

Admin khóa Manager khi cần ngừng quyền truy cập, chẳng hạn nghỉ việc, vi phạm hoặc thay người. Khóa bắt buộc phải nhập lý do, không nhập thì không cho xác nhận. Lý do được ghi lại cùng người khóa và thời điểm.

Nếu Manager đang phụ trách tòa còn hợp đồng đang hoạt động, hệ thống cảnh báo tòa đó đang có khách thuê và nhắc phân công người khác, nhưng vẫn cho khóa. Khóa xong, Manager không đăng nhập được nữa và phiên đang mở bị hủy ngay. Dữ liệu phòng, hợp đồng và sự cố của tòa giữ nguyên, không bị ảnh hưởng, chỉ là cần Admin phân công người khác tiếp quản. Manager nhận email báo tài khoản bị khóa.

Mở khóa đưa tài khoản về Active, Manager đăng nhập lại được và cũng nhận email báo. Admin hủy giữa chừng thì không có gì thay đổi.

## Phân công tòa nhà (UC-11)

Mỗi tòa chỉ có một Manager phụ trách tại một thời điểm, và mỗi Manager cũng chỉ phụ trách một tòa. Danh sách để Admin chọn vì vậy chỉ hiện những Manager đang Active hoặc Chưa kích hoạt mà chưa phụ trách tòa nào. Manager đang bị khóa không nằm trong danh sách, cố tình gán vẫn bị từ chối.

Admin chọn tòa, chọn Manager, hệ thống hỏi xác nhận rồi gán. Manager được phân công nhận thông báo trong ứng dụng và email, thao tác được ghi lại.

Nếu tòa đã có Manager cũ, hệ thống cảnh báo và hỏi Admin có thay không. Admin đồng ý thì gỡ người cũ và gán người mới cùng lúc, thành công cả hai hoặc không thay đổi gì, và cả hai Manager đều nhận thông báo lẫn email. Admin cũng có thể chỉ gỡ Manager khỏi tòa mà không gán ai mới, khi đó tòa về trạng thái chưa có người phụ trách, hệ thống cảnh báo điều này và người bị gỡ nhận thông báo.

Email thông báo gửi lỗi không làm hỏng việc phân công, phân công vẫn thành công và thông báo trong ứng dụng vẫn có, chỉ cảnh báo thêm là gửi mail thất bại.

## Chỗ Use Case chưa nói rõ

Xóa Manager chưa kích hoạt mà người đó đang được phân công tòa thì tòa xử lý thế nào, UC-09 không đề cập. Hướng hợp lý là gỡ luôn khỏi tòa, đúng tinh thần coi như chưa từng tạo, nhưng cần nhóm chốt.

Cơ sở dữ liệu có lưu số CCCD của Manager, nhưng form ở UC-05 và UC-09 chỉ có ảnh CCCD, không có ô nhập số. Cần chốt có nhập số CCCD hay không.

BR-010 nói số điện thoại duy nhất trong hệ thống, hiện mới hiểu là duy nhất trong phạm vi Manager. Cần chốt có xét cả số điện thoại của cư dân không.
