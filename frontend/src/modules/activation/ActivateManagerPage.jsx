// UC-08 bước 6–8: Manager bấm link trong email → kiểm tra link → đặt mật khẩu → tài khoản Đang hoạt động → về đăng nhập
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Input from '../../components/Input';
import Loading from '../../components/Loading';
import { PASSWORD_REGEX } from '../../constants/regex';
import { toFieldErrors } from '../../utils/formErrors';
import activationApi from './activation.api';

const ActivateManagerPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  // link hỏng: hết hạn / đã dùng / không tồn tại → BE trả sẵn câu tiếng Việt, hiện thẳng
  const [linkError, setLinkError] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // bước 2: mở trang là kiểm tra link ngay, hợp lệ mới hiện form
  useEffect(() => {
    let ignore = false; // rời trang trước khi API trả về thì bỏ kết quả
    activationApi
      .checkManagerToken(token)
      .catch((err) => !ignore && setLinkError(err.message))
      .finally(() => !ignore && setChecking(false));
    return () => {
      ignore = true;
    };
  }, [token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // kiểm tra nhanh ở FE theo quy tắc mật khẩu (như UC-03); BE vẫn kiểm tra lại
    const newErrors = {};
    if (!form.password) newErrors.password = 'Vui lòng nhập mật khẩu';
    else if (!PASSWORD_REGEX.test(form.password))
      newErrors.password = 'Mật khẩu tối thiểu 6 ký tự, có cả chữ và số';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    else if (form.confirmPassword !== form.password)
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      // ô xác nhận chỉ kiểm ở FE, không gửi lên
      await activationApi.activateManager({ token, password: form.password });
      // bước 8: về trang đăng nhập, đăng nhập bằng email + mật khẩu vừa đặt
      toast.success('Kích hoạt tài khoản thành công. Vui lòng đăng nhập');
      navigate('/login', { replace: true });
    } catch (err) {
      setErrors(toFieldErrors(err.errors)); // 422: lỗi hiện dưới ô
      if (!err.errors) toast.error(err.message); // vd link vừa hết hạn trong lúc đang nhập
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (checking) return <Loading />;

    if (linkError) {
      return (
        <>
          <Alert variant="warning">{linkError}</Alert>
          {/* link đã dùng thì mời đăng nhập; hết hạn thì liên hệ Admin gửi lại (UC-09) */}
          <Button as={Link} to="/login" variant="primary" size="lg" className="w-full">
            Về trang đăng nhập
          </Button>
        </>
      );
    }

    return (
      <Form onSubmit={handleSubmit} noValidate>
        <Input
          label="Mật khẩu"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          helpText="Tối thiểu 6 ký tự, có cả chữ và số"
          size="lg"
          autoComplete="new-password"
          autoFocus
          required
        />
        <Input
          label="Xác nhận mật khẩu"
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
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Spinner animation="border" size="sm" className="me-2" />}
          Kích hoạt
        </Button>
      </Form>
    );
  };

  return (
    <Card className="w-full max-w-xl">
      <Card.Body className="p-4 p-sm-5">
        <div className="text-center mb-4">
          <h1 className="h3 fw-bold mb-1">Kích hoạt tài khoản</h1>
          <div className="text-secondary">Đặt mật khẩu để bắt đầu sử dụng Housify</div>
        </div>
        {renderBody()}
      </Card.Body>
    </Card>
  );
};

export default ActivateManagerPage;
