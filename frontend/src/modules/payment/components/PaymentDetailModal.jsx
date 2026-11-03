// UC-39 bước 3: bấm một giao dịch → xem giao dịch SePay (mã, ngày, số tiền, nội dung chuyển khoản) và hóa đơn được trả
// Các khoản chi tiết của hóa đơn xem ở trang chi tiết hóa đơn (nút "Xem hóa đơn")
import { Alert, Button, Modal } from 'react-bootstrap';
import { BiReceipt } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import FieldRow from '../../../components/FieldRow';
import MoneyText from '../../../components/MoneyText';
import StatusBadge from '../../../components/StatusBadge';
import { INVOICE_STATUS_LABEL } from '../../../constants/statusLabels';
import { formatDate, formatDateTime } from '../../../utils/format';
import { monthLabel } from '../paymentFormat';
import OnTimeBadge from './OnTimeBadge';

const PaymentDetailModal = ({ payment, invoiceBasePath, onHide }) => {
  const navigate = useNavigate();
  const { invoice } = payment;
  // BE chưa so số tiền chuyển với tổng hóa đơn → FE nhắc để Manager / khách tự kiểm tra
  const amountMismatch = invoice && payment.amount !== invoice.totalAmount;

  return (
    <Modal show onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="h5">Giao dịch {payment.sepayTxnId}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        <section>
          <h6 className="fw-bold mb-2">Giao dịch</h6>
          <FieldRow label="Mã giao dịch SePay">{payment.sepayTxnId}</FieldRow>
          <FieldRow label="Thời gian trả">{formatDateTime(payment.paidAt)}</FieldRow>
          <FieldRow label="Số tiền">
            <MoneyText value={payment.amount} className="fw-bold" />
          </FieldRow>
          <FieldRow label="Ngân hàng">{payment.bankName}</FieldRow>
          <FieldRow label="Nội dung chuyển khoản">
            <span className="break-words">{payment.transferContent}</span>
          </FieldRow>
          <FieldRow label="Tình trạng">
            <OnTimeBadge label={payment.statusLabel} />
          </FieldRow>
        </section>

        {invoice ? (
          <section className="border-top pt-3">
            <h6 className="fw-bold mb-2">Hóa đơn được thanh toán</h6>
            <FieldRow label="Mã hóa đơn">{invoice.invoiceCode}</FieldRow>
            <FieldRow label="Phòng">{invoice.roomNumber || '—'}</FieldRow>
            <FieldRow label="Kỳ">{monthLabel(invoice.month)}</FieldRow>
            <FieldRow label="Tổng hóa đơn">
              <MoneyText value={invoice.totalAmount} />
            </FieldRow>
            <FieldRow label="Hạn thanh toán">{formatDate(invoice.dueDate)}</FieldRow>
            <FieldRow label="Trạng thái">
              <StatusBadge map={INVOICE_STATUS_LABEL} value={invoice.status} />
            </FieldRow>
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
