// UC-03: đổi mật khẩu (Admin, Manager, Customer đang đăng nhập)
import { useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { BiLockAlt, BiSolidLock } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PasswordInput from './components/PasswordInput';
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
      // BE kiểm lại cả 3 ô, kể cả xác nhận phải khớp mật khẩu mới
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
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
    // thẻ căn giữa, tiêu đề nằm trong thẻ giống trang Đăng nhập / Quên mật khẩu
    <div className="max-w-xl mx-auto mt-5">
      <Card>
        <Card.Header className="bg-transparent text-center p-4">
          <h1 className="h4 fw-semibold mb-1 flex items-center justify-center gap-2">
            <BiSolidLock className="text-primary" />
            Đổi mật khẩu
          </h1>
          <div className="text-secondary">
            Cập nhật mật khẩu để giữ tài khoản của bạn luôn an toàn.
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="mb-4">
            <h2 className="h6 fw-semibold mb-1">Thiết lập mật khẩu mới</h2>
            <div className="small text-secondary">
              Vui lòng nhập mật khẩu hiện tại để xác nhận thay đổi.
            </div>
          </div>

          <Form onSubmit={handleSubmit} noValidate>
            <PasswordInput
              label="Mật khẩu hiện tại"
              name="currentPassword"
              placeholder="Nhập mật khẩu hiện tại"
              value={form.currentPassword}
              onChange={handleChange}
              error={errors.currentPassword}
              autoComplete="current-password"
              required
            />
            <PasswordInput
              label="Mật khẩu mới"
              name="newPassword"
              placeholder="Nhập mật khẩu mới"
              value={form.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              helpText="Tối thiểu 6 ký tự, có chữ và số"
              autoComplete="new-password"
              required
            />
            <PasswordInput
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu mới"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
            />

            <div className="border-top pt-3 flex gap-2">
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

          <div className="border-top mt-3 pt-3 text-secondary small flex items-center justify-center gap-1">
            <BiLockAlt />
            Không chia sẻ mật khẩu của bạn với bất kỳ ai.
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
