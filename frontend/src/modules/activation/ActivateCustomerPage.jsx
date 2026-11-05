// UC-06: khách mở link mời trong email → xem hợp đồng → điền thông tin → xem lại và xác nhận điện tử → hoàn tất
// Hợp đồng luôn hiện dạng trang văn bản (ContractDocument), phần nhập nằm ở form riêng; xác nhận xong in được / lưu PDF
// Link hết hạn, đã dùng hoặc hợp đồng đã hủy → màn hình báo lỗi với đúng câu BE trả
// Hợp đồng nhóm: người đại diện tự nhập người ở cùng ở bước 2 (CoOccupantsInput)
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { BiArrowBack, BiCheckShield, BiPrinter, BiRightArrowAlt } from 'react-icons/bi';
import { Link, useParams } from 'react-router-dom';
import Input from '../../components/Input';
import PasswordInput from '../../components/PasswordInput';
import ImageUpload from '../../components/ImageUpload';
import Loading from '../../components/Loading';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import { toDateInput } from '../../utils/format';
import activationApi from './activation.api';
import { validateActivateCustomer } from './activation.validate';
import ContractDocument from '../../components/ContractDocument';
import CoOccupantsInput from './components/CoOccupantsInput';
import { CONTRACT_TYPE } from '../../constants/enums';

const TODAY = toDateInput(new Date());
const STEP = { REVIEW: 1, FORM: 2, CONFIRM: 3, DONE: 4 };
const STEP_LABELS = [
  { step: STEP.REVIEW, label: '1. Xem hợp đồng' },
  { step: STEP.FORM, label: '2. Điền thông tin' },
  { step: STEP.CONFIRM, label: '3. Xác nhận' },
  { step: STEP.DONE, label: '4. Hoàn tất' },
];

const EMPTY_FORM = {
  name: '',
  dateOfBirth: '',
  phone: '',
  address: '',
  cccdFrontImage: '',
  cccdBackImage: '',
  password: '',
  confirmPassword: '',
  coOccupants: [], // [{ id, name, cccd, phone, dateOfBirth, address }]
};

// lỗi về chính link (hết hạn, đã dùng, đã hủy, không tồn tại) → chuyển sang màn hình link hỏng
const isLinkError = (error) =>
  error.status === 404 || /link|đã được kích hoạt|trạng thái chờ kích hoạt/i.test(error.message);

