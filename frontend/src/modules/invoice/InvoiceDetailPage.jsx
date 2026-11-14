// UC-36: chi tiết hóa đơn, khuôn trang chi tiết (PageHeader + StatusSteps + tờ giấy) như chi tiết tòa / phòng
// Manager (/invoices/:id) – nút theo trạng thái: Nháp → Gửi (UC-35, xem lại trước), Chỉnh sửa (UC-34), Hủy (UC-37)
//                                             Chờ thanh toán → Gửi lại thông báo (UC-35), Hủy (UC-37)
// Customer (/my-invoices/:id) – chỉ xem: mã QR khi chờ thanh toán, còn hạn / quá hạn, dấu "Đã thanh toán" (UC-36)
// Đã thanh toán (cả 2 vai trò): trong dấu "Đã thanh toán" có mã giao dịch SePay + link "Xem biên lai" (UC-36 bước 3)
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Image, Placeholder, Spinner } from 'react-bootstrap';
import { BiBell, BiCheck, BiEditAlt, BiSave, BiSend, BiXCircle } from 'react-icons/bi';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FieldRow from '../../components/FieldRow';
import MoneyText from '../../components/MoneyText';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import StatusSteps from '../../components/StatusSteps';
import { useAuth } from '../../context/AuthContext';
import { INVOICE_ITEM_TYPE, INVOICE_STATUS, ROLE } from '../../constants/enums';
import { INVOICE_STATUS_LABEL } from '../../constants/statusLabels';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { formatDate, formatDateTime } from '../../utils/format';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import invoiceApi from './invoice.api';
import { validateInvoiceItems } from './invoice.validate';
import { dueStatus, monthLabel, roomOf } from './invoiceFormat';
import { toDraftItems, toPayloadItems } from './invoiceItems';
import CancelInvoiceModal from './components/CancelInvoiceModal';
import InvoiceItemsTable from './components/InvoiceItemsTable';
import PaymentTransactions from './components/PaymentTransactions';
import SendInvoiceModal from './components/SendInvoiceModal';

// Customer không thấy nháp nên thanh trạng thái bắt đầu từ Chờ thanh toán. Đã hủy tự hiện ở cuối (StatusSteps)
const MANAGER_STEPS = [INVOICE_STATUS.DRAFT, INVOICE_STATUS.PENDING, INVOICE_STATUS.PAID];
const CUSTOMER_STEPS = [INVOICE_STATUS.PENDING, INVOICE_STATUS.PAID];

// ô "Đã thanh toán": nền xanh lá nhạt, dấu ✓ lớn chìm sau chữ (cùng kiểu ô xác nhận điện tử của hợp đồng)
// children: dòng mã giao dịch + link "Xem biên lai" (UC-36 bước 3)
const PaidStamp = ({ invoice, children }) => {
  const { text, variant } = dueStatus(invoice);
  return (
    <div className="relative overflow-hidden rounded border border-success bg-success-subtle px-4 py-4 text-center">
      <BiCheck
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-32 text-success opacity-25"
      />
      <div className="relative flex flex-col gap-1">
        <span className="h5 fw-bold text-uppercase text-success-emphasis mb-0">Đã thanh toán</span>
        <span className="small">Lúc {formatDateTime(invoice.paidAt)}</span>
        <span className={`small fw-semibold text-${variant}-emphasis`}>{text}</span>
        {children}
      </div>
    </div>
  );
};

