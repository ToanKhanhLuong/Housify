// UC-28, 29: Manager tạo đơn chấm dứt cho hợp đồng đang hiệu lực (/terminations/new?contractId=, mở từ chi tiết hợp đồng)
// Chọn 1 trong 2 loại: Hai bên thỏa thuận (khách xác nhận điện tử) / Đơn phương (khách vi phạm, Admin duyệt)
// Nhập lý do (bắt buộc), ngày hiệu lực (bắt buộc), ghi chú bàn giao (tùy chọn). Gửi xong nội dung đơn bị khóa
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Placeholder, Spinner } from 'react-bootstrap';
import { BiSend } from 'react-icons/bi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import EmptyState from '../../components/EmptyState';
import FieldRow from '../../components/FieldRow';
import Input from '../../components/Input';
import MoneyText from '../../components/MoneyText';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import ConfirmModal from '../../components/ConfirmModal';
import { CONTRACT_STATUS, TERMINATION_TYPE } from '../../constants/enums';
import { TERMINATION_TYPE_LABEL } from '../../constants/statusLabels';
import { toDateInput, formatDate } from '../../utils/format';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import terminationApi from './termination.api';
import { validateCreateTermination } from './termination.validate';

// 2 thẻ chọn loại đơn: tên, ai xử lý, hệ quả
const TYPE_OPTIONS = [
  {
    value: TERMINATION_TYPE.MUTUAL,
    icon: TERMINATION_TYPE_LABEL[TERMINATION_TYPE.MUTUAL].icon,
    title: 'Hai bên thỏa thuận',
    lines: [
      'Khách muốn trả phòng sớm, hai bên đã thống nhất',
      'Người đại diện xác nhận điện tử; quá 7 ngày không phản hồi thì tự xác nhận',
      'Sau ngày hiệu lực: tài khoản khách ngưng hoạt động (vẫn thuê lại được)',
    ],
  },
  {
    value: TERMINATION_TYPE.UNILATERAL,
    icon: TERMINATION_TYPE_LABEL[TERMINATION_TYPE.UNILATERAL].icon,
    title: 'Đơn phương',
    lines: [
      'Khách vi phạm nghiêm trọng nội quy',
      'Gửi Admin xem xét phê duyệt hoặc từ chối',
      'Sau ngày hiệu lực: tài khoản khách bị khóa, không thuê lại được',
    ],
  },
];

const EMPTY_FORM = { type: TERMINATION_TYPE.MUTUAL, reason: '', effectiveDate: '', note: '' };

const TerminationCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('contractId');

  const [contractState, setContractState] = useState({ status: contractId ? 'loading' : 'missing', contract: null, error: '' });
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, effectiveDate: toDateInput(new Date()) }));
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!contractId) return;
    terminationApi
      .contract(contractId)
      .then((response) => setContractState({ status: 'ok', contract: response.data, error: '' }))
      .catch((error) => setContractState({ status: 'error', contract: null, error: error.message }));
  }, [contractId]);

  const contract = contractState.contract;
  const backTo = contractId ? `/contracts/${contractId}` : '/contracts';

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setErrors((prev) => ({ ...prev, [event.target.name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const clientErrors = validateCreateTermination(form, contract);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    setConfirming(true);
  };

  const handleConfirmSubmit = async () => {
    const note = form.note.trim();
    setSubmitting(true);
    try {
      const response = await terminationApi.create(contractId, {
        type: form.type,
        reason: form.reason.trim(),
        effectiveDate: form.effectiveDate,
        ...(note && { note }),
      });
      setConfirming(false);
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success(response.message || 'Đã gửi đơn chấm dứt hợp đồng');
      navigate(`/terminations/${response.data?._id}`, { replace: true });
    } catch (error) {
      setConfirming(false);
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd "Hợp đồng đã có đơn chấm dứt đang xử lý"
      setSubmitting(false);
    }
  };

  if (contractState.status === 'missing') {
    return (
      <EmptyState message="Hãy mở hợp đồng đang hiệu lực rồi bấm Chấm dứt để tạo đơn.">
        <Button variant="secondary" onClick={() => navigate('/contracts')}>
          Về danh sách hợp đồng
        </Button>
      </EmptyState>
    );
  }
  if (contractState.status === 'loading') {
    return (
      <div aria-busy="true">
        <Placeholder as="div" className="mb-3">
          <Placeholder className="w-64 h-6 rounded bg-body-tertiary" />
        </Placeholder>
        <Card>
          <Card.Body>
            <SkeletonRows rows={5} columns={3} />
          </Card.Body>
        </Card>
      </div>
    );
  }
  if (contractState.status === 'error') {
    return (
      <EmptyState message={contractState.error || 'Không tải được hợp đồng'}>
        <Button variant="secondary" onClick={() => navigate('/contracts')}>
          Về danh sách hợp đồng
        </Button>
      </EmptyState>
    );
  }

  const roomNumber = contract.room?.roomNumber ?? '';
  const isActive = contract.status === CONTRACT_STATUS.ACTIVE;
  const isMutual = form.type === TERMINATION_TYPE.MUTUAL;

  return (
    <>
      <PageHeader
        backTo={backTo}
        breadcrumbs={[
          { label: 'Hợp đồng', to: '/contracts' },
          { label: `Phòng ${roomNumber}`, to: backTo },
          'Chấm dứt hợp đồng',
        ]}
      />

      <Form onSubmit={handleSubmit} noValidate>
        <Card className="hf-paper">
          <div className="flex flex-col gap-1">
            <span className="small text-secondary">Tạo đơn chấm dứt hợp đồng</span>
            <h1 className="h3 fw-bold mb-0">Phòng {roomNumber}</h1>
            {contract.room?.building && (
              <span className="text-secondary">{contract.room.building.name}</span>
            )}
          </div>

          {!isActive && (
            <Alert variant="danger" className="mb-0">
              Chỉ có thể tạo đơn chấm dứt cho hợp đồng đang hiệu lực.
            </Alert>
          )}

          {/* tóm tắt hợp đồng */}
          <div className="grid lg:grid-cols-2 column-gap-5">
            <div>
              <FieldRow label="Người đại diện">{contract.representative?.name ?? contract.representative?.cccd}</FieldRow>
              <FieldRow label="Thời hạn">
                {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Giá thuê">
                <MoneyText value={contract.rentPrice} /> / tháng
              </FieldRow>
              <FieldRow label="Tiền cọc">
                <MoneyText value={contract.deposit} />{' '}
                <span className="text-secondary">(không hoàn khi chấm dứt trước hạn)</span>
              </FieldRow>
            </div>
          </div>

          {/* chọn loại đơn */}
          <section className="flex flex-col gap-2">
            <h2 className="h6 fw-bold mb-0">
              Loại đơn <span className="text-danger">*</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-3" role="radiogroup" aria-label="Loại đơn chấm dứt">
              {TYPE_OPTIONS.map(({ value, icon: Icon, title, lines }) => {
                const selected = form.type === value;
                return (
                  <Button
                    key={value}
                    variant="secondary"
                    role="radio"
                    aria-checked={selected}
                    disabled={submitting}
                    onClick={() => setForm({ ...form, type: value })}
                    className={`hf-btn-ghost flex flex-col items-start gap-2 p-3 text-start border ${selected ? 'border-primary bg-primary-subtle' : ''}`}
                  >
                    <span className="flex items-center gap-2 fw-semibold">
                      <span className={`hf-rd ${selected ? 'hf-rd-on' : ''}`} />
                      <Icon className={value === TERMINATION_TYPE.UNILATERAL ? 'text-danger' : 'text-success'} />
                      {title}
                    </span>
                    <ul className="small text-secondary mb-0 ps-4">
                      {lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </Button>
                );
              })}
            </div>
            {errors.type && <div className="invalid-feedback d-block">{errors.type}</div>}
          </section>

          {/* nội dung đơn */}
          <section className="grid lg:grid-cols-2 column-gap-5">
            <Input
              label={isMutual ? 'Lý do chấm dứt' : 'Lý do vi phạm'}
              name="reason"
              as="textarea"
              rows={4}
              value={form.reason}
              onChange={handleChange}
              error={errors.reason}
              placeholder={isMutual ? 'Vd: khách chuyển công tác, muốn trả phòng sớm' : 'Vd: tái phạm gây ồn sau 23h, đã nhắc 3 lần'}
              maxLength={1000}
              disabled={submitting}
              required
            />
            <div>
              <Input
                label="Ngày hiệu lực"
                name="effectiveDate"
                type="date"
                value={form.effectiveDate}
                onChange={handleChange}
                error={errors.effectiveDate}
                min={
                  toDateInput(contract.startDate) > toDateInput(new Date())
                    ? toDateInput(contract.startDate)
                    : toDateInput(new Date())
                }
                max={toDateInput(contract.endDate)}
                helpText={`Hợp đồng hiện kết thúc ngày ${formatDate(contract.endDate)}. Tới ngày hiệu lực, phòng chuyển về Trống và cư dân chuyển đi.`}
                disabled={submitting}
                required
              />
              <Input
                label="Ghi chú bàn giao"
                name="note"
                as="textarea"
                rows={2}
                value={form.note}
                onChange={handleChange}
                error={errors.note}
                placeholder="Vd: kiểm tra điện nước, thu lại 2 chìa khóa"
                maxLength={1000}
                disabled={submitting}
              />
            </div>
          </section>

          <Alert variant="warning" className="mb-0 small">
            Gửi xong nội dung đơn bị khóa, không sửa được. Nhập sai thì hủy đơn rồi tạo đơn mới.{' '}
            {isMutual
              ? 'Người đại diện nhận thông báo và email để xác nhận.'
              : 'Admin nhận thông báo để xem xét phê duyệt.'}
          </Alert>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              className="flex items-center gap-2"
              disabled={submitting || !isActive}
            >
              {submitting ? <Spinner animation="border" size="sm" /> : <BiSend />}
              Gửi đơn chấm dứt
            </Button>
            <Button variant="secondary" onClick={() => navigate(backTo)} disabled={submitting}>
              Hủy
            </Button>
          </div>
        </Card>
      </Form>

      <ConfirmModal
        show={confirming}
        title={isMutual ? 'Xác nhận gửi đơn chấm dứt thỏa thuận' : 'Xác nhận gửi đơn chấm dứt đơn phương'}
        message={
          isMutual
            ? `Bạn có chắc chắn muốn gửi đơn chấm dứt thỏa thuận cho phòng ${roomNumber}? Đơn sẽ được gửi tới người đại diện để xác nhận điện tử.`
            : `Bạn có chắc chắn muốn gửi đơn chấm dứt đơn phương cho phòng ${roomNumber}? Đơn sẽ được chuyển tới Admin để xem xét phê duyệt.`
        }
        confirmText="Đồng ý gửi"
        cancelText="Xem lại"
        variant={isMutual ? 'primary' : 'danger'}
        loading={submitting}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
};

export default TerminationCreatePage;
