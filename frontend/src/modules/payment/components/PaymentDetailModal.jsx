// UC-39 bước 3: bấm một biên lai → xem biên lai thanh toán (giống ảnh chụp chuyển khoản: số tiền, thời gian,
// ngân hàng, mã giao dịch SePay, nội dung chuyển khoản) và hóa đơn được trả. Khoản chi tiết xem ở trang hóa đơn
import { Alert, Button, Modal } from 'react-bootstrap';
import { BiCheckCircle, BiReceipt } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import FieldRow from '../../../components/FieldRow';
import MoneyText from '../../../components/MoneyText';
import { formatDate, formatDateTime } from '../../../utils/format';
import { monthLabel } from '../paymentFormat';
import OnTimeBadge from './OnTimeBadge';

const PaymentDetailModal = ({ payment, invoiceBasePath, onHide }) => {
  const navigate = useNavigate();
  const { invoice } = payment;
  // BE chưa so số tiền chuyển với tổng hóa đơn → FE nhắc để Manager / khách tự kiểm tra
  const amountMismatch = invoice && payment.amount !== invoice.totalAmount;

  return (
    <Modal show onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5">Biên lai thanh toán</Modal.Title>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        {/* đầu biên lai: đã nhận tiền, số tiền, thời gian */}
        <div className="flex flex-col items-center gap-1 text-center">
          <BiCheckCircle size={44} className="text-success" />
          <span className="fw-semibold text-success-emphasis">Thanh toán thành công</span>
          <span className="fs-3 fw-bold tabular-nums">
            <MoneyText value={payment.amount} />
          </span>
          <span className="small text-secondary">{formatDateTime(payment.paidAt)}</span>
          <OnTimeBadge label={payment.statusLabel} />
        </div>

        <div className="border-t border-dashed border-(color:--bs-border-color)" />

        <section>
          <h6 className="fw-bold mb-2">Giao dịch</h6>
          <FieldRow label="Mã giao dịch SePay">{payment.sepayTxnId}</FieldRow>
          <FieldRow label="Ngân hàng">{payment.bankName}</FieldRow>
          <FieldRow label="Nội dung chuyển khoản">
            <span className="break-words">{payment.transferContent}</span>
          </FieldRow>
        </section>

        {invoice ? (
          <section className="border-top pt-3">
            <h6 className="fw-bold mb-2">Cho hóa đơn</h6>
            <FieldRow label="Mã hóa đơn">{invoice.invoiceCode}</FieldRow>
            <FieldRow label="Phòng">{invoice.roomNumber || '—'}</FieldRow>
            <FieldRow label="Kỳ">{monthLabel(invoice.month)}</FieldRow>
            <FieldRow label="Tổng hóa đơn">
              <MoneyText value={invoice.totalAmount} />
            </FieldRow>
            <FieldRow label="Hạn thanh toán">{formatDate(invoice.dueDate)}</FieldRow>
          </section>
        ) : (
          <Alert variant="secondary" className="mb-0 small">
            Không tìm thấy hóa đơn của giao dịch này.
          </Alert>
        )}

        {amountMismatch && (
          <Alert variant="warning" className="mb-0 small">
            Số tiền chuyển khác tổng hóa đơn. Vui lòng kiểm tra lại với ngân hàng.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className="justify-content-start">
        {invoice && (
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => navigate(`${invoiceBasePath}/${invoice._id}`)}
          >
            <BiReceipt />
            Xem hóa đơn
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PaymentDetailModal;
