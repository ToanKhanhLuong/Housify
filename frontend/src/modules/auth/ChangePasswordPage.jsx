// UC-03: đổi mật khẩu (Admin, Manager, Customer đang đăng nhập)
import { useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import Input from '../../components/Input';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import authApi from './auth.api';
import { validateChangePassword } from './auth.validate';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // mật khẩu hiện tại có đúng không thì BE mới biết
    const clientErrors = validateChangePassword(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      // ô xác nhận chỉ kiểm ở FE, không gửi lên
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      setForm(EMPTY_FORM);
    } catch (err) {
      setErrors(toFieldErrors(err.errors)); // 422: lỗi hiện dưới từng ô
      if (!err.errors) toast.error(err.message); // vd mật khẩu hiện tại không đúng
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Đổi mật khẩu" />

      <Card className="max-w-xl">
        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit} noValidate>
            <Input
              label="Mật khẩu hiện tại"
              name="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              error={errors.currentPassword}
              autoComplete="current-password"
              required
            />
            <Input
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              helpText="Tối thiểu 6 ký tự, có cả chữ và số"
              autoComplete="new-password"
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
              className="mb-4"
              required
            />

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting && <Spinner animation="border" size="sm" className="me-2" />}
                Đổi mật khẩu
              </Button>
              {/* hủy giữa chừng: không thay đổi gì, về trang chủ */}
              <Button variant="secondary" onClick={() => navigate('/')} disabled={submitting}>
                Hủy
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </>
  );
};

export default ChangePasswordPage;
