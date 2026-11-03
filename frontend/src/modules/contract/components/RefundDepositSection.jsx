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
  // loading → ok (đủ điều kiện) | blocked (BE trả lý do) | done (vừa hoàn) | error | unavailable (BE chưa có API → ẩn)
  const [state, setState] = useState({ status: 'loading', preview: null, message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadPreview = useCallback(
    () =>
      contractApi
        .refundPreview(contractId)
        .then((response) => setState({ status: 'ok', preview: response.data, message: '' }))
        .catch((error) => {
          // 404 "Không tìm thấy đường dẫn …": route hoàn cọc chưa bật ở BE (chờ gộp) → ẩn khung
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
    return (
      <>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-secondary">Tiền cọc cần trả lại khách:</span>
          <span className="fs-4 fw-bold">
            <MoneyText value={preview.deposit} />
          </span>
        </div>
        {preview.hasPendingInvoices && (
          <Alert variant="warning" className="mb-0 small">
            <div className="fw-semibold mb-1">{preview.warning}</div>
            <ul className="mb-0 ps-3">
              {preview.pendingInvoices.map((invoice) => (
                <li key={invoice._id}>
                  <Link to={`/invoices/${invoice._id}`}>{invoice.invoiceCode}</Link> · kỳ {monthLabel(invoice.month)}{' '}
                  · <MoneyText value={invoice.totalAmount} /> · hạn {formatDate(invoice.dueDate)}
                </li>
              ))}
            </ul>
            <div className="mt-1">Vẫn hoàn cọc được; hãy thu các hóa đơn này với khách.</div>
          </Alert>
        )}
        <Button variant="primary" className="self-start flex items-center gap-2" onClick={() => setShowConfirm(true)}>
          <BiWallet />
          Hoàn cọc
        </Button>
      </>
    );
  };

  if (state.status === 'unavailable') return null;

  return (
    <Card className="print:hidden">
      <Card.Body className="flex flex-col gap-2">
        <h2 className="h6 fw-bold mb-0 flex items-center gap-2">
          <BiWallet className="text-secondary" />
          Hoàn cọc
        </h2>
        {renderBody()}
      </Card.Body>

      {showConfirm && state.preview && (
        <ConfirmModal
          show
          title="Xác nhận đã hoàn cọc?"
          message={`Xác nhận bạn đã trả lại khách ${formatMoney(state.preview.deposit)} tiền cọc bằng tiền mặt. Mỗi hợp đồng chỉ hoàn một lần; hệ thống gửi thông báo và email cho người đại diện.`}
          confirmText="Đã hoàn cọc"
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
