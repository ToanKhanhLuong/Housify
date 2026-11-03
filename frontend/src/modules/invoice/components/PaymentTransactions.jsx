// UC-36 bước 3: dòng nhỏ trong dấu "Đã thanh toán" – mã giao dịch SePay + link "Xem biên lai" sang trang Thanh toán
// (hóa đơn = khoản phải trả, biên lai chi tiết như ngân hàng, nội dung chuyển khoản xem ở trang Thanh toán – UC-39)
// GET /payments chưa có ?invoiceId= → lấy theo khoảng ngày quanh ngày trả (lùi / tiến 1 ngày để không lệch múi giờ
// giữa giờ Việt Nam và giờ máy chủ) rồi lọc đúng giao dịch của hóa đơn này
import { useEffect, useState } from 'react';
import { BiChevronRight } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import { toDateInput } from '../../../utils/format';
import invoiceApi from '../invoice.api';

const DAY_MS = 24 * 60 * 60 * 1000;

const PaymentTransactions = ({ invoice, isManager }) => {
  const [codes, setCodes] = useState([]); // mã giao dịch SePay của hóa đơn (thường 1)

  useEffect(() => {
    if (!invoice.paidAt) return undefined;
    let ignore = false;
    const paidAt = new Date(invoice.paidAt).getTime();
    invoiceApi
      .payments({
        from: toDateInput(new Date(paidAt - DAY_MS)),
        to: toDateInput(new Date(paidAt + DAY_MS)),
        limit: 100,
      })
      .then((response) => {
        if (ignore) return;
        setCodes(
          (response.data?.items ?? [])
            .filter((payment) => String(payment.invoice?._id) === String(invoice._id))
            .map((payment) => payment.sepayTxnId),
        );
      })
      .catch(() => !ignore && setCodes([]));
    return () => {
      ignore = true;
    };
  }, [invoice._id, invoice.paidAt]);

  return (
    <div className="flex flex-col items-center gap-1 small">
      {codes.length > 0 && (
        <span>
          Mã GD: <span className="font-monospace fw-semibold">{codes.join(', ')}</span>
        </span>
      )}
      <Link to={isManager ? '/payments' : '/my-payments'} className="flex items-center gap-1">
        Xem biên lai
        <BiChevronRight />
      </Link>
    </div>
  );
};

export default PaymentTransactions;
