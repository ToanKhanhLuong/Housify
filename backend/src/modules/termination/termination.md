# Module termination

> Chấm dứt hợp đồng trước hạn: **hai bên thỏa thuận (UC-28)** và **đơn phương (UC-29)**.
> Hợp đồng hết hạn tự nhiên (UC-45) nằm ở module `contract`.

**Người làm:** BE An · FE Hưng · Iter 3

**Quyền**

- **Manager:** lập đơn, hủy đơn khi còn chờ, xem đơn của tòa mình.
- **Customer (người đại diện):** xem và **xác nhận** đơn hai bên thỏa thuận.
- **Admin:** **duyệt hoặc từ chối** đơn đơn phương.

---

## Hai loại đơn

|                                       | Hai bên thỏa thuận (UC-28)                              | Đơn phương (UC-29)                     |
| ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| **Khi nào**                    | Khách chuyển ra, hai bên đã thống nhất ngoài đời | Khách vi phạm nghiêm trọng nội quy    |
| **Ai lập**                     | Manager                                                    | Manager                                    |
| **Ai xử lý**                  | **Khách** xác nhận                                | **Admin** duyệt hoặc từ chối     |
| **Không ai xử lý thì**      | Hết 7 ngày **tự xác nhận**                      | Đơn nằm chờ Admin                      |
| **Tài khoản khách sau đó** | **Ngưng hoạt động**, thuê lại được          | **Bị khóa**, không cho thuê lại |
| **Tiền cọc**                  | **Mất cọc**                                        | **Mất cọc**                        |

## Bốn trạng thái của đơn

| Trạng thái              | Nghĩa là                                                                 |
| ------------------------- | -------------------------------------------------------------------------- |
| **Chờ xử lý**    | Đã gửi, chờ khách xác nhận hoặc Admin duyệt                       |
| **Đã xác nhận** | Khách đã xác nhận, hệ thống tự xác nhận, hoặc Admin đã duyệt |
| **Bị từ chối**   | Admin từ chối, **chỉ có ở đơn phương**                      |
| **Đã hủy**       | Manager hủy khi đơn còn Chờ xử lý                                   |

**Quy tắc chung**

- Mỗi hợp đồng chỉ có **tối đa một** đơn Chờ xử lý.
- Gửi xong thì **nội dung đơn bị khóa**. Manager không sửa được, chỉ hủy (khi còn chờ) rồi lập đơn mới.
- Hợp đồng **vẫn Đang hiệu lực** tới đúng ngày hiệu lực của đơn.
- **Mọi đơn đều được lưu**, dù kết quả là gì.
- Có bất kỳ đơn **Đã xác nhận** nào là **mất cọc**.

---

## UC-28 · Chấm dứt hợp đồng hai bên thỏa thuận

**Ai dùng:** Manager · Customer · Hệ thống

**Điều kiện trước**

- Hợp đồng **Đang hiệu lực**.
- Hợp đồng chưa có đơn chấm dứt nào đang chờ.

**Luồng chính**

1. Manager chọn hợp đồng, bấm "Tạo đơn chấm dứt".
2. Form: **lý do** (bắt buộc), **ngày chấm dứt hiệu lực** (bắt buộc), **ghi chú bàn giao** (tùy chọn).
3. Bấm "Gửi đơn" → đơn **Chờ xử lý**, hạn tự xác nhận là **lúc gửi + 7 ngày**. Nội dung đơn bị khóa. Người đại diện nhận **thông báo và email**: *"Manager đã gửi đơn chấm dứt hợp đồng phòng [X]"*.
4. Khách đăng nhập, bấm vào thông báo → trang chi tiết đơn **chỉ xem**: thông tin hợp đồng, lý do, ngày hiệu lực, ghi chú bàn giao. Có ô **"Tôi đã đọc và đồng ý nội dung đơn chấm dứt"** và nút **"Xác nhận"**, nút bị mờ cho tới khi tích ô.
5. Khách tích ô, bấm "Xác nhận" → hộp hỏi lần cuối: *"Bạn chắc chắn xác nhận chấm dứt hợp đồng phòng [X] từ ngày [Y]? Thao tác này không thể hoàn tác."*
6. Khách bấm "Đồng ý" → đơn **Đã xác nhận**. Lưu **người xác nhận, thời điểm, địa chỉ IP, mã xác thực**. Gửi email xác nhận cho khách, thông báo cho khách và Manager.
7. Manager mở đơn → thấy khung **"✔ Đã xác nhận điện tử"**: ký bởi [họ tên], lúc [ngày giờ], mã xác thực [rút gọn]. Hiện **"Hợp lệ"** khi tính lại mã xác thực khớp với mã đã lưu.
8. **Tới ngày hiệu lực**, hệ thống làm cùng một lần: hợp đồng → **Đã kết thúc**, phòng → **Trống**, cư dân đang ở → **đã chuyển đi** với ngày chuyển ra là ngày hiệu lực.
9. **24 giờ sau ngày hiệu lực:** tài khoản người đại diện → **ngưng hoạt động**.

**Các trường hợp**

