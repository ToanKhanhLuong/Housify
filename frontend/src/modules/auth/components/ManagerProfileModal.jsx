// UC-05: Manager điền lần đầu các trường còn trống (ngày sinh, địa chỉ, ảnh CCCD). Lưu xong các trường này khóa lại
import { useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import ImageUpload from '../../../components/ImageUpload';
import { toDateInput } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import authApi from '../auth.api';
import { validateManagerProfile } from '../auth.validate';

const ManagerProfileModal = ({ emptyFields, onHide, onSaved }) => {
  const [form, setForm] = useState({
    dateOfBirth: '',
    address: '',
    cccdFrontImage: '',
    cccdBackImage: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const shows = (field) => emptyFields.includes(field);
  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  // ảnh tải lên xong mới gọi về nên dùng prev để không ghi đè ô vừa nhập
  const handleImage = (field) => (publicId) => setForm((prev) => ({ ...prev, [field]: publicId }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateManagerProfile(form, emptyFields);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    // chỉ gửi trường vừa điền; trường còn để trống thì lần sau vẫn điền được
    const data = Object.fromEntries(
      emptyFields.filter((field) => form[field]).map((field) => [field, form[field]]),
    );

    setSubmitting(true);
    try {
      // BE trả "Cập nhật hồ sơ thành công" hoặc "Không có thông tin nào thay đổi"
      const response = await authApi.updateProfile(data);
      toast.success(response.message);
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
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
          <Alert variant="warning">
            Các thông tin dưới đây chỉ điền được một lần. Sau khi lưu, muốn sửa vui lòng liên hệ
            Admin.
          </Alert>
          <Row>
            {shows('dateOfBirth') && (
              <Col md={6}>
                <Input
                  label="Ngày sinh"
                  name="dateOfBirth"
                  type="date"
                  max={toDateInput(new Date())}
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  error={errors.dateOfBirth}
                />
              </Col>
            )}
            {shows('address') && (
              <Col md={6}>
                <Input
                  label="Địa chỉ"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  error={errors.address}
                />
              </Col>
            )}
            {shows('cccdFrontImage') && (
              <Col md={6}>
                <ImageUpload
                  label="Ảnh CCCD mặt trước"
                  kind="CCCD"
                  onChange={handleImage('cccdFrontImage')}
                  error={errors.cccdFrontImage}
                  disabled={submitting}
                />
              </Col>
            )}
            {shows('cccdBackImage') && (
              <Col md={6}>
                <ImageUpload
                  label="Ảnh CCCD mặt sau"
                  kind="CCCD"
                  onChange={handleImage('cccdBackImage')}
                  error={errors.cccdBackImage}
                  disabled={submitting}
                />
              </Col>
            )}
          </Row>
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

export default ManagerProfileModal;
