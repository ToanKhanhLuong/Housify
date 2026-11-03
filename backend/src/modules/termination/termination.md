# Module termination

> Quản lý đơn chấm dứt hợp đồng trước hạn gồm chấm dứt theo thỏa thuận hai bên (UC-28) và đơn phương chấm dứt hợp đồng (UC-29). Hợp đồng hết hạn tự nhiên và hoàn cọc (UC-45) nằm ở module `contract`.

**Người làm:** BE An · FE Hưng · Iter 2

**Quyền**

- **Manager:** tạo đơn chấm dứt cho hợp đồng đang hiệu lực thuộc tòa nhà mình quản lý, hủy đơn khi đơn còn đang chờ xử lý, xem danh sách và chi tiết đơn của tòa mình.
- **Customer (người đại diện):** xem danh sách, chi tiết đơn chấm dứt thuộc hợp đồng của mình và xác nhận điện tử đối với đơn chấm dứt hai bên thỏa thuận.
- **Admin:** xem danh sách đơn chấm dứt (đặc biệt là danh sách đơn đơn phương đang chờ duyệt), phê duyệt hoặc từ chối đơn chấm dứt đơn phương.

---

## Hai loại đơn và bốn trạng thái

### Hai loại đơn chấm dứt

- **Chấm dứt hai bên thỏa thuận (UC-28):** dùng khi khách thuê muốn trả phòng sớm và hai bên đã thống nhất. Do Manager lập đơn, người đại diện xác nhận điện tử. Nếu sau 7 ngày kể từ ngày gửi mà khách không xác nhận thì hệ thống tự động xác nhận. Sau 24 giờ kể từ khi hợp đồng kết thúc, tài khoản người đại diện chuyển sang ngưng hoạt động (vẫn có thể thuê lại về sau). Hợp đồng chấm dứt trước hạn không được hoàn cọc.
- **Đơn phương chấm dứt (UC-29):** dùng khi khách thuê vi phạm nghiêm trọng nội quy nhà trọ. Do Manager lập đơn kèm lý do vi phạm, gửi Admin xem xét phê duyệt hoặc từ chối. Sau 24 giờ kể từ khi hợp đồng kết thúc do đơn phương, tài khoản người đại diện bị khóa vĩnh viễn (không được tạo hợp đồng mới). Hợp đồng chấm dứt trước hạn không được hoàn cọc.

### Bốn trạng thái của đơn

- **Chờ xử lý:** đơn vừa được Manager gửi, đang chờ người đại diện xác nhận (với đơn thỏa thuận) hoặc chờ Admin phê duyệt (với đơn đơn phương).
- **Đã xác nhận:** người đại diện đã xác nhận điện tử, hệ thống tự động xác nhận sau 7 ngày, hoặc Admin đã phê duyệt đơn đơn phương.
- **Bị từ chối:** Admin từ chối đơn đơn phương kèm lý do. Trạng thái này chỉ có ở đơn đơn phương.
- **Đã hủy:** Manager hủy đơn khi đơn còn ở trạng thái Chờ xử lý, hoặc hệ thống tự hủy đơn đang chờ khi hợp đồng hết hạn tự nhiên.

### Quy tắc chung

- Mỗi hợp đồng tại một thời điểm chỉ có tối đa một đơn chấm dứt đang xử lý (đang Chờ xử lý hoặc Đã xác nhận nhưng chưa tới ngày hiệu lực).
- Ngay sau khi gửi, nội dung đơn chấm dứt bị khóa. Manager không chỉnh sửa được nội dung đơn; nếu nhập sai thì phải hủy đơn đang chờ rồi tạo đơn mới.
- Trong thời gian có đơn chấm dứt, hợp đồng vẫn giữ trạng thái Đang hiệu lực cho tới đúng ngày hiệu lực của đơn.
- Mọi đơn chấm dứt đều được lưu lại trong cơ sở dữ liệu để làm lịch sử đối chiếu, không bao giờ xóa.
- Hợp đồng có bất kỳ đơn chấm dứt nào ở trạng thái Đã xác nhận đều được tính là chấm dứt trước hạn và không được hoàn tiền đặt cọc.

---

## UC-28 · Chấm dứt hợp đồng hai bên thỏa thuận

**Ai dùng:** Manager · Customer (người đại diện) · Hệ thống

**Luồng chính**

