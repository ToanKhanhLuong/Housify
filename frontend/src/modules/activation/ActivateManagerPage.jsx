// UC-08 bước 6–8 theo mockup docs/mock/ActivateManager.dc.html: Manager bấm link trong email → kiểm tra link
// → hiện họ tên, email → đặt mật khẩu → màn hình "Kích hoạt thành công". Link hỏng thì màn hình "Link không còn hiệu lực"
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import FieldRow from '../../components/FieldRow';
import PasswordInput from '../../components/PasswordInput';
import Loading from '../../components/Loading';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import activationApi from './activation.api';
import { validateActivateManager } from './activation.validate';

const ActivateManagerPage = () => {
  const { token } = useParams();
  const [checking, setChecking] = useState(true);
  // GET /activation/manager/:token trả { name, email } của người được mời
  const [account, setAccount] = useState(null);
  // link hỏng: hết hạn / đã dùng / không tồn tại → BE trả sẵn câu tiếng Việt, hiện thẳng
  const [linkError, setLinkError] = useState('');
  const [activated, setActivated] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // bước 2: mở trang là kiểm tra link ngay, hợp lệ mới hiện form
  useEffect(() => {
    let ignore = false; // rời trang trước khi API trả về thì bỏ kết quả
    activationApi
      .checkManagerToken(token)
      .then((response) => !ignore && setAccount(response.data))
      .catch((error) => !ignore && setLinkError(error.message))
      .finally(() => !ignore && setChecking(false));
    return () => {
      ignore = true;
    };
  }, [token]);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateActivateManager(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      // BE kiểm lại cả 2 ô, xác nhận phải khớp mật khẩu
      await activationApi.activateManager({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setActivated(true); // bước 8: màn hình thành công, bấm nút để sang đăng nhập
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới ô
      // lỗi khác = link vừa hết hạn / bị dùng trong lúc đang nhập → chuyển sang màn hình link hỏng
      if (!error.errors) setLinkError(error.message);
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (checking) return <Loading />;

    if (linkError) {
      return (
        <>
          <h1 className="h3 fw-bold mb-3">Link không còn hiệu lực</h1>
          <Alert variant="danger">{linkError}</Alert>
          <div className="text-secondary mb-4">
            Vui lòng liên hệ Admin để được gửi lại link kích hoạt mới.
          </div>
          <Button as={Link} to="/login" variant="secondary" size="lg" className="w-full">
            Về trang đăng nhập
          </Button>
        </>
      );
    }

    if (activated) {
      return (
        <>
          <h1 className="h3 fw-bold mb-3">Kích hoạt thành công</h1>
          <Alert variant="success">
            Tài khoản đã sẵn sàng. Đăng nhập bằng email <strong>{account?.email}</strong> và mật
            khẩu vừa đặt.
          </Alert>
          <Button as={Link} to="/login" replace variant="primary" size="lg" className="w-full">
            Đến trang đăng nhập
          </Button>
        </>
      );
    }

    return (
      <>
        <div className="mb-4">
          <h1 className="h3 fw-bold mb-1">Kích hoạt tài khoản Manager</h1>
          <div className="text-secondary">Đặt mật khẩu để bắt đầu sử dụng hệ thống.</div>
        </div>

        {/* người được mời: để Manager biết đang kích hoạt đúng tài khoản của mình */}
        <div className="rounded border bg-body-tertiary px-3 py-2 mb-4">
          <FieldRow label={<span className="fw-normal text-secondary">Họ tên</span>}>
            <span className="fw-medium">{account?.name}</span>
          </FieldRow>
          <FieldRow label={<span className="fw-normal text-secondary">Email</span>}>
            <span className="fw-medium">{account?.email}</span>
          </FieldRow>
        </div>

        <Form onSubmit={handleSubmit} noValidate>
          <PasswordInput
            label="Mật khẩu"
            name="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            helpText="Ít nhất 6 ký tự, có cả chữ và số."
            size="lg"
            autoComplete="new-password"
            autoFocus
            required
          />
          <PasswordInput
            label="Nhập lại mật khẩu"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            size="lg"
            autoComplete="new-password"
            className="mb-4"
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Kích hoạt tài khoản
          </Button>
        </Form>
      </>
    );
  };

  return (
    <Card className="w-full max-w-xl">
      <Card.Body className="p-4 p-sm-5">{renderBody()}</Card.Body>
    </Card>
  );
};

export default ActivateManagerPage;