- **Khách bấm "Hủy" trên hộp hỏi lần cuối, hoặc rời trang:** không thay đổi gì, đơn vẫn chờ, khách quay lại xác nhận lúc nào cũng được trong hạn.
- **Khách không xác nhận:**
  - Hệ thống **nhắc vào ngày 1, 3 và 6** (thông báo và email), lưu lại từng lần nhắc.
  - Hết 7 ngày → đơn **tự Đã xác nhận**, đánh dấu tự động, **không có mã xác thực**. Gửi email và thông báo như bước 6.
  - Khung trên đơn hiện *"Tự động xác nhận sau 7 ngày — đã nhắc [n] lần"*.
- **Manager hủy đơn khi còn chờ** (gửi nhầm, sai ngày…): nhập lý do hủy → đơn **Đã hủy**, hợp đồng vẫn Đang hiệu lực, thông báo cho khách. Muốn đổi nội dung thì lập đơn mới.
- **Đơn được xác nhận khi ngày hiệu lực đã tới hoặc đã qua:** thực hiện bước 8 **ngay**.
- **Chỉ một người ở cùng chuyển ra:** không dùng UC này, Manager xóa người đó ở UC-33.
- **Hợp đồng không Đang hiệu lực:** từ chối lập đơn.
- **Hợp đồng đã có đơn đang chờ:** từ chối, xử lý hoặc hủy đơn cũ trước.
- **Gửi email lỗi:** đơn vẫn lưu hoặc xác nhận, thông báo trong ứng dụng vẫn có, ghi lỗi, cho gửi lại.
- **Lỗi khi kết thúc ở bước 8:** quay lại như cũ, lần quét sau làm lại.

**Quy tắc**

- Chấm dứt phải có **xác nhận của khách**, chủ động hoặc tự động sau 7 ngày. **Manager không tự kết thúc** được hợp đồng.
- **Mã xác thực** = mã hóa của nội dung đơn + người xác nhận + thời điểm xác nhận. Đây là **xác nhận điện tử mô phỏng**: giao diện ghi **"Đã xác nhận điện tử"**, không ghi "Chữ ký số".
- Mỗi lần nhắc đều được lưu làm **bằng chứng đã thông báo**.

---

## UC-29 · Đơn phương chấm dứt hợp đồng

**Ai dùng:** Manager · Admin · Hệ thống

**Điều kiện trước**

- Hợp đồng **Đang hiệu lực**.
- Hợp đồng chưa có đơn chấm dứt nào đang chờ.

**Luồng chính**

1. Manager bấm "Đơn phương chấm dứt".
2. Form: **lý do vi phạm** (bắt buộc), **ngày hiệu lực đề xuất** (bắt buộc).
3. Bấm "Gửi Admin duyệt" → đơn **Chờ xử lý**, hợp đồng vẫn Đang hiệu lực. **Admin nhận thông báo** có đơn mới cần duyệt.
4. Admin xem đơn, bấm **"Phê duyệt"** → đơn **Đã xác nhận**, lưu Admin duyệt và thời điểm.
   - Người đại diện nhận **thông báo và email**: lý do, ngày hiệu lực.
   - Manager nhận thông báo.
5. **Tới ngày hiệu lực:** hợp đồng → **Đã kết thúc**, phòng → **Trống**, cư dân → **đã chuyển đi**.
6. **24 giờ sau:** tài khoản người đại diện → **bị khóa**.

**Các trường hợp**

- **Admin từ chối:** nhập lý do → đơn **Bị từ chối**, hợp đồng vẫn Đang hiệu lực, Manager nhận thông báo kèm lý do.
- **Manager hủy đơn trước khi Admin duyệt:** đơn **Đã hủy**, hợp đồng vẫn Đang hiệu lực.
- **Không nhập lý do vi phạm:** không cho gửi.
- **Hợp đồng không Đang hiệu lực:** từ chối.
- **Hợp đồng đã có đơn đang chờ:** từ chối, xử lý đơn hiện tại trước.

**Quy tắc**

- Đơn phương **phải được Admin duyệt** mới có hiệu lực, Manager không tự quyết. Đơn chỉ cần lý do bằng văn bản.
- **Khách không cần xác nhận**, nhưng **luôn được thông báo** (trong ứng dụng và email) kèm lý do và ngày hiệu lực.
- Tài khoản bị khóa thì **không được thuê lại** (UC-24).

---

## Việc chạy tự động

| Việc                          | Khi nào    | Làm gì                                                                                                                   |
| ------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Nhắc và tự xác nhận       | Hằng ngày | Đơn hai bên thỏa thuận chưa xác nhận: nhắc ngày 1, 3, 6; đủ 7 ngày thì tự xác nhận                        |
| Kết thúc theo đơn          | Hằng ngày | Đơn đã xác nhận tới ngày hiệu lực → bước 8 của UC-28, bước 5 của UC-29                                    |
| Đổi trạng thái tài khoản | Hằng ngày | Đủ 24 giờ sau khi kết thúc: hai bên thỏa thuận → **ngưng hoạt động**; đơn phương → **khóa** |

Khi test, dùng chức năng **chạy việc tự động ngay** trong module `dev` để khỏi phải chờ nhiều ngày.