const ActivateCustomerPage = () => {
  const { token } = useParams();
  const [checking, setChecking] = useState(true);
  const [contract, setContract] = useState(null); // dữ liệu GET /activation/contract/:token
  const [linkError, setLinkError] = useState('');
  const [step, setStep] = useState(STEP.REVIEW);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null); // { name, activatedAt } sau khi xác nhận
  const [warning, setWarning] = useState('');

  useEffect(() => {
    let ignore = false; // rời trang trước khi API trả về thì bỏ kết quả
    activationApi
      .checkContractToken(token)
      .then((response) => !ignore && setContract(response.data))
      .catch((error) => !ignore && setLinkError(error.message))
      .finally(() => !ignore && setChecking(false));
    return () => {
      ignore = true;
    };
  }, [token]);

  const goTo = (next) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((prev) => {
      if (!prev[name] && !prev.coOccupants) return prev;
      const next = { ...prev };
      delete next[name];
      if (name === 'coOccupants') delete next.coOccupants;
      return next;
    });
  };
  const handleClearError = (errorKey) => {
    setErrors((prev) => {
      if (!prev[errorKey]) return prev;
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  };
  const handleChange = (event) => setField(event.target.name, event.target.value);

  // bước 2 → 3: kiểm tra form trước khi cho xem lại hợp đồng đã điền
  const handleFormSubmit = (event) => {
    event.preventDefault();
    const clientErrors = validateActivateCustomer(form, contract);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    setSubmitError('');
    goTo(STEP.CONFIRM);
  };

  // bước 3: gửi BE. Sai field → về form hiện lỗi dưới ô; lỗi link → màn hình link hỏng; còn lại báo ngay trên nút
  const handleConfirm = async () => {
    if (!agreed) {
      setSubmitError('Bạn phải tích chọn đồng ý điều khoản hợp đồng để xác nhận');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await activationApi.activateContract({
        token,
        name: form.name.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        address: form.address.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        agreed: true,
        cccdFrontImage: form.cccdFrontImage,
        cccdBackImage: form.cccdBackImage,
        // bỏ id (khóa React) trước khi gửi
        coOccupants: form.coOccupants.map((person) => ({
          name: person.name.trim(),
          cccd: person.cccd.trim(),
          phone: person.phone.trim(),
          dateOfBirth: person.dateOfBirth,
          address: person.address.trim(),
        })),
      });
      setConfirmation({
        name: form.name.trim(),
        activatedAt: response.data?.activatedAt ?? new Date().toISOString(),
      });
      setWarning(response.data?.warning ?? '');
      goTo(STEP.DONE);
    } catch (error) {
      if (error.errors) {
        setErrors(toFieldErrors(error.errors)); // 422
        goTo(STEP.FORM);
      } else if (error.message === 'Số điện thoại đã tồn tại trong hệ thống') {
        setErrors({ phone: error.message }); // trùng SĐT người đại diện
        goTo(STEP.FORM);
      } else if (/người ở cùng|Số CCCD|Số người|Số điện thoại d/i.test(error.message)) {
        setErrors({ coOccupants: error.message }); // lỗi người ở cùng BE kiểm trên toàn hệ thống
        goTo(STEP.FORM);
      } else if (isLinkError(error)) {
        setLinkError(error.message);
      } else {
        setSubmitError(error.message); // vd phòng không còn trống, trùng email
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return <Loading />;

  if (linkError) {
    return (
      <Card className="w-full max-w-xl">
        <Card.Body className="p-4 p-sm-5">
          <h1 className="h3 fw-bold mb-3">Link không còn hiệu lực</h1>
          <Alert variant="danger">{linkError}</Alert>
          <div className="text-secondary mb-4">
            Vui lòng liên hệ Manager của tòa nhà để được gửi lại lời mời ký hợp đồng.
          </div>
          <Button as={Link} to="/login" variant="secondary" className="w-full">
            Về trang đăng nhập
          </Button>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl flex flex-col gap-3">
      {/* tiêu đề + thanh bước (ẩn khi in) */}
      <div className="flex flex-col gap-2 print:hidden">
        <h1 className="h4 fw-bold mb-0">Xác nhận hợp đồng thuê phòng {contract.room.roomNumber}</h1>
        <div className="flex">
          {STEP_LABELS.map((item) => (
            <span
              key={item.step}
              className={`hf-step flex-1 ${step >= item.step ? 'hf-step-on' : ''}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {step === STEP.REVIEW && (
        <>
          <Alert variant="info" className="mb-0 print:hidden">
            Đọc kỹ hợp đồng dưới đây. Các chỗ "……" ở phần Bên B
            {contract.contractType === CONTRACT_TYPE.GROUP && ' và danh sách người ở cùng'} bạn sẽ
            điền ở bước tiếp theo.
          </Alert>
          <ContractDocument contract={contract} />
          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="primary" className="flex items-center gap-1" onClick={() => goTo(STEP.FORM)}
            >
              Tiếp tục điền thông tin
              <BiRightArrowAlt />
            </Button>
          </div>
        </>
      )}

      {/* form luôn được giữ (chỉ ẩn) để không mất ảnh CCCD đã tải khi qua lại giữa các bước */}
      <Card className={step === STEP.FORM ? '' : 'd-none'}>
        <Card.Body className="p-4">
          <Form onSubmit={handleFormSubmit} noValidate>
            <h2 className="h5 fw-bold mb-1">Thông tin người đại diện (Bên B)</h2>
            <div className="small text-secondary mb-3">
              Số CCCD và email do Manager nhập khi tạo hợp đồng, không sửa được. Sau này bạn đăng
              nhập bằng số CCCD.
            </div>
            <Row className="g-3">
              <Col md={6}>
                <Input
                  label="Số CCCD"
                  name="cccd"
                  value={contract.representativeCccd}
                  readOnly
                  disabled
                  className="mb-0"
                />
              </Col>
              <Col md={6}>
                <Input
                  label="Email"
                  name="email"
                  value={contract.representativeEmail}
                  readOnly
                  disabled
                  className="mb-0"
                />
              </Col>
              <Col md={8}>
                <Input
                  label="Họ và tên"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  error={errors.name}
                  maxLength={100}
                  autoComplete="name"
                  required
                  className="mb-0"
                />
              </Col>
              <Col md={4}>
                <Input
                  label="Ngày sinh"
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  error={errors.dateOfBirth}
                  max={TODAY}
                  helpText="Không chọn ngày trong tương lai."
                  required
                  className="mb-0"
                />
              </Col>
              <Col md={4}>
                <Input
                  label="Số điện thoại"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  inputMode="tel"
                  maxLength={10}
                  placeholder="0912345678"
                  autoComplete="tel"
                  required
                  className="mb-0"
                />
              </Col>
              <Col md={8}>
                <Input
                  label="Địa chỉ thường trú"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  error={errors.address}
                  maxLength={255}
                  autoComplete="street-address"
                  className="mb-0"
                />
              </Col>
              <Col md={6}>
                <ImageUpload
                  label="Ảnh CCCD mặt trước"
                  kind="CCCD"
                  value={form.cccdFrontImage}
                  onChange={(publicId) => setField('cccdFrontImage', publicId)}
                  error={errors.cccdFrontImage}
                  required
                />
              </Col>
              <Col md={6}>
                <ImageUpload
                  label="Ảnh CCCD mặt sau"
                  kind="CCCD"
                  value={form.cccdBackImage}
                  onChange={(publicId) => setField('cccdBackImage', publicId)}
                  error={errors.cccdBackImage}
                  required
                />
              </Col>
            </Row>

            {contract.contractType === CONTRACT_TYPE.GROUP && (
              <div className="mt-4">
                <CoOccupantsInput
                  contract={contract}
                  value={form.coOccupants}
                  onChange={(people) => setField('coOccupants', people)}
                  onClearError={handleClearError}
                  errors={errors}
                />
              </div>
            )}

            <h2 className="h5 fw-bold mt-4 mb-3">Mật khẩu đăng nhập</h2>
            <Row className="g-3">
              <Col md={6}>
                <PasswordInput
                  label="Mật khẩu"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  helpText="Ít nhất 6 ký tự, có cả chữ và số."
                  autoComplete="new-password"
                  required
                  className="mb-0"
                />
              </Col>
              <Col md={6}>
                <PasswordInput
                  label="Nhập lại mật khẩu"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  required
                  className="mb-0"
                />
              </Col>
            </Row>

            {/* nút căn phải theo yêu cầu: Quay lại (phụ) rồi Tiếp tục (chính) */}
            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <Button variant="secondary" className="flex items-center gap-1" onClick={() => goTo(STEP.REVIEW)}
              >
                <BiArrowBack />
                Quay lại
              </Button>
              <Button type="submit" variant="primary" className="flex items-center gap-1">
                Tiếp tục
                <BiRightArrowAlt />
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {step === STEP.CONFIRM && (
        <>
          <ContractDocument contract={contract} party={form} />
          <Card className="print:hidden">
            <Card.Body className="p-4 flex flex-col gap-3">
              <Form.Check
                id="agreed"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  setSubmitError('');
                }}
                label={
                  <>
                    Tôi đã đọc, hiểu và đồng ý toàn bộ nội dung hợp đồng và nội quy tòa nhà. Tích
                    vào đây là <b>xác nhận điện tử</b> của tôi cho hợp đồng này.
                    <span className="text-danger ms-1">*</span>
                  </>
                }
              />
              {submitError && (
                <Alert variant="danger" className="mb-0">
                  {submitError}
                </Alert>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" className="flex items-center gap-1" onClick={() => goTo(STEP.FORM)}
                  disabled={submitting}
                >
                  <BiArrowBack />
                  Quay lại sửa
                </Button>
                <Button variant="primary" className="flex items-center gap-2" onClick={handleConfirm} disabled={submitting} >
                  {submitting ? <Spinner animation="border" size="sm" /> : <BiCheckShield />}
                  Xác nhận hợp đồng
                </Button>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {step === STEP.DONE && (
        <>
          <Alert variant="success" className="mb-0 print:hidden">
            <div className="fw-semibold">Xác nhận hợp đồng thành công</div>
            Hợp đồng đã có hiệu lực. Đăng nhập bằng số CCCD <b>{contract.representativeCccd}</b> và
            mật khẩu vừa đặt.
          </Alert>
          {warning && (
            <Alert variant="warning" className="mb-0 print:hidden">
              {warning}
            </Alert>
          )}
          <ContractDocument contract={contract} party={form} confirmation={confirmation} />
          <div className="flex flex-wrap justify-end gap-2 print:hidden">
            <Button variant="secondary" className="flex items-center gap-2" onClick={() => window.print()}
            >
              <BiPrinter />
              In / Lưu PDF
            </Button>
            <Button as={Link} to="/login" replace variant="primary" >
              Đến trang đăng nhập
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivateCustomerPage;
