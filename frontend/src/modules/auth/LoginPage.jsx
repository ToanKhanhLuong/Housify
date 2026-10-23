// UC-01: đăng nhập. Một ô định danh chung: email (Admin, Manager) hoặc số CCCD (Customer), BE tự nhận biết
import { useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import authApi from './auth.api';
import { validateLogin } from './auth.validate';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validateLogin(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const res = await authApi.login({ ...form, identifier: form.identifier.trim() });
      // ghi nhớ đăng nhập → BE cấp token 7 ngày, FE lưu localStorage
      await login(res.data.token, form.remember);
      // "/" tự chuyển về trang chủ theo role (bước 4)
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(toFieldErrors(err.errors)); // 422: lỗi hiện dưới từng ô
      // sai tài khoản / mật khẩu, bị khóa, chưa kích hoạt, ngưng hoạt động: BE trả sẵn câu tiếng Việt
      if (!err.errors) toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // html đặt 14px nên rem của Tailwind nhỏ hơn mặc định: max-w-xl = 36rem ≈ 504px
    <Card className="w-full max-w-xl">
      <Card.Body className="p-4 p-sm-5">
        <div className="text-center mb-4">
          <h1 className="h3 fw-bold mb-1">Đăng nhập Housify</h1>
          <div className="text-secondary">Hệ thống quản lý nhà trọ cho thuê</div>
        </div>

        <Form onSubmit={handleSubmit} noValidate>
          <Input
            label="Tài khoản"
            name="identifier"
            placeholder="Nhập email hoặc 12 số CCCD"
            value={form.identifier}
            onChange={handleChange}
            error={errors.identifier}
            size="lg"
            autoComplete="username"
            autoFocus
            required
          />
          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            placeholder="Nhập mật khẩu"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            size="lg"
            autoComplete="current-password"
            required
          />

          <div className="flex items-center justify-between gap-3 mb-4">
            <Form.Check
              className="text-nowrap"
              id="remember"
              name="remember"
              label="Ghi nhớ đăng nhập (7 ngày)"
              checked={form.remember}
              onChange={handleChange}
            />
            {/* chuyển sang UC-04 */}
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Đăng nhập
          </Button>
        </Form>

        {/* ô Tài khoản dùng chung cho 3 role nên ghi rõ cách đăng nhập (UC-01) */}
        <Alert variant="info" className="mt-4 mb-0">
          Admin và Quản lý đăng nhập bằng <strong>email</strong>. Khách thuê đăng nhập bằng{' '}
          <strong>số CCCD</strong> và mật khẩu đã đặt khi kích hoạt hợp đồng.
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default LoginPage;
