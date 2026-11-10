// UC-28, 29: chi tiết đơn chấm dứt hợp đồng – dùng chung Admin (/terminations/:id), Manager (/terminations/:id),
// Customer (/my-terminations/:id). Nội dung đơn bị khóa sau khi gửi, chỉ xem. Nút theo vai trò + trạng thái:
// - Manager, đơn Chờ xử lý: Hủy đơn (lý do bắt buộc)
// - Admin, đơn đơn phương Chờ xử lý: Phê duyệt (popup xác nhận) / Từ chối (lý do bắt buộc)
// - Customer, đơn hai bên Chờ xử lý: tích "đồng ý nội dung đơn" → Xác nhận → popup xác nhận lần cuối → xác nhận điện tử
// Khung kết quả (TerminationOutcome): Đã xác nhận điện tử + Hợp lệ, tự xác nhận sau 7 ngày, Admin duyệt / từ chối, đã hủy
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Placeholder } from 'react-bootstrap';
import { BiCheck, BiCheckShield, BiXCircle } from 'react-icons/bi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FieldRow from '../../components/FieldRow';
import MoneyText from '../../components/MoneyText';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import StatusSteps from '../../components/StatusSteps';
import { useAuth } from '../../context/AuthContext';
import { ROLE, TERMINATION_STATUS, TERMINATION_TYPE } from '../../constants/enums';
import { TERMINATION_STATUS_LABEL, TERMINATION_TYPE_LABEL } from '../../constants/statusLabels';
import { formatDate, formatDateTime } from '../../utils/format';
import terminationApi from './termination.api';
import ReasonModal from './components/ReasonModal';
import TerminationOutcome from './components/TerminationOutcome';

// Bị từ chối / Đã hủy nằm ngoài luồng chính, StatusSteps tự hiện ở cuối
const STEPS = [TERMINATION_STATUS.PENDING, TERMINATION_STATUS.CONFIRMED];

const TerminationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user.role;

  const [state, setState] = useState({ status: 'loading', termination: null, error: '' });
  const [modal, setModal] = useState(null); // 'cancel' | 'approve' | 'reject' | 'confirm'
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadTermination = useCallback(
    () =>
      terminationApi
        .detail(id)
        .then((response) => setState({ status: 'ok', termination: response.data, error: '' }))
        .catch((error) =>
          setState({
            status: error.status === 404 || error.status === 403 ? 'notFound' : 'error',
            termination: null,
            error: error.message,
          }),
        ),
    [id],
  );

  useEffect(() => {
    loadTermination();
  }, [loadTermination]);

  const termination = state.termination;
  const backTo =
    role === ROLE.ADMIN
      ? '/terminations'
      : role === ROLE.CUSTOMER
        ? '/my-contract'
        : termination?.contract?._id
          ? `/contracts/${termination.contract._id}`
          : '/contracts';

  // gọi 1 thao tác, báo kết quả (warning khi gửi email lỗi), tải lại đơn
  const runAction = async (action, successText) => {
    setBusy(true);
    try {
      const response = await action();
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success(response.message || successText);
      setModal(null);
      setAgreed(false);
      loadTermination();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải đơn chấm dứt">
        <Placeholder as="div" className="mb-3">
          <Placeholder className="w-64 h-6 rounded bg-body-tertiary" />
        </Placeholder>
        <Card>
          <Card.Body>
            <SkeletonRows rows={6} columns={4} />
          </Card.Body>
        </Card>
      </div>
    );
  }
  if (state.status === 'notFound') {
    return (
      <EmptyState message={state.error || 'Không tìm thấy đơn chấm dứt hợp đồng'}>
        <Button variant="secondary" onClick={() => navigate(backTo)}>
          Quay lại
        </Button>
      </EmptyState>
    );
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        message="Không tải được đơn chấm dứt"
        detail={state.error}
        onRetry={() => {
          setState({ status: 'loading', termination: null, error: '' });
          loadTermination();
        }}
      />
    );
  }

  const { contract, room, representative } = termination;
  const isPending = termination.status === TERMINATION_STATUS.PENDING;
  const isMutual = termination.type === TERMINATION_TYPE.MUTUAL;
  const canCancel = role === ROLE.MANAGER && isPending;
  const canDecide = role === ROLE.ADMIN && isPending && !isMutual;
  const canConfirm = role === ROLE.CUSTOMER && isPending && isMutual;

  const actions = (
    <>
      {canDecide && (
        <>
          <Button variant="primary" className="flex items-center gap-2" onClick={() => setModal('approve')}>
            <BiCheck />
            Phê duyệt
          </Button>
          <Button variant="secondary" className="flex items-center gap-2" onClick={() => setModal('reject')}>
            <BiXCircle />
            Từ chối
          </Button>
        </>
      )}
      {canCancel && (
        <Button variant="secondary" className="flex items-center gap-2" onClick={() => setModal('cancel')}>
          <BiXCircle />
          Hủy đơn
        </Button>
      )}
    </>
  );

  const roomText = room ? `Phòng ${room.roomNumber}` : 'Hợp đồng';

  return (
    <>
      <PageHeader
        backTo={backTo}
        breadcrumbs={
          role === ROLE.ADMIN
            ? [{ label: 'Đơn chấm dứt', to: '/terminations' }, roomText]
            : role === ROLE.CUSTOMER
              ? [{ label: 'Hợp đồng của tôi', to: '/my-contract' }, 'Đơn chấm dứt']
              : [{ label: 'Hợp đồng', to: '/contracts' }, { label: roomText, to: backTo }, 'Đơn chấm dứt']
        }
        actions={actions}
      >
        <StatusSteps map={TERMINATION_STATUS_LABEL} steps={STEPS} current={termination.status} />
      </PageHeader>

      <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        <Card className="hf-paper">
          {/* định danh: loại đơn, phòng, trạng thái */}
          <div className="flex flex-col gap-1">
            <span className="small text-secondary">
              Đơn chấm dứt hợp đồng · gửi lúc {formatDateTime(termination.createdAt)}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <h1 className="h3 fw-bold mb-0">{roomText}</h1>
              <StatusBadge map={TERMINATION_TYPE_LABEL} value={termination.type} />
              <StatusBadge map={TERMINATION_STATUS_LABEL} value={termination.status} />
            </span>
            {room?.building && (
              <span className="text-secondary">
                {room.building.name}
                {room.building.address ? ` · ${room.building.address}` : ''}
              </span>
            )}
          </div>

          {/* nội dung đơn (đã khóa sau khi gửi) */}
          <section className="flex flex-col gap-1">
            <h2 className="h6 fw-bold mb-1">Nội dung đơn</h2>
            <FieldRow label={isMutual ? 'Lý do chấm dứt' : 'Lý do vi phạm'} required>
              <span className="whitespace-pre-line">{termination.reason}</span>
            </FieldRow>
            <FieldRow label="Ngày hiệu lực" required>
              <span className="fw-semibold">{formatDate(termination.effectiveDate)}</span>
            </FieldRow>
            <FieldRow label="Ghi chú bàn giao">
              {termination.note ? (
                <span className="whitespace-pre-line">{termination.note}</span>
              ) : (
                <span className="text-secondary">Không có</span>
              )}
            </FieldRow>
          </section>

          {/* hợp đồng + người đại diện */}
          <section className="flex flex-col gap-1">
            <h2 className="h6 fw-bold mb-1">Hợp đồng</h2>
            <div className="grid lg:grid-cols-2 column-gap-5">
              <div>
                <FieldRow label="Thời hạn" required>
                  {contract ? `${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}` : '—'}
                </FieldRow>
                <FieldRow label="Giá thuê" required>
                  <MoneyText value={contract?.rentPrice} /> / tháng
                </FieldRow>
                <FieldRow label="Tiền cọc" required>
                  <MoneyText value={contract?.deposit} />
                </FieldRow>
                {role !== ROLE.CUSTOMER && contract?._id && (
                  <FieldRow label="Mở hợp đồng">
                    <Link to={`/contracts/${contract._id}`}>Xem chi tiết hợp đồng</Link>
                  </FieldRow>
                )}
              </div>
              <div>
                <FieldRow label="Người đại diện" required>{representative?.name ?? '—'}</FieldRow>
                <FieldRow label="Số CCCD" required>{representative?.cccd ?? '—'}</FieldRow>
                <FieldRow label="Số điện thoại" required>{representative?.phone ?? '—'}</FieldRow>
                <FieldRow label="Email" required>{representative?.email ?? contract?.representativeEmail ?? '—'}</FieldRow>
              </div>
            </div>
          </section>

          <Alert variant="warning" className="mb-0 small">
            Hợp đồng chấm dứt trước hạn <b>không được hoàn tiền đặt cọc</b>
            {isMutual
              ? '. Sau ngày hiệu lực, tài khoản người đại diện chuyển sang ngưng hoạt động (vẫn thuê lại được về sau).'
              : '. Sau ngày hiệu lực, tài khoản người đại diện bị khóa và không tạo được hợp đồng mới.'}
          </Alert>
        </Card>

        {/* cột phải: kết quả xử lý + ô xác nhận của khách */}
        <div className="flex flex-col gap-3">
          <TerminationOutcome termination={termination} />

          {canConfirm && (
            <Card>
              <Card.Body className="flex flex-col gap-3">
                <h2 className="h6 fw-bold mb-0 flex items-center gap-2">
                  <BiCheckShield className="text-secondary" />
                  Xác nhận điện tử
                </h2>
                <Form.Check
                  id="agree-termination"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  label="Tôi đã đọc và đồng ý toàn bộ nội dung đơn chấm dứt hợp đồng này"
                />
                <Button
                  variant="primary"
                  className="self-start flex items-center gap-2"
                  disabled={!agreed}
                  onClick={() => setModal('confirm')}
                >
                  <BiCheckShield />
                  Xác nhận chấm dứt
                </Button>
                <span className="small text-secondary">
                  Hệ thống lưu thời điểm, địa chỉ IP và mã xác thực của lần xác nhận này.
                </span>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>

      {/* Customer: popup xác nhận lần cuối */}
      {modal === 'confirm' && (
        <ConfirmModal
          show
          title="Xác nhận chấm dứt hợp đồng?"
          message={`Bạn đồng ý chấm dứt hợp đồng ${roomText.toLowerCase()} từ ngày ${formatDate(termination.effectiveDate)}. Hợp đồng chấm dứt trước hạn không được hoàn cọc. Sau khi xác nhận không thể hoàn tác.`}
          confirmText="Xác nhận điện tử"
          cancelText="Xem lại"
          loading={busy}
          onConfirm={() => runAction(() => terminationApi.confirm(termination._id), 'Đã xác nhận điện tử đơn chấm dứt')}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'approve' && (
        <ConfirmModal
          show
          title="Phê duyệt đơn đơn phương?"
          message={`Hợp đồng ${roomText.toLowerCase()} sẽ chấm dứt từ ngày ${formatDate(termination.effectiveDate)}. Người đại diện nhận thông báo kèm lý do vi phạm; tài khoản bị khóa sau ngày hiệu lực.`}
          confirmText="Phê duyệt"
          cancelText="Đóng"
          loading={busy}
          onConfirm={() => runAction(() => terminationApi.approve(termination._id), 'Đã phê duyệt đơn')}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'reject' && (
        <ReasonModal
          title="Từ chối đơn đơn phương"
          message="Hợp đồng giữ nguyên đang hiệu lực. Manager nhận thông báo kèm lý do."
          label="Lý do từ chối"
          placeholder="Vd: chưa đủ bằng chứng vi phạm"
          emptyMessage="Vui lòng nhập lý do từ chối đơn chấm dứt"
          confirmText="Từ chối đơn"
          loading={busy}
          onConfirm={(reason) => runAction(() => terminationApi.reject(termination._id, { reason }), 'Đã từ chối đơn')}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'cancel' && (
        <ReasonModal
          title="Hủy đơn chấm dứt"
          message="Hợp đồng giữ nguyên đang hiệu lực, người đại diện nhận thông báo đơn đã hủy. Muốn sửa nội dung thì hủy rồi tạo đơn mới."
          label="Lý do hủy"
          placeholder="Vd: nhập sai ngày hiệu lực"
          emptyMessage="Vui lòng nhập lý do hủy đơn chấm dứt"
          confirmText="Hủy đơn"
          loading={busy}
          onConfirm={(reason) => runAction(() => terminationApi.cancel(termination._id, { reason }), 'Đã hủy đơn')}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
};

export default TerminationDetailPage;
