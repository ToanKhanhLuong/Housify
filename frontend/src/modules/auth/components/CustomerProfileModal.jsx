// UC-31: người đại diện sửa hồ sơ mình (PUT /profile; email lưu ở tài khoản). CCCD chỉ xem; đổi ảnh CCCD phải tích đã đối chiếu thẻ gốc
import { useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import ImageUpload from '../../../components/ImageUpload';
import { toDateInput } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import authApi from '../auth.api';
import { validateCustomerProfile } from '../auth.validate';

const CustomerProfileModal = ({ profile, onHide, onSaved }) => {
  const [form, setForm] = useState({
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    dateOfBirth: toDateInput(profile.dateOfBirth),
    address: profile.address ?? '',
    cccdFrontImage: '', // chỉ có giá trị khi chọn ảnh mới (publicId)
    cccdBackImage: '',
    verified: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const imageChanged = Boolean(form.cccdFrontImage || form.cccdBackImage);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };
  // ảnh tải lên xong mới gọi về nên dùng prev để không ghi đè ô vừa nhập
  const handleImage = (field) => (publicId) => setForm((prev) => ({ ...prev, [field]: publicId }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateCustomerProfile(form, imageChanged);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    // CCCD không gửi lên; ảnh chỉ gửi khi có ảnh mới; địa chỉ trống thì không gửi (BE không nhận chuỗi rỗng)
    const address = form.address.trim();
    const data = {
      name: form.name.trim(),
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
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô (vd SĐT, email trùng)
      if (!error.errors) toast.error(error.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static" size="lg">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">Cập nhật hồ sơ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Input
                label="Họ tên"
                name="name"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Số CCCD"
                name="cccd"
                value={profile.cccd ?? ''}
                helpText="Số CCCD không sửa được"
                readOnly
                disabled
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
                label="Địa chỉ"
                name="address"
                value={form.address}
                onChange={handleChange}
                error={errors.address}
              />
            </Col>
            <Col md={6}>
              <ImageUpload
                label="Ảnh CCCD mặt trước"
                kind="CCCD"
                previewUrl={profile.cccdFrontUrl}
                onChange={handleImage('cccdFrontImage')}
                error={errors.cccdFrontImage}
                disabled={submitting}
              />
            </Col>
            <Col md={6}>
              <ImageUpload
                label="Ảnh CCCD mặt sau"
                kind="CCCD"
                previewUrl={profile.cccdBackUrl}
                onChange={handleImage('cccdBackImage')}
                error={errors.cccdBackImage}
                disabled={submitting}
              />
            </Col>
          </Row>

          {/* UC-31: tải ảnh CCCD mới thì bắt buộc tích đã đối chiếu với thẻ gốc */}
          {imageChanged && (
            <Form.Check
              id="verified"
              name="verified"
              label="Đã đối chiếu với thẻ gốc"
              checked={form.verified}
              onChange={handleChange}
              isInvalid={Boolean(errors.verified)}
              feedback={errors.verified}
              feedbackType="invalid"
            />
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Lưu
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CustomerProfileModal;