- Manager chọn hợp đồng đang hiệu lực thuộc tòa nhà mình quản lý để tạo đơn chấm dứt hai bên thỏa thuận.
- Manager nhập lý do chấm dứt (bắt buộc), ngày chấm dứt hiệu lực (bắt buộc) và ghi chú bàn giao (tùy chọn).
- Khi gửi đơn, hệ thống lưu đơn ở trạng thái Chờ xử lý và khóa nội dung đơn. Hợp đồng vẫn giữ trạng thái Đang hiệu lực. Hệ thống gửi thông báo trong ứng dụng và email cho người đại diện.
- Người đại diện đăng nhập, mở chi tiết đơn chấm dứt để xem thông tin hợp đồng, lý do, ngày hiệu lực, ghi chú bàn giao, tích chọn đồng ý nội dung đơn và bấm xác nhận.
- Hệ thống chuyển đơn sang trạng thái Đã xác nhận, lưu người xác nhận, thời điểm xác nhận, địa chỉ IP và mã xác thực (băm từ nội dung đơn, người xác nhận và thời điểm xác nhận). Hệ thống gửi thông báo trong ứng dụng cho cả người đại diện và Manager, đồng thời gửi email xác nhận cho người đại diện.
- Khi Manager hoặc người đại diện xem chi tiết đơn đã xác nhận, hệ thống hiển thị thông tin **Đã xác nhận điện tử** gồm họ tên người ký, thời điểm ký, mã xác thực rút gọn và trạng thái **Hợp lệ** khi tính lại mã xác thực khớp với mã đã lưu.
- Khi tới ngày hiệu lực của đơn, hệ thống thực hiện trong cùng một giao dịch: chuyển hợp đồng sang Đã kết thúc, chuyển phòng sang Trống và chuyển toàn bộ cư dân đang ở sang đã chuyển đi với ngày chuyển ra bằng ngày hiệu lực của đơn.
- Sau 24 giờ kể từ khi hợp đồng kết thúc (nếu khách không còn hợp đồng đang hiệu lực nào khác), hệ thống chuyển tài khoản người đại diện sang ngưng hoạt động và ghi nhật ký.

**Các trường hợp rẽ nhánh và chặn**

- **Người đại diện xác nhận khi ngày hiệu lực đã tới hoặc đã qua:** ngay trong giao dịch xác nhận đơn, hệ thống kết thúc hợp đồng luôn (hợp đồng sang Đã kết thúc, phòng sang Trống, cư dân đang ở sang đã chuyển đi).
- **Người đại diện không xác nhận đơn:**
  - Hệ thống tự động gửi thông báo nhắc nhở và email vào các mốc ngày thứ 1, ngày thứ 3 và ngày thứ 6 tính từ ngày tạo đơn (mỗi mốc chỉ nhắc tối đa một lần và lưu lại thông báo làm bằng chứng).
  - Khi đủ từ 7 ngày trở lên kể từ ngày tạo đơn mà vẫn chưa xác nhận, hệ thống tự động chuyển đơn sang Đã xác nhận, đánh dấu là tự động xác nhận và không sinh mã xác thực điện tử. Nếu ngày hiệu lực đã tới hoặc đã qua thì kết thúc hợp đồng ngay. Hệ thống gửi thông báo cho người đại diện và Manager, gửi email cho người đại diện.
  - Khi xem chi tiết đơn tự động xác nhận, hệ thống hiển thị dòng chữ *"Tự động xác nhận sau 7 ngày — đã nhắc [n] lần"*.
- **Manager hủy đơn khi đơn còn Chờ xử lý:** Manager bắt buộc nhập lý do hủy; hệ thống chuyển đơn sang Đã hủy, lưu người hủy và lý do hủy, giữ nguyên hợp đồng Đang hiệu lực và gửi thông báo cho người đại diện.
- **Hợp đồng không ở trạng thái Đang hiệu lực:** từ chối, báo "Chỉ có thể tạo đơn chấm dứt cho hợp đồng đang hiệu lực".
- **Hợp đồng đã có đơn đang Chờ xử lý hoặc đơn Đã xác nhận chưa tới ngày hiệu lực:** từ chối, báo "Hợp đồng đã có đơn chấm dứt đang xử lý".
- **Người đại diện xác nhận nhưng không tích chọn đồng ý:** từ chối, báo "Vui lòng tích chọn đồng ý nội dung đơn chấm dứt hợp đồng".
- **Đơn không còn ở trạng thái Chờ xử lý khi bấm xác nhận hoặc hủy:** từ chối thao tác.
- **Manager hoặc khách thao tác trên hợp đồng ngoài phạm vi của mình:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".
- **Gửi email thất bại:** thao tác lưu hoặc xác nhận đơn và thông báo trong ứng dụng vẫn thành công, hệ thống trả kèm cảnh báo gửi email thất bại.

