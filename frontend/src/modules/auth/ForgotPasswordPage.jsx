// UC-04: quên mật khẩu theo mockup docs/mock/ForgotPassword.dc.html
// Thanh 3 bước: nhập email → nhập OTP (đổi email / gửi lại mã) → đặt mật khẩu mới → màn hình thành công
import { useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Input from '../../components/Input';
import PasswordInput from '../../components/PasswordInput';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import authApi from './auth.api';
import { validateForgotEmail, validateOtp, validateResetPassword } from './auth.validate';

const STEP = { EMAIL: 1, OTP: 2, PASSWORD: 3, DONE: 4 };

// thanh bước dùng class hf-step chung trong index.css (giống mockup)
const STEP_LABELS = [
  { step: STEP.EMAIL, label: '1. Email' },
  { step: STEP.OTP, label: '2. Mã OTP' },
  { step: STEP.PASSWORD, label: '3. Mật khẩu mới' },
];

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(STEP.EMAIL);
  const [form, setForm] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  // thông báo trong thẻ: { variant: 'success' | 'danger', text }
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  // 422 thì hiện dưới ô; lỗi khác (OTP sai / hết hạn, gửi mail lỗi…) hiện khung đỏ trong thẻ với câu BE trả về
  const showError = (error) => {
    setErrors(toFieldErrors(error.errors));
    setNotice(error.errors ? null : { variant: 'danger', text: error.message });
  };

  // Bước 1: gửi OTP. Email có tồn tại hay không BE cũng trả cùng một câu, nên luôn sang bước 2
  const handleSendOtp = async (event) => {
    event.preventDefault();
    const clientErrors = validateForgotEmail(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    const email = form.email.trim();

    setSubmitting(true);
    setNotice(null);
    try {
      await authApi.forgotPassword({ email });
      setForm({ ...form, email, otp: '' });
      setStep(STEP.OTP);
    } catch (error) {
      showError(error);
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
      setNotice({ variant: 'success', text: 'Đã gửi mã mới. Mã cũ không còn dùng được.' });
    } catch (error) {
      showError(error);
    } finally {
      setResending(false);
    }
  };

  // Nhập nhầm email: quay lại bước 1, giữ email để sửa
  const handleChangeEmail = () => {
    setForm({ ...form, otp: '' });
    setErrors({});
    setNotice(null);
    setStep(STEP.EMAIL);
  };

  // Bước 2: xác thực OTP. Đúng thì sang bước 3, BE không trả token; FE giữ email + otp để gửi ở bước 3
  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    const clientErrors = validateOtp(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      await authApi.verifyOtp({ email: form.email, otp: form.otp });
      setNotice(null);
      setStep(STEP.PASSWORD);
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Bước 3: đặt mật khẩu mới (cùng quy tắc UC-03; trùng mật khẩu cũ do BE kiểm) → màn hình thành công
  const handleResetPassword = async (event) => {
    event.preventDefault();
    const clientErrors = validateResetPassword(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      // BE kiểm lại email + OTP rồi mới đổi mật khẩu
      await authApi.resetPassword({
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setNotice(null);
      setStep(STEP.DONE);
    } catch (error) {
      showError(error);
    } finally {
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
        <h1 className="h3 fw-bold mb-3">Quên mật khẩu</h1>

        {/* bước đã qua và bước hiện tại được tô */}
        <div className="flex mb-4">
          {STEP_LABELS.map((item) => (
            <span
              key={item.step}
              className={`hf-step flex-1 ${step >= item.step ? 'hf-step-on' : ''}`}
            >
              {item.label}
            </span>
          ))}
        </div>

        {notice && <Alert variant={notice.variant}>{notice.text}</Alert>}

        {step === STEP.EMAIL && (
          <Form onSubmit={handleSendOtp} noValidate>
            <div className="text-secondary mb-3">
              Nhập email đã đăng ký. Khách thuê dùng email nhận hóa đơn.
            </div>
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="ten@example.com"
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
              Nếu email <strong>{form.email}</strong> có trong hệ thống, mã OTP 4 số đã được gửi tới
              hộp thư. Mã có hiệu lực 5 phút và chỉ dùng được 1 lần.
            </Alert>
            <Input
              label="Mã OTP"
              name="otp"
              placeholder="4 chữ số"
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
            <div className="flex items-center justify-between gap-2 mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleChangeEmail}
                disabled={submitting}
              >
                Đổi email
              </Button>
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
            <PasswordInput
              label="Mật khẩu mới"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              helpText="Ít nhất 6 ký tự, có cả chữ và số."
              size="lg"
              autoComplete="new-password"
              autoFocus
              required
            />
            <PasswordInput
              label="Nhập lại mật khẩu mới"
              name="confirmPassword"
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

        {step === STEP.DONE && (
          <>
            <Alert variant="success">
              Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.
            </Alert>
            <Button as={Link} to="/login" replace variant="primary" size="lg" className="w-full">
              Về trang đăng nhập
            </Button>
          </>
        )}

        {step !== STEP.DONE && (
          <div className="text-center mt-4">
            <Link to="/login">Quay lại đăng nhập</Link>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ForgotPasswordPage;
