// UC-35 bước 2–3: xem lại trước khi gửi – các khoản, tổng tiền, hạn thanh toán (lúc gửi + 7 ngày). Xác nhận mới gửi
// Gửi xong hóa đơn bị khóa, muốn sửa phải hủy rồi lập lại
import { useState } from 'react';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import { BiSend } from 'react-icons/bi';
import MoneyText from '../../../components/MoneyText';
import { formatDate } from '../../../utils/format';
import { monthLabel, roomOf } from '../invoiceFormat';

const DUE_DAYS = 7; // BE: dueDate = lúc gửi + 7 ngày

const SendInvoiceModal = ({ invoice, show, sending, onConfirm, onCancel }) => {
  // hạn dự kiến tính một lần lúc mở trang (render phải thuần, không gọi Date.now mỗi lần vẽ)
  const [dueDate] = useState(() => new Date(Date.now() + DUE_DAYS * 24 * 60 * 60 * 1000));
  const room = roomOf(invoice);

  return (
    <Modal show={show} onHide={sending ? undefined : onCancel} centered backdrop="static">
      <Modal.Header closeButton={!sending}>
        <Modal.Title className="h5">Gửi hóa đơn {invoice.invoiceCode}?</Modal.Title>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        <div className="small text-secondary">
          Phòng {room?.roomNumber ?? '—'} · Kỳ {monthLabel(invoice.month)} · Gửi tới{' '}
          {invoice.contractId?.representativeEmail}
        </div>
        <ul className="list-unstyled mb-0 flex flex-col gap-1">
          {invoice.items.map((item, index) => (
            <li
              key={item.serviceId ?? `${item.type}-${index}`}
              className="flex justify-between gap-3"
            >
              <span>{item.description}</span>
              <MoneyText value={item.amount} className="tabular-nums" />
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-top pt-2 fw-bold fs-6">
          <span>Tổng cộng</span>
          <MoneyText value={invoice.totalAmount} />
        </div>
        <div>
          Hạn thanh toán: <b>{formatDate(dueDate)}</b> (7 ngày kể từ hôm nay)
        </div>
        <Alert variant="info" className="mb-0 small">
          Hệ thống sinh mã QR chuyển khoản, gửi thông báo và email cho khách. Đã gửi thì không sửa
          được, muốn sửa phải hủy rồi lập lại.
        </Alert>
      </Modal.Body>
      <Modal.Footer className="justify-content-start">
        <Button
          variant="primary"
          className="flex items-center gap-2"
          onClick={onConfirm}
          disabled={sending}
        >
          {sending ? <Spinner animation="border" size="sm" /> : <BiSend />}
          Gửi hóa đơn
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={sending}>
          Hủy
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SendInvoiceModal;