---

## UC-29 · Đơn phương chấm dứt hợp đồng

**Ai dùng:** Manager · Admin · Hệ thống

**Luồng chính**

- Khi khách thuê vi phạm nghiêm trọng nội quy, Manager tạo đơn chấm dứt đơn phương trên hợp đồng đang hiệu lực thuộc tòa mình quản lý, nhập lý do vi phạm (bắt buộc), ngày hiệu lực đề xuất (bắt buộc) và ghi chú bàn giao (tùy chọn).
- Hệ thống lưu đơn ở trạng thái Chờ xử lý, giữ hợp đồng ở trạng thái Đang hiệu lực và gửi thông báo trong ứng dụng cho Admin.
- Admin xem danh sách các đơn chấm dứt đơn phương đang chờ xử lý, mở chi tiết đơn và bấm phê duyệt.
- Hệ thống chuyển đơn sang Đã xác nhận, lưu Admin phê duyệt và thời điểm phê duyệt. Nếu ngày hiệu lực đã tới hoặc đã qua thì kết thúc hợp đồng ngay trong cùng giao dịch. Hệ thống gửi thông báo trong ứng dụng cho người đại diện (kèm lý do vi phạm và ngày hiệu lực) và cho Manager, đồng thời gửi email thông báo cho người đại diện.
- Khi tới ngày hiệu lực của đơn đã duyệt, hệ thống thực hiện trong cùng một giao dịch: chuyển hợp đồng sang Đã kết thúc, chuyển phòng sang Trống và chuyển toàn bộ cư dân đang ở sang đã chuyển đi.
- Sau 24 giờ kể từ khi hợp đồng kết thúc do đơn phương (nếu khách không còn hợp đồng đang hiệu lực nào khác), hệ thống chuyển tài khoản người đại diện sang trạng thái bị khóa và ghi nhật ký khóa tài khoản kèm lý do vi phạm.

**Các trường hợp rẽ nhánh và chặn**

- **Admin từ chối đơn đơn phương:** Admin bắt buộc nhập lý do từ chối; hệ thống chuyển đơn sang Bị từ chối, lưu người xử lý, thời điểm và lý do từ chối, giữ nguyên hợp đồng Đang hiệu lực và gửi thông báo kèm lý do cho Manager.
- **Manager hủy đơn trước khi Admin duyệt:** khi đơn còn ở trạng thái Chờ xử lý, Manager nhập lý do hủy để chuyển đơn sang Đã hủy, hợp đồng vẫn giữ nguyên Đang hiệu lực.
- **Hợp đồng đã có đơn đang Chờ xử lý hoặc đơn Đã xác nhận chưa tới ngày hiệu lực:** từ chối, báo "Hợp đồng đã có đơn chấm dứt đang xử lý".
- **Thiếu lý do vi phạm, thiếu lý do từ chối hoặc thiếu lý do hủy:** từ chối và yêu cầu nhập đầy đủ lý do.
- **Admin gọi phê duyệt hoặc từ chối trên đơn thỏa thuận hai bên:** từ chối, báo chỉ áp dụng cho đơn chấm dứt đơn phương.
- **Manager thao tác trên hợp đồng không thuộc tòa nhà mình quản lý:** từ chối, báo "Bạn không có quyền thực hiện thao tác này".

---

## Các công việc tự động liên quan

- **Nhắc xác nhận và tự động xác nhận đơn thỏa thuận:** quét các đơn hai bên thỏa thuận đang Chờ xử lý để gửi thông báo và email nhắc nhở vào các mốc ngày 1, 3, 6 tính từ ngày tạo đơn (mỗi mốc tối đa một lần), và tự động chuyển sang Đã xác nhận khi đã đủ từ 7 ngày trở lên.
- **Kết thúc hợp đồng khi đơn chấm dứt tới ngày hiệu lực:** quét các đơn Đã xác nhận có ngày hiệu lực đã tới hoặc đã qua mà hợp đồng vẫn Đang hiệu lực để chuyển hợp đồng sang Đã kết thúc, phòng sang Trống và cư dân đang ở sang đã chuyển đi trong cùng một giao dịch.
- **Cập nhật trạng thái tài khoản sau 24 giờ kể từ khi kết thúc hợp đồng:** chuyển tài khoản người đại diện sang ngưng hoạt động (nếu kết thúc do thỏa thuận hoặc hết hạn) hoặc khóa tài khoản (nếu kết thúc do đơn phương) khi khách không còn hợp đồng đang hiệu lực nào khác.
