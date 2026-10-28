// UC-08 bước 1–5: Admin tạo tài khoản Manager (họ tên, email, SĐT). BE tạo PENDING và tự gửi mail link kích hoạt 24h
import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import managerApi from '../manager.api';
import { validateManagerCreate } from '../manager.validate';

const ManagerCreateModal = ({ onHide, onSaved }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateManagerCreate(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const response = await managerApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      // gửi mail lỗi: tài khoản vẫn được tạo, báo Admin vào chi tiết gửi lại link (UC-08)
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Tạo tài khoản Manager thành công');
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd email hoặc SĐT đã có người dùng
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">Thêm Manager</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Input
            label="Họ tên"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            autoFocus
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            helpText="Manager đăng nhập bằng email này"
            required
          />
          <Input
            label="Số điện thoại"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
            required
          />
          <Alert variant="info" className="mb-0">
            Hệ thống sẽ gửi email kèm link kích hoạt (hiệu lực 24 giờ). Manager tự đặt mật khẩu qua
            link đó.
          </Alert>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Tạo tài khoản
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ManagerCreateModal;
