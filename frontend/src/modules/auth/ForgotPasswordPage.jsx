// UC-04: quên mật khẩu, 3 bước trong 1 trang: nhập email → nhập OTP (gửi lại được) → đặt mật khẩu mới
import { useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Input from '../../components/Input';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import authApi from './auth.api';
import { validateForgotEmail, validateOtp, validateResetPassword } from './auth.validate';

const STEP = { EMAIL: 1, OTP: 2, PASSWORD: 3 };

const SUBTITLE = {
  [STEP.EMAIL]: 'Bước 1/3: nhập email để nhận mã OTP',
  [STEP.OTP]: 'Bước 2/3: nhập mã OTP',
  [STEP.PASSWORD]: 'Bước 3/3: đặt mật khẩu mới',
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP.EMAIL);
  const [form, setForm] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' });
  const [resetToken, setResetToken] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // 422 thì hiện dưới ô, lỗi khác (OTP sai / hết hạn, gửi mail lỗi…) hiện toast câu BE trả về
  const showError = (err) => {
    setErrors(toFieldErrors(err.errors));
    if (!err.errors) toast.error(err.message);
  };

  // Bước 1: gửi OTP. Email có tồn tại hay không BE cũng trả cùng một câu, nên luôn sang bước 2
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const clientErrors = validateForgotEmail(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    const email = form.email.trim();

    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email });
      setForm({ ...form, email, otp: '' });
      setStep(STEP.OTP);
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Không nhận được thư: gửi lại, OTP cũ hết hiệu lực ngay (BE xử lý)
  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.forgotPassword({ email: form.email });
      setForm({ ...form, otp: '' });
      setErrors({});
      toast.success('Đã gửi lại mã OTP');
    } catch (err) {
      showError(err);
    } finally {
      setResending(false);
    }
  };

  // Bước 2: xác thực OTP, BE trả resetToken để dùng ở bước 3
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const clientErrors = validateOtp(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const res = await authApi.verifyOtp({ email: form.email, otp: form.otp });
      setResetToken(res.data.resetToken);
      setStep(STEP.PASSWORD);
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Bước 3: đặt mật khẩu mới (cùng quy tắc UC-03; trùng mật khẩu cũ do BE kiểm) → về trang đăng nhập
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const clientErrors = validateResetPassword(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      await authApi.resetPassword({ resetToken, newPassword: form.newPassword });
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại');
      navigate('/login', { replace: true });
    } catch (err) {
      showError(err);
      setSubmitting(false);
    }
  };

  const submitButton = (text) => (
    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
      {submitting && <Spinner animation="border" size="sm" className="me-2" />}
      {text}
    </Button>
  );

  return (
    <Card className="w-full max-w-xl">
      <Card.Body className="p-4 p-sm-5">
        <div className="text-center mb-4">
          <h1 className="h3 fw-bold mb-1">Quên mật khẩu</h1>
          <div className="text-secondary">{SUBTITLE[step]}</div>
        </div>

        {step === STEP.EMAIL && (
          <Form onSubmit={handleSendOtp} noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="Nhập email đã đăng ký"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              size="lg"
              autoComplete="email"
              className="mb-4"
              autoFocus
              required
            />
            {submitButton('Gửi mã OTP')}
          </Form>
        )}

        {step === STEP.OTP && (
          <Form onSubmit={handleVerifyOtp} noValidate>
            <Alert variant="info">
              Nếu <strong>{form.email}</strong> đã đăng ký tài khoản, mã OTP đã được gửi tới email
              này. Mã có hiệu lực 5 phút và chỉ dùng được một lần.
            </Alert>
            <Input
              label="Mã OTP"
              name="otp"
              placeholder="Nhập 4 chữ số"
              value={form.otp}
              onChange={handleChange}
              error={errors.otp}
              size="lg"
              inputMode="numeric"
              maxLength={4}
              autoComplete="one-time-code"
              className="mb-4"
              autoFocus
              required
            />
            {submitButton('Xác nhận')}
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-secondary">Không nhận được mã?</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResend}
                disabled={resending || submitting}
              >
                {resending && <Spinner animation="border" size="sm" className="me-2" />}
                Gửi lại mã
              </Button>
            </div>
          </Form>
        )}

        {step === STEP.PASSWORD && (
          <Form onSubmit={handleResetPassword} noValidate>
            <Input
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              helpText="Tối thiểu 6 ký tự, có cả chữ và số"
              size="lg"
              autoComplete="new-password"
              autoFocus
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              size="lg"
              autoComplete="new-password"
              className="mb-4"
              required
            />
            {submitButton('Đặt lại mật khẩu')}
          </Form>
        )}

        <div className="text-center mt-4">
          <Link to="/login">Quay lại đăng nhập</Link>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ForgotPasswordPage;
