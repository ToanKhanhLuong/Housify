// UC-05: Customer (người đại diện) sửa hồ sơ mình (PUT /profile): email, SĐT, ngày sinh, địa chỉ, ảnh CCCD.
// Họ tên, số CCCD chỉ xem (Manager sửa ở UC-31)
import { useState } from 'react';
import { Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { BiInfoCircle } from 'react-icons/bi';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import ImageUpload from '../../../components/ImageUpload';
import { toDateInput } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import authApi from '../auth.api';
import { validateCustomerProfile } from '../auth.validate';

const CustomerProfileModal = ({ profile, onHide, onSaved }) => {
  const [form, setForm] = useState({
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    dateOfBirth: toDateInput(profile.dateOfBirth),
    address: profile.address ?? '',
    cccdFrontImage: '', // chỉ có giá trị khi chọn ảnh mới (publicId)
    cccdBackImage: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  // ảnh tải lên xong mới gọi về nên dùng prev để không ghi đè ô vừa nhập
  const handleImage = (field) => (publicId) => setForm((prev) => ({ ...prev, [field]: publicId }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateCustomerProfile(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    // họ tên, CCCD không gửi lên; ảnh chỉ gửi khi có ảnh mới; địa chỉ trống thì không gửi (BE không nhận chuỗi rỗng)
    const address = form.address.trim();
    const data = {
      phone: form.phone.trim(),
      email: form.email.trim(),
      dateOfBirth: form.dateOfBirth,
      ...(address && { address }),
      ...(form.cccdFrontImage && { cccdFrontImage: form.cccdFrontImage }),
      ...(form.cccdBackImage && { cccdBackImage: form.cccdBackImage }),
    };

    setSubmitting(true);
    try {
      // BE trả "Cập nhật hồ sơ thành công" hoặc "Không có thông tin nào thay đổi"
      const response = await authApi.updateProfile(data);
      toast.success(response.message);
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd email hoặc SĐT đã có người dùng
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static" size="lg">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <div>
            <Modal.Title className="h5">Chỉnh sửa hồ sơ</Modal.Title>
            <div className="small text-secondary">Tài khoản Khách thuê · Người đại diện phòng</div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="h6 fw-semibold mb-0">Thông tin cá nhân</h3>
            <span className="small text-secondary">
              <span className="text-danger">*</span> Thông tin bắt buộc
            </span>
          </div>
          <Row>
            <Col md={6}>
              <Input
                label="Họ tên"
                name="name"
                value={profile.name ?? ''}
                helpText="Liên hệ Manager để thay đổi"
                readOnly
                disabled
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Số CCCD"
                name="cccd"
                value={profile.cccd ?? ''}
                helpText="Liên hệ Manager để thay đổi"
                readOnly
                disabled
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Số điện thoại"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                error={errors.phone}
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Ngày sinh"
                name="dateOfBirth"
                type="date"
                max={toDateInput(new Date())}
                value={form.dateOfBirth}
                onChange={handleChange}
                error={errors.dateOfBirth}
                helpText="Không chọn ngày trong tương lai."
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Địa chỉ"
                name="address"
                value={form.address}
                onChange={handleChange}
                error={errors.address}
              />
            </Col>
          </Row>

          <hr className="my-3" />

          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="h6 fw-semibold mb-0">Hình ảnh CCCD</h3>
            <span className="small text-secondary">JPG, PNG · Tối đa 5 MB / ảnh</span>
          </div>
          <div className="small text-secondary mb-3">
            Tải ảnh mới để thay thế. Đảm bảo ảnh rõ nét và đầy đủ bốn góc.
          </div>
          <Row className="g-3">
            <Col md={6}>
              <Card>
                <Card.Body className="p-3">
                  <div className="small fw-semibold mb-2">CCCD mặt trước</div>
                  <ImageUpload
                    kind="CCCD"
                    previewUrl={profile.cccdFrontUrl}
                    onChange={handleImage('cccdFrontImage')}
                    error={errors.cccdFrontImage}
                    disabled={submitting}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Body className="p-3">
                  <div className="small fw-semibold mb-2">CCCD mặt sau</div>
                  <ImageUpload
                    kind="CCCD"
                    previewUrl={profile.cccdBackUrl}
                    onChange={handleImage('cccdBackImage')}
                    error={errors.cccdBackImage}
                    disabled={submitting}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        {/* chân modal theo quy định nhóm: nút chính → Hủy bên trái */}
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Lưu thay đổi
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
          <span className="ms-auto small text-secondary flex items-center gap-1">
            <BiInfoCircle />
            Thay đổi chỉ được cập nhật sau khi lưu.
          </span>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CustomerProfileModal;
