// UC-08 bước 1–5: Admin tạo tài khoản Manager (họ tên, email, SĐT). BE tạo PENDING và tự gửi mail link kích hoạt 24h
import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { BiInfoCircle } from 'react-icons/bi';
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
          <div>
            <Modal.Title className="h5">Thêm Manager</Modal.Title>
            <div className="small text-secondary">Tạo tài khoản cho nhân viên vận hành mới.</div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Input
            label="Họ tên"
            name="name"
            placeholder="Nhập họ và tên"
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
            placeholder="Nhập địa chỉ email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            required
          />
          <Input
            label="Số điện thoại"
            name="phone"
            placeholder="Nhập số điện thoại"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
            required
          />
          <Alert variant="info" className="mb-0 flex items-start gap-2 small">
            <BiInfoCircle className="shrink-0 mt-1" />
            <span>
              Email mời kích hoạt (link hiệu lực 24 giờ) sẽ được gửi đến Manager. Sau khi đặt mật
              khẩu, tài khoản có thể đăng nhập và nhận phân công tòa nhà.
            </span>
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
