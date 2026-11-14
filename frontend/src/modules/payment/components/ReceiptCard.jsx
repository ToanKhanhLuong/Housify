// Thẻ "biên lai" của một giao dịch SePay (UC-39): payment là biên lai đã chuyển tiền, khác hóa đơn (khoản phải trả)
// Trông như ảnh chụp chuyển khoản: dấu đã nhận, số tiền lớn, mã giao dịch, nội dung chuyển khoản; nét đứt như xé biên lai
import { BiCheckCircle, BiErrorCircle } from 'react-icons/bi';
import MoneyText from '../../../components/MoneyText';
import { formatDateTime } from '../../../utils/format';
import { monthLabel } from '../paymentFormat';
import OnTimeBadge from './OnTimeBadge';

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-3">
    <span className="text-secondary shrink-0">{label}</span>
    <span className="text-end min-w-0 truncate">{children}</span>
  </div>
);

const ReceiptCard = ({ payment, showRoom, onClick }) => {
  const { invoice } = payment;
  const isUnderpaid =
    payment.paymentStatus === 'UNDERPAID' ||
    (invoice && Number(payment.amount) < Number(invoice.totalAmount));
  const isOverpaid =
    payment.paymentStatus === 'OVERPAID' ||
    (invoice && Number(payment.amount) > Number(invoice.totalAmount));
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onClick()}
      className="hf-tcard p-0 overflow-hidden flex flex-col relative"
    >
      {/* Manager: số phòng to đậm ở góc trái trên để nhìn nhanh biên lai của phòng nào */}
      {showRoom && (
        <div className="absolute top-2 left-3 flex flex-col leading-none text-start">
          <span className="text-secondary" style={{ fontSize: '0.7rem' }}>
            Phòng
          </span>
          <span className="fs-4 fw-bold text-primary tabular-nums">
            {invoice?.roomNumber || '—'}
          </span>
        </div>
      )}

      {/* đầu biên lai: đã nhận tiền + số tiền */}
      <div className="flex flex-col items-center gap-1 px-3 pt-3 pb-2 text-center">
        {isUnderpaid || isOverpaid ? (
          <span className="flex items-center gap-1 small fw-semibold text-danger">
            <BiErrorCircle size={18} />
            {isUnderpaid ? 'Chưa đủ tiền' : 'Chuyển thừa'}
          </span>
        ) : (
          <span className="flex items-center gap-1 small fw-semibold text-success-emphasis">
            <BiCheckCircle size={18} />
            Đã nhận tiền
          </span>
        )}
        <span className="fs-4 fw-bold text-body tabular-nums">
          <MoneyText value={payment.amount} />
        </span>
        <span className="small text-secondary">{formatDateTime(payment.paidAt)}</span>
      </div>

      {/* nét đứt như chỗ xé biên lai */}
      <div className="mx-3 border-t border-dashed border-(color:--bs-border-color)" />

      <div className="flex flex-col gap-1 px-3 py-2 small">
        <Row label="Hóa đơn">{invoice?.invoiceCode ?? '—'}</Row>
        <Row label="Kỳ">{monthLabel(invoice?.month)}</Row>
        {showRoom && <Row label="Phòng">{invoice?.roomNumber || '—'}</Row>}
        <Row label="Ngân hàng">{payment.bankName}</Row>
        <Row label="Mã GD">{payment.sepayTxnId}</Row>
      </div>

      <div className="mt-auto px-3 py-2 border-top flex items-center justify-between gap-2 small">
        <span className="text-secondary truncate" title={payment.transferContent}>
          “{payment.transferContent}”
        </span>
        <OnTimeBadge label={payment.statusLabel} />
      </div>
    </div>
  );
};

export default ReceiptCard;
