// UC-09: Admin sửa thông tin Manager đã kích hoạt (Đang hoạt động / Bị khóa): họ tên, email, SĐT, ngày sinh, địa chỉ, ảnh CCCD
import { useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import ImageUpload from '../../../components/ImageUpload';
import { toDateInput } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import managerApi from '../manager.api';
import { validateManagerEdit } from '../manager.validate';

const ManagerEditModal = ({ manager, onHide, onSaved }) => {
  const [form, setForm] = useState({
    name: manager.name ?? '',
    email: manager.email ?? '',
    phone: manager.phone ?? '',
    dateOfBirth: toDateInput(manager.dateOfBirth),
    address: manager.address ?? '',
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
    const clientErrors = validateManagerEdit(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    // ảnh chỉ gửi khi có ảnh mới; ngày sinh để trống thì không gửi
    const data = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
      ...(form.cccdFrontImage && { cccdFrontImage: form.cccdFrontImage }),
      ...(form.cccdBackImage && { cccdBackImage: form.cccdBackImage }),
    };

    setSubmitting(true);
    try {
      await managerApi.update(manager._id, data);
      toast.success('Cập nhật thông tin Manager thành công');
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd email hoặc SĐT đã thuộc người khác
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static" size="lg">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">Sửa thông tin Manager</Modal.Title>
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
              />
            </Col>
            <Col md={12}>
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
                previewUrl={manager.cccdFrontUrl}
                onChange={handleImage('cccdFrontImage')}
                error={errors.cccdFrontImage}
                disabled={submitting}
              />
            </Col>
            <Col md={6}>
              <ImageUpload
                label="Ảnh CCCD mặt sau"
                kind="CCCD"
                previewUrl={manager.cccdBackUrl}
                onChange={handleImage('cccdBackImage')}
                error={errors.cccdBackImage}
                disabled={submitting}
              />
            </Col>
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

export default ManagerEditModal;
