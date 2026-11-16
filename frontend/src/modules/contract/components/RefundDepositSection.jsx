// UC-45 (Manager): khung "Hoàn cọc / Quyết toán" ở chi tiết hợp đồng Đã kết thúc
// GET refund-preview: đủ điều kiện (hết hạn tự nhiên, không có đơn chấm dứt đã xác nhận, chưa hoàn) → bảng cấn trừ cọc & công nợ,
// tự động khóa nút khi công nợ vượt cọc (chỉ mở khi khách thanh toán bớt qua QR hoặc Manager tick xác nhận đã thu thêm đủ tiền mặt).
// POST refund-deposit: tất toán đồng bộ hóa đơn PENDING → PAID trong cùng transaction, ghi nhận hoàn cọc & gửi mail đúng số thực trả.
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { BiCheckCircle, BiWallet } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ConfirmModal from '../../../components/ConfirmModal';
import MoneyText from '../../../components/MoneyText';
import SkeletonRows from '../../../components/SkeletonRows';
import { formatDate, formatDateTime, formatMoney } from '../../../utils/format';
import contractApi from '../contract.api';

const monthLabel = (month) => (month ? month.split('-').reverse().join('/') : '—');

const RefundDepositSection = ({ contractId }) => {
  // loading → ok (đủ điều kiện) | blocked (BE trả lý do) | done (vừa hoàn) | error | unavailable (máy chủ không có API → ẩn)
  const [state, setState] = useState({ status: 'loading', preview: null, message: '' });
  const [extraCashConfirmed, setExtraCashConfirmed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadPreview = useCallback(
    () =>
      contractApi
        .refundPreview(contractId)
        .then((response) => {
          setExtraCashConfirmed(false);
          setState({ status: 'ok', preview: response.data, message: '' });
        })
        .catch((error) => {
          setExtraCashConfirmed(false);
          // 404 "Không tìm thấy đường dẫn …": máy chủ không có API hoàn cọc → ẩn khung
          const missingRoute = error.status === 404 && Boolean(error.message?.includes('đường dẫn'));
          const status = missingRoute ? 'unavailable' : error.status === 400 ? 'blocked' : 'error';
          setState({ status, preview: null, message: error.message });
        }),
    [contractId],
  );

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleRefund = async () => {
    const previewDebt = Number(state.preview?.pendingInvoiceTotal || 0);
    const previewDeposit = Number(state.preview?.deposit || 0);
    const isExtraRequired = previewDebt > previewDeposit;

    setBusy(true);
    try {
      const response = await contractApi.refundDeposit(contractId, {
        confirmExtraCollected: isExtraRequired ? extraCashConfirmed : false,
      });
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success(response.message || 'Đã xác nhận quyết toán hoàn cọc');

      setShowConfirm(false);
      setExtraCashConfirmed(false);

      const data = response.data || {};
      const settledCount = Number(data.settledInvoiceCount || 0);
      const settledTotal = Number(data.settledInvoiceTotal || 0);
      const resDeposit = Number(data.deposit || 0);
      const resDeducted = Number(data.deductedAmount || 0);
      const resNetRefund = Number(data.netRefundAmount || 0);
      const resExtra = Number(data.extraCollectAmount || 0);
      const timeText = formatDateTime(data.depositRefundedAt);

      let doneMessage = `Đã hoàn ${formatMoney(resDeposit)} tiền cọc lúc ${timeText}.`;
      if (settledCount > 0 && resExtra > 0) {
        doneMessage = `Đã quyết toán ${settledCount} hóa đơn (${formatMoney(settledTotal)}) bằng toàn bộ ${formatMoney(resDeposit)} tiền cọc và thu thêm ${formatMoney(resExtra)} tiền mặt lúc ${timeText}. Số tiền hoàn trả khách: 0 đ.`;
      } else if (settledCount > 0) {
        doneMessage = `Đã khấu trừ ${formatMoney(resDeducted)} từ tiền cọc để tất toán ${settledCount} hóa đơn và hoàn trả ${formatMoney(resNetRefund)} tiền mặt cho khách lúc ${timeText}.`;
      }

      setState({
        status: 'done',
        preview: null,
        message: doneMessage,
      });
    } catch (error) {
      toast.error(error.message);
      setShowConfirm(false);
      loadPreview();
    } finally {
      setBusy(false);
    }
  };

  const renderBody = () => {
    if (state.status === 'loading') return <SkeletonRows rows={2} columns={2} />;
    if (state.status === 'error') {
      return <span className="small text-secondary">Không kiểm tra được hoàn cọc: {state.message}</span>;
    }
    if (state.status === 'blocked' || state.status === 'done') {
      const refunded =
        state.status === 'done' ||
        state.message.includes('đã được hoàn cọc') ||
        state.message.includes('Đã quyết toán') ||
        state.message.includes('Đã khấu trừ');
      return (
        <Alert variant={refunded ? 'success' : 'secondary'} className="mb-0 flex items-center gap-2">
          {refunded && <BiCheckCircle size={20} className="shrink-0" />}
          <span>{state.message}</span>
        </Alert>
      );
    }

    const { preview } = state;
    const deposit = Number(preview.deposit || 0);
    const debt = Number(preview.pendingInvoiceTotal || 0);
    const deducted = Number(preview.deductedAmount ?? Math.min(deposit, debt));
    const netRefund = Number(preview.netRefundAmount ?? Math.max(0, deposit - debt));
    const extraCollect = Number(preview.extraCollectAmount ?? Math.max(0, debt - deposit));
    const isDebtExceedingDeposit = extraCollect > 0;
    const submitDisabled = isDebtExceedingDeposit && !extraCashConfirmed;

    return (
      <>
        {/* Bảng tính quyết toán tiền cọc & cấn trừ công nợ */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-secondary">Tiền đặt cọc gốc lúc ký:</span>
            <span className="fw-semibold text-slate-800">
              <MoneyText value={deposit} />
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-secondary">
              Công nợ hóa đơn chưa thanh toán ({preview.pendingInvoiceCount || 0} hóa đơn):
            </span>
            <span className={`fw-semibold ${debt > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
              {debt > 0 ? (
                <>
                  - <MoneyText value={debt} />
                </>
              ) : (
                '0 đ'
              )}
            </span>
          </div>

          <div className="border-t border-slate-200 pt-2 mt-0.5 flex flex-wrap items-center justify-between gap-2">
            <span className="fw-bold text-slate-800">
              {debt > 0 ? 'Số tiền thực hoàn trả khách (sau cấn trừ):' : 'Số tiền cọc hoàn trả khách:'}
            </span>
            <span className={`fs-5 fw-bold ${netRefund > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
              <MoneyText value={netRefund} />
            </span>
          </div>

          {isDebtExceedingDeposit && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 flex items-center justify-between gap-2 text-rose-700">
              <span className="fw-bold text-xs">
                Công nợ vượt quá tiền cọc! Cần thu thêm từ khách:
              </span>
              <span className="fs-6 fw-bold">
                + <MoneyText value={extraCollect} />
              </span>
            </div>
          )}
        </div>

        {preview.hasPendingInvoices && (
          <Alert variant={isDebtExceedingDeposit ? 'danger' : 'warning'} className="mb-0 small">
            <div className="fw-semibold mb-1">{preview.warning}</div>
            <ul className="mb-0 ps-3">
              {preview.pendingInvoices.map((invoice) => (
                <li key={invoice._id}>
                  <Link to={`/invoices/${invoice._id}`}>{invoice.invoiceCode}</Link> · kỳ {monthLabel(invoice.month)}{' '}
                  · <MoneyText value={invoice.totalAmount} /> · hạn {formatDate(invoice.dueDate)}
                </li>
              ))}
            </ul>
            <div className="mt-2">
              {isDebtExceedingDeposit ? (
                <>
                  Đã khấu trừ toàn bộ <strong>{formatMoney(deducted)}</strong> tiền cọc nhưng vẫn còn thiếu{' '}
                  <strong>{formatMoney(extraCollect)}</strong>. Nút hoàn tất đang tạm khóa — vui lòng yêu cầu khách
                  thanh toán bớt qua QR hoặc thu đủ số tiền mặt còn thiếu và xác nhận bên dưới.
                </>
              ) : (
                <>
                  Khi xác nhận, hệ thống sẽ khấu trừ <strong>{formatMoney(deducted)}</strong> từ tiền cọc để tự động
                  tất toán các hóa đơn trên và ghi nhận hoàn trả khách <strong>{formatMoney(netRefund)}</strong>.
                </>
              )}
            </div>
          </Alert>
        )}

        {isDebtExceedingDeposit && (
          <Form.Check
            type="checkbox"
            id={`confirm-extra-cash-${contractId}`}
            checked={extraCashConfirmed}
            onChange={(event) => setExtraCashConfirmed(event.target.checked)}
            label={`Tôi xác nhận đã thu thêm đủ ${formatMoney(extraCollect)} tiền mặt từ khách`}
            className="small fw-medium text-slate-800"
          />
        )}

        <Button
          variant="primary"
          className="self-start flex items-center gap-2"
          disabled={submitDisabled}
          onClick={() => setShowConfirm(true)}
        >
          <BiWallet />
          {debt > 0 ? 'Xác nhận quyết toán & hoàn cọc' : 'Xác nhận hoàn cọc'}
        </Button>
      </>
    );
  };

  if (state.status === 'unavailable') return null;

  const confirmMessage = (() => {
    if (!state.preview) return '';
    const deposit = Number(state.preview.deposit || 0);
    const debt = Number(state.preview.pendingInvoiceTotal || 0);
    const netRefund = Number(state.preview.netRefundAmount ?? Math.max(0, deposit - debt));
    const extraCollect = Number(state.preview.extraCollectAmount ?? Math.max(0, debt - deposit));
    const count = Number(state.preview.pendingInvoiceCount || 0);

    if (debt === 0) {
      return `Xác nhận bạn đã trả lại khách ${formatMoney(deposit)} tiền cọc bằng tiền mặt. Mỗi hợp đồng chỉ hoàn một lần; hệ thống gửi thông báo và email cho người đại diện.`;
    }
    if (extraCollect > 0) {
      return `Bạn đã xác nhận thu thêm đủ ${formatMoney(extraCollect)} tiền mặt từ khách. Hệ thống sẽ giữ toàn bộ ${formatMoney(deposit)} tiền cọc, đánh dấu Đã thanh toán cho ${count} hóa đơn (tổng ${formatMoney(debt)}) và ghi nhận hoàn trả khách 0 đ. Xác nhận hoàn tất?`;
    }
    return `Tiền cọc gốc ${formatMoney(deposit)}, khấu trừ ${formatMoney(debt)} để đánh dấu Đã thanh toán cho ${count} hóa đơn → Số tiền thực hoàn trả khách là ${formatMoney(netRefund)}. Xác nhận hoàn tất?`;
  })();

  return (
    <Card className="print:hidden">
      <Card.Body className="flex flex-col gap-2">
        <h2 className="h6 fw-bold mb-0 flex items-center gap-2">
          <BiWallet className="text-secondary" />
          Quyết toán & Hoàn trả tiền đặt cọc
        </h2>
        {renderBody()}
      </Card.Body>

      {showConfirm && state.preview && (
        <ConfirmModal
          show
          title="Xác nhận quyết toán & hoàn cọc?"
          message={confirmMessage}
          confirmText="Đã hoàn tất"
          cancelText="Đóng"
          loading={busy}
          onConfirm={handleRefund}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </Card>
  );
};

export default RefundDepositSection;
