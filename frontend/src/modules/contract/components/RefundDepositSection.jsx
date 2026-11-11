// UC-45 (Manager): khung "Hoàn cọc" ở chi tiết hợp đồng Đã kết thúc
// GET refund-preview: đủ điều kiện (hết hạn tự nhiên, không có đơn chấm dứt đã xác nhận, chưa hoàn) → số tiền cọc,
// cảnh báo hóa đơn chưa trả (vẫn cho hoàn), nút Hoàn cọc → popup xác nhận → POST refund-deposit (mail báo khách)
// Không đủ điều kiện / đã hoàn → BE trả 400 kèm lý do, khung hiện đúng câu đó
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadPreview = useCallback(
    () =>
      contractApi
        .refundPreview(contractId)
        .then((response) => setState({ status: 'ok', preview: response.data, message: '' }))
        .catch((error) => {
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
    setBusy(true);
    try {
      const response = await contractApi.refundDeposit(contractId);
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success(response.message || 'Đã xác nhận hoàn cọc');
      setShowConfirm(false);
      setState({
        status: 'done',
        preview: null,
        message: `Đã hoàn ${formatMoney(response.data?.deposit)} tiền cọc lúc ${formatDateTime(response.data?.depositRefundedAt)}.`,
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
      const refunded = state.status === 'done' || state.message.includes('đã được hoàn cọc');
      return (
        <Alert variant={refunded ? 'success' : 'secondary'} className="mb-0 flex items-center gap-2">
          {refunded && <BiCheckCircle size={20} />}
          {state.message}
        </Alert>
      );
    }

    const { preview } = state;
    const deposit = Number(preview.deposit || 0);
    const debt = Number(preview.pendingInvoiceTotal || 0);
    const deducted = Math.min(deposit, debt);
    const netRefund = Math.max(0, deposit - debt);
    const extraCollect = Math.max(0, debt - deposit);
    const isDebtExceedingDeposit = debt > deposit;

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
              {debt > 0 ? <>- <MoneyText value={debt} /></> : '0 đ'}
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
                ⚠️ Công nợ vượt quá tiền cọc! Cần thu thêm từ khách:
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
            <div className="mt-1">
              {isDebtExceedingDeposit ? (
                <>
                  Đã khấu trừ toàn bộ <strong>{formatMoney(deducted)}</strong> tiền cọc nhưng vẫn còn thiếu{' '}
                  <strong>{formatMoney(extraCollect)}</strong>. Vui lòng yêu cầu khách thanh toán thêm số tiền còn thiếu trước khi xác nhận!
                </>
              ) : (
                <>
                  Gợi ý khấu trừ <strong>{formatMoney(deducted)}</strong> vào tiền cọc và hoàn trả khách{' '}
                  <strong>{formatMoney(netRefund)}</strong> (hoặc yêu cầu khách thanh toán hết hóa đơn để nhận đủ{' '}
                  {formatMoney(deposit)}).
                </>
              )}
            </div>
          </Alert>
        )}
        <Button variant="primary" className="self-start flex items-center gap-2" onClick={() => setShowConfirm(true)}>
          <BiWallet />
          Xác nhận hoàn cọc
        </Button>
      </>
    );
  };

  if (state.status === 'unavailable') return null;

  const confirmMessage = (() => {
    if (!state.preview) return '';
    const deposit = Number(state.preview.deposit || 0);
    const debt = Number(state.preview.pendingInvoiceTotal || 0);
    const netRefund = Math.max(0, deposit - debt);
    const extraCollect = Math.max(0, debt - deposit);
    if (debt === 0) {
      return `Xác nhận bạn đã trả lại khách ${formatMoney(deposit)} tiền cọc bằng tiền mặt. Mỗi hợp đồng chỉ hoàn một lần; hệ thống gửi thông báo và email cho người đại diện.`;
    }
    if (extraCollect > 0) {
      return `Khách nợ ${formatMoney(debt)} (vượt tiền cọc ${formatMoney(deposit)}). Sau khi cấn trừ toàn bộ cọc (hoàn 0 đ), khách cần đóng thêm ${formatMoney(extraCollect)}. Xác nhận đã tất toán bàn giao cọc cho hợp đồng này?`;
    }
    return `Tiền cọc gốc ${formatMoney(deposit)}, khấu trừ nợ hóa đơn ${formatMoney(debt)} → Số tiền thực trả lại khách là ${formatMoney(netRefund)}. Xác nhận hoàn tất thủ tục hoàn cọc?`;
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