// mã QR VietQR (link ảnh img.vietqr.io do BE sinh lúc gửi) – app ngân hàng điền sẵn số tiền và nội dung
const PaymentQr = ({ invoice, isManager }) => (
  <div className="flex flex-col items-center gap-2 rounded border px-3 py-3 text-center">
    <span className="fw-semibold">
      {isManager ? 'Mã QR đã gửi cho khách' : 'Quét mã để thanh toán'}
    </span>
    {invoice.qrContent ? (
      <Image
        src={invoice.qrContent}
        alt={`Mã QR thanh toán hóa đơn ${invoice.invoiceCode}`}
        className="w-full max-w-64"
      />
    ) : (
      <div className="hf-ph w-full h-48">Chưa có mã QR</div>
    )}
    <div className="small">
      Số tiền{' '}
      <b>
        <MoneyText value={invoice.totalAmount} />
      </b>
      <br />
      Nội dung chuyển khoản <b className="font-mono">{invoice.invoiceCode}</b>
    </div>
    <div className="small text-secondary">
      Giữ nguyên nội dung để hệ thống tự ghi nhận thanh toán.
    </div>
  </div>
);

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isManager = user.role === ROLE.MANAGER;
  const basePath = isManager ? '/invoices' : '/my-invoices';

  // trạng thái tải: loading → ok | notFound | error
  const [state, setState] = useState({ status: 'loading', invoice: null, error: '' });
  const [editing, setEditing] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(''); // 'save' | 'send' | 'resend' | 'cancel'
  const [modal, setModal] = useState(null); // 'send' | 'cancel'

  const invoice = state.invoice;

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadInvoice = useCallback(
    (silent = false) =>
      invoiceApi
        .detail(id)
        .then((response) => setState({ status: 'ok', invoice: response.data, error: '' }))
        .catch((error) => {
          if (silent) return;
          setState({
            status: error.status === 404 || error.status === 403 ? 'notFound' : 'error',
            invoice: null,
            error: error.message,
          });
        }),
    [id],
  );

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // Tự động kiểm tra trạng thái ngầm mỗi 5 giây (khi đang mở chi tiết mà không đang sửa/mở modal)
  const currentStatus = state.invoice?.status;
  useAutoRefresh(
    () =>
      invoiceApi.detail(id).then((response) => {
        const latest = response.data;
        if (!latest) return;
        setState((prev) => {
          if (
            prev.invoice?.status === INVOICE_STATUS.PENDING &&
            latest.status === INVOICE_STATUS.PAID
          ) {
            toast.success(`Hóa đơn ${latest.invoiceCode} đã được thanh toán`);
          }
          return { status: 'ok', invoice: latest, error: '' };
        });
      }),
    {
      enabled:
        state.status === 'ok' &&
        (currentStatus === INVOICE_STATUS.DRAFT || currentStatus === INVOICE_STATUS.PENDING) &&
        !editing &&
        !modal &&
        !busy,
    },
  );

  const handleRetry = () => {
    setState({ status: 'loading', invoice: null, error: '' });
    loadInvoice();
  };

  // giữ phần populate (phòng, tòa) khi API sửa / gửi trả hóa đơn chưa populate
  const mergeInvoice = (next) =>
    setState((current) => ({
      ...current,
      invoice: { ...current.invoice, ...next, contractId: current.invoice.contractId },
    }));

  // 409: hóa đơn vừa bị thao tác khác đổi → báo và tải lại
  const handleActionError = (error) => {
    if (error.status === 409) {
      toast.warning(error.message);
      loadInvoice();
    } else {
      toast.error(error.message);
    }
  };

  const startEditing = () => {
    setDraftItems(toDraftItems(invoice.items));
    setErrors({});
    setEditing(true);
  };

  // UC-34: lưu nháp. Lỗi từng dòng hiện dưới ô (khóa items.0.newReading giống BE)
  const handleSave = async () => {
    const clientErrors = validateInvoiceItems(draftItems);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setBusy('save');
    try {
      const response = await invoiceApi.update(invoice._id, { items: toPayloadItems(draftItems) });
      const { warnings = [], ...updated } = response.data;
      mergeInvoice(updated);
      setEditing(false);
      toast.success('Cập nhật hóa đơn thành công');
      warnings.forEach((warning) => toast.warning(warning));
      loadInvoice(true);
    } catch (error) {
      if (error.errors) setErrors(toFieldErrors(error.errors));
      else handleActionError(error);
    } finally {
      setBusy('');
    }
  };

  // UC-35: gửi → Chờ thanh toán, có QR. Gửi thông báo lỗi thì hóa đơn vẫn chuyển, hiện cảnh báo để gửi lại
  const handleSend = async () => {
    setBusy('send');
    try {
      const response = await invoiceApi.send(invoice._id);
      const { warning, ...sent } = response.data;
      mergeInvoice(sent);
      setModal(null);
      if (warning) toast.warning(warning);
      else toast.success('Đã gửi hóa đơn thành công');
    } catch (error) {
      setModal(null);
      handleActionError(error);
    } finally {
      setBusy('');
    }
  };

  const handleResend = async () => {
    setBusy('resend');
    try {
      const response = await invoiceApi.resendNotification(invoice._id);
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Đã gửi lại thông báo cho khách');
    } catch (error) {
      handleActionError(error);
    } finally {
      setBusy('');
    }
  };

  // UC-37: hủy, lý do bắt buộc
  const handleCancel = async (reason) => {
    setBusy('cancel');
    try {
      const response = await invoiceApi.cancel(invoice._id, { reason });
      mergeInvoice(response.data);
      setModal(null);
      toast.success('Hủy hóa đơn thành công');
    } catch (error) {
      setModal(null);
      handleActionError(error);
    } finally {
      setBusy('');
    }
  };

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải hóa đơn">
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
    return <EmptyState message={state.error || 'Không tìm thấy hóa đơn.'} />;
  }

  if (state.status === 'error') {
    return (
      <ErrorState message="Không tải được hóa đơn" detail={state.error} onRetry={handleRetry} />
    );
  }

  const { status } = invoice;
  const isDraft = status === INVOICE_STATUS.DRAFT;
  const isPending = status === INVOICE_STATUS.PENDING;
  const isPaid = status === INVOICE_STATUS.PAID;
  const isCancelled = status === INVOICE_STATUS.CANCELLED;
  const room = roomOf(invoice);
  const building = room?.buildingId; // chi tiết populate cả tòa
  const due = dueStatus(invoice);
  const rentItem = invoice.items.find((item) => item.type === INVOICE_ITEM_TYPE.RENT);

  const renderActions = () => {
    if (!isManager) return null;
    if (editing) {
      return (
        <>
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={handleSave}
            disabled={busy === 'save'}
          >
            {busy === 'save' ? <Spinner animation="border" size="sm" /> : <BiSave />}
            Lưu
          </Button>
          <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy === 'save'}>
            Hủy sửa
          </Button>
        </>
      );
    }
    return (
      <>
        {isDraft && (
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => setModal('send')}
          >
            <BiSend />
            Gửi hóa đơn
          </Button>
        )}
        {isPending && (
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={handleResend}
            disabled={busy === 'resend'}
          >
            {busy === 'resend' ? <Spinner animation="border" size="sm" /> : <BiBell />}
            Gửi lại thông báo
          </Button>
        )}
        {isDraft && (
          <Button variant="secondary" className="flex items-center gap-2" onClick={startEditing}>
            <BiEditAlt />
            Chỉnh sửa
          </Button>
        )}
        {(isDraft || isPending) && (
          <Button
            variant="secondary"
            className="flex items-center gap-2"
            onClick={() => setModal('cancel')}
          >
            <BiXCircle />
            Hủy hóa đơn
          </Button>
        )}
      </>
    );
  };

  return (
    <>
      <PageHeader
        backTo={basePath}
        breadcrumbs={[{ label: 'Hóa đơn', to: basePath }, invoice.invoiceCode]}
        actions={renderActions()}
      >
        <StatusSteps
          map={INVOICE_STATUS_LABEL}
          steps={isManager ? MANAGER_STEPS : CUSTOMER_STEPS}
          current={status}
        />
      </PageHeader>

      <Card className="hf-paper">
        {/* định danh: kỳ, mã hóa đơn, trạng thái, tình trạng hạn */}
        <div className="flex flex-col gap-1">
          <span className="small text-secondary">
            Hóa đơn tiền phòng · Kỳ {monthLabel(invoice.month)}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <h1 className="h3 fw-bold mb-0 font-mono">{invoice.invoiceCode}</h1>
            <StatusBadge map={INVOICE_STATUS_LABEL} value={status} />
            {(isPending || isPaid) && (
              <span
                className={`badge rounded-pill bg-${due.variant}-subtle text-${due.variant}-emphasis`}
              >
                {due.text}
              </span>
            )}
          </span>
        </div>

        {isCancelled && (
          <Alert variant="secondary" className="mb-0">
            <span className="fw-semibold">Hóa đơn đã hủy.</span> Lý do:{' '}
            {invoice.cancelReason || '—'}
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 column-gap-5">
          <div>
            <FieldRow label="Phòng" required>
              {room ? `Phòng ${room.roomNumber} · Tầng ${room.floorNumber}` : '—'}
            </FieldRow>
            {building?.name && <FieldRow label="Tòa nhà" required>{building.name}</FieldRow>}
            {isManager && (
              <FieldRow label="Gửi tới" required>{invoice.contractId?.representativeEmail}</FieldRow>
            )}
            <FieldRow label="Kỳ hóa đơn" required>Tháng {monthLabel(invoice.month)}</FieldRow>
          </div>
          <div>
            {isManager && <FieldRow label="Ngày lập" required>{formatDateTime(invoice.createdAt)}</FieldRow>}
            <FieldRow label="Ngày gửi" required>
              {invoice.sentAt ? formatDateTime(invoice.sentAt) : 'Chưa gửi'}
            </FieldRow>
            <FieldRow label="Hạn thanh toán" required>
              {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
            </FieldRow>
            {isPaid && (
              <FieldRow label="Ngày thanh toán">{formatDateTime(invoice.paidAt)}</FieldRow>
            )}
          </div>
        </div>

        {/* các khoản bên trái; QR / dấu đã thanh toán bên phải */}
        <div className={`grid gap-4 ${isPending || isPaid ? 'lg:grid-cols-3' : ''}`}>
          <div className={isPending || isPaid ? 'lg:col-span-2' : ''}>
            <h2 className="h6 fw-bold mb-2">Các khoản thu</h2>
            <InvoiceItemsTable
              rentItem={editing ? rentItem : null}
              items={editing ? draftItems : invoice.items}
              editing={editing}
              onChange={setDraftItems}
              errors={errors}
              disabled={busy === 'save'}
            />
          </div>
          {isPending && <PaymentQr invoice={invoice} isManager={isManager} />}
          {isPaid && (
            // căn giữa theo chiều dọc so với bảng các khoản thu (màn hình lớn, 2 cột)
            <div className="lg:self-center">
              <PaidStamp invoice={invoice}>
                {/* UC-36 bước 3: mã giao dịch SePay + link sang biên lai */}
                <PaymentTransactions invoice={invoice} isManager={isManager} />
              </PaidStamp>
            </div>
          )}
        </div>
      </Card>

      <SendInvoiceModal
        invoice={invoice}
        show={modal === 'send'}
        sending={busy === 'send'}
        onConfirm={handleSend}
        onCancel={() => setModal(null)}
      />
      {modal === 'cancel' && (
        <CancelInvoiceModal
          invoice={invoice}
          show
          loading={busy === 'cancel'}
          onConfirm={handleCancel}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
};

export default InvoiceDetailPage;
