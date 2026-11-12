// UC-39: Trang chi tiết biên lai thanh toán (dạng văn bản biên lai/hóa đơn in thực tế chuẩn chỉnh)
// Có thể in trực tiếp hoặc lưu file PDF qua nút "In biên lai / Tải PDF"
// Tuân thủ quy ước: "Xác nhận điện tử", không ghi chữ ký số
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { BiArrowBack, BiPrinter, BiReceipt } from 'react-icons/bi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';
import { moneyInWords } from '../../utils/moneyInWords';
import invoiceApi from '../invoice/invoice.api';
import paymentApi from './payment.api';
import { monthLabel } from './paymentFormat';
import OnTimeBadge from './components/OnTimeBadge';

// Định dạng thứ ngày tiếng Việt, ví dụ: "Thứ Ba, 10/11/2026"
const formatVietnameseDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
};

// Định dạng số lượng và đơn vị tính của khoản thu
const formatItemQuantity = (item) => {
  if (item.type === 'RENT') return '1 tháng';
  const desc = (item.description || '').toLowerCase();
  if (item.type === 'METERED') {
    if (desc.includes('điện')) return `${item.quantity} kWh`;
    if (desc.includes('nước')) return `${item.quantity} m³`;
    return `${item.quantity}`;
  }
  if (item.type === 'PER_OCCUPANT') return `${item.quantity} người`;
  if (item.type === 'FIXED') return `${item.quantity} phòng`;
  return `${item.quantity || 1}`;
};

const PaymentDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user.role === ROLE.MANAGER;
  const basePath = isManager ? '/payments' : '/my-payments';
  const invoiceBasePath = isManager ? '/invoices' : '/my-invoices';

  // Khởi tạo từ state nếu được truyền từ trang trước, sau đó tải dữ liệu mới nhất
  const [payment, setPayment] = useState(location.state?.payment || null);
  const [loading, setLoading] = useState(!location.state?.payment);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentApi
      .detail(id)
      .then((res) => {
        setPayment(res.data);
        setLoading(false);
      })
      .catch((err) => {
        // Fallback: Nếu không tìm thấy payment hoặc endpoint chưa có, thử tải qua invoiceApi nếu id là invoiceId
        invoiceApi
          .detail(id)
          .then((invRes) => {
            const inv = invRes.data;
            setPayment({
              _id: id,
              amount: inv.totalAmount,
              paidAt: inv.paidAt,
              sepayTxnId: inv.invoiceCode,
              statusLabel: 'Đã thanh toán',
              invoice: inv,
            });
            setLoading(false);
          })
          .catch(() => {
            setError(err.message || 'Không thể tải chi tiết biên lai thanh toán');
            setLoading(false);
          });
      });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-secondary">
        <Spinner animation="border" className="mb-3 text-[#714b67]" />
        <span>Đang tải thông tin biên lai...</span>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <ErrorState
          title="Không tìm thấy biên lai thanh toán"
          description={error || 'Biên lai không tồn tại hoặc bạn không có quyền xem.'}
          onRetry={() => navigate(invoiceBasePath)}
          retryLabel="Quay lại danh sách hóa đơn"
        />
      </div>
    );
  }

  const invoice = payment.invoice;
  const building = invoice?.building;
  const representative = invoice?.representative;
  const repName =
    representative?.name ||
    invoice?.representativeName ||
    payment?.representativeName ||
    '—';
  const repPhone =
    representative?.phone ||
    invoice?.representativePhone ||
    payment?.representativePhone ||
    '—';
  const repEmail =
    representative?.email ||
    invoice?.representativeEmail ||
    invoice?.contractId?.representativeEmail ||
    '—';

  const roomText = invoice?.roomNumber
    ? `Phòng ${invoice.roomNumber}${invoice.floorNumber ? ` · Tầng ${invoice.floorNumber}` : ''}`
    : '—';
  const items = invoice?.items || [];
  const receiptCode = invoice?.invoiceCode || payment.sepayTxnId || '—';

  return (
    <>
      {/* CSS dành riêng khi in ấn / xuất PDF: Chỉ in vùng biên lai, ẩn toàn bộ UI khác */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #housify-receipt-print, #housify-receipt-print * {
            visibility: visible !important;
          }
          #housify-receipt-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 999999 !important;
          }
          header, aside, .page-header, .btn, .no-print {
            display: none !important;
          }
        }
        .stamp-paid {
          transform: rotate(-12deg);
          border: 2px dashed #15803d;
          color: #15803d;
          background-color: rgba(240, 253, 244, 0.85);
          letter-spacing: .08em;
        }
      `}</style>

      {/* Thanh điều hướng trên cùng: 1 nút quay lại danh sách ở góc trái + 2 nút thao tác bên phải */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Góc trên bên trái: Chỉ 1 nút duy nhất quay về đúng danh sách Thanh toán */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline-secondary"
            size="sm"
            className="flex items-center gap-1.5 font-medium shadow-2xs"
            onClick={() => navigate(basePath)}
          >
            <BiArrowBack size={18} />
            Quay lại danh sách
          </Button>
          <OnTimeBadge label={payment.statusLabel} />
        </div>

        {/* Góc trên bên phải: Xem hóa đơn & In biên lai / Tải PDF */}
        <div className="flex items-center gap-2">
          {invoice?._id && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 bg-[#714b67] border-[#714b67] hover:bg-[#5e3e56] shadow-2xs"
              onClick={() => navigate(`${invoiceBasePath}/${invoice._id}`)}
            >
              <BiReceipt size={16} />
              Xem hóa đơn
            </Button>
          )}
          <Button
            variant="outline-dark"
            size="sm"
            className="flex items-center gap-1.5 font-medium shadow-2xs"
            onClick={handlePrint}
          >
            <BiPrinter size={16} />
            In biên lai / Tải PDF
          </Button>
        </div>
      </div>

      {/* VĂN BẢN BIÊN LAI THỰC TẾ (Cỡ chữ chuẩn rõ nét) */}
      <div className="max-w-4xl mx-auto py-2 px-1">
        <div
          id="housify-receipt-print"
          className="relative bg-white border rounded-xl p-8 sm:p-10 shadow-sm [print-color-adjust:exact]"
        >
          {/* Dấu ĐÃ THANH TOÁN */}
          <div className="stamp-paid absolute right-8 top-20 px-4 py-1.5 rounded text-sm font-bold uppercase select-none pointer-events-none">
            ĐÃ THANH TOÁN
          </div>

          {/* Đầu biên lai */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-xl bg-[#714b67] text-white flex items-center justify-center font-bold text-2xl shadow-xs">
                H
              </div>
              <div>
                <div className="font-bold text-xl text-[#714b67] tracking-tight">Housify</div>
                <div className="text-sm text-gray-600 font-medium">
                  {building?.name || 'Tòa nhà cho thuê'} · {building?.address || 'Hệ thống Housify'}
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600 leading-relaxed">
              <div>Quản lý: <span className="font-semibold text-gray-800">{building?.managerName || 'Quản lý tòa nhà'}</span></div>
              <div>Điện thoại: <span className="font-semibold text-gray-800">{building?.managerPhone || '—'}</span></div>
            </div>
          </div>

          {/* Tiêu đề biên lai */}
          <div className="text-center my-6">
            <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900 mb-2">
              BIÊN LAI THANH TOÁN TIỀN PHÒNG
            </h1>
            <div className="flex justify-between items-center text-sm text-gray-600 px-1 font-medium">
              <span className="italic">{formatVietnameseDate(payment.paidAt)}</span>
              <span>
                Số biên lai: <span className="font-mono font-semibold text-gray-900">{receiptCode}</span>
              </span>
            </div>
          </div>

          {/* Thông tin 2 cột (Cỡ chữ 14px rõ ràng, thoáng mắt) */}
          <div className="bg-gray-50/70 rounded-lg p-5 border border-gray-200/90 mb-6 text-sm leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
              <div className="flex items-center">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Đại diện:</span>
                <span className="font-bold text-gray-900 text-base">{repName}</span>
              </div>
              <div className="flex items-center">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Kỳ hóa đơn:</span>
                <span className="font-semibold text-gray-800">Tháng {monthLabel(invoice?.month)}</span>
              </div>

              <div className="flex items-center">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Phòng:</span>
                <span className="font-bold text-gray-900">{roomText}</span>
              </div>
              <div className="flex items-center">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Ngày gửi:</span>
                <span className="text-gray-800 font-medium">
                  {invoice?.sentAt ? formatDateTime(invoice.sentAt) : (invoice?.createdAt ? formatDateTime(invoice.createdAt) : '—')}
                </span>
              </div>

              <div className="flex items-center">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Email:</span>
                <span className="text-gray-800 font-medium break-all">{repEmail}</span>
              </div>
              <div className="flex items-center">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Hạn thanh toán:</span>
                <span className="text-gray-800 font-semibold">{invoice?.dueDate ? formatDate(invoice.dueDate) : '—'}</span>
              </div>

              <div className="flex items-center">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Điện thoại:</span>
                <span className="text-gray-800 font-semibold">{repPhone}</span>
              </div>
              <div className="flex items-center">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Hình thức:</span>
                <span className="font-semibold text-gray-800">Chuyển khoản</span>
              </div>

              <div className="flex items-center sm:col-span-2 pt-2 border-t border-gray-200/70">
                <span className="w-36 text-gray-500 shrink-0 font-medium">Thanh toán lúc:</span>
                <span className="font-bold text-emerald-700">{formatDateTime(payment.paidAt)}</span>
              </div>
            </div>
          </div>

          {/* Bảng chi tiết khoản thu chuẩn */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/90 text-gray-700 uppercase font-bold tracking-wider text-xs sm:text-sm">
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-center w-14">STT</th>
                  <th className="py-3 px-4 text-left">Khoản thu</th>
                  <th className="py-3 px-4 text-center w-32">Số lượng</th>
                  <th className="py-3 px-4 text-right w-36">Đơn giá</th>
                  <th className="py-3 px-4 text-right w-36">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/80">
                {items.length > 0 ? (
                  items.map((it, idx) => (
                    <tr key={it._id || idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-center text-gray-500 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{it.description}</td>
                      <td className="py-3 px-4 text-center text-gray-700 font-medium">{formatItemQuantity(it)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-gray-700 font-medium">{formatMoney(it.unitPrice)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-gray-900">{formatMoney(it.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 px-4 text-center text-gray-500">1</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">Tiền phòng & dịch vụ kỳ {monthLabel(invoice?.month)}</td>
                    <td className="py-3 px-4 text-center text-gray-700 font-medium">1 kỳ</td>
                    <td className="py-3 px-4 text-right tabular-nums text-gray-700 font-medium">{formatMoney(payment.amount)}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-gray-900">{formatMoney(payment.amount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tổng kết tiền */}
          <div className="flex justify-end mb-5">
            <div className="w-full max-w-96 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200/90 leading-normal">
              <div className="flex justify-between py-1.5 text-gray-700">
                <span>Tổng cộng:</span>
                <span className="font-bold text-gray-900 tabular-nums text-base">{formatMoney(invoice?.totalAmount || payment.amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-emerald-700 font-bold border-t border-gray-200/70">
                <span>Đã thanh toán:</span>
                <span className="tabular-nums text-base">{formatMoney(payment.amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-gray-500 border-t border-gray-200/70 font-medium">
                <span>Còn lại:</span>
                <span className="tabular-nums font-semibold">{formatMoney(Math.max(0, (invoice?.totalAmount || payment.amount) - payment.amount))}</span>
              </div>
            </div>
          </div>

          {/* Số tiền bằng chữ */}
          <div className="italic text-sm text-gray-700 mb-9 bg-amber-50/70 p-3 rounded-lg border border-amber-200/70">
            Số tiền bằng chữ: <span className="font-semibold text-gray-900">{moneyInWords(payment.amount)}</span>.
          </div>

          {/* Khu vực xác nhận */}
          <div className="grid grid-cols-2 gap-8 text-sm text-center pt-4 border-t border-gray-200">
            <div>
              <div className="font-bold text-gray-800 uppercase tracking-wide">Người nộp tiền</div>
              <div className="text-xs text-gray-500 mb-12">(Người đại diện)</div>
              <div className="font-bold text-gray-900 text-lg">{repName}</div>
            </div>
            <div>
              <div className="font-bold text-gray-800 uppercase tracking-wide">Xác nhận điện tử</div>
              <div className="mt-2 mx-auto max-w-80 rounded-lg border border-emerald-600 bg-emerald-50/90 p-3.5 text-sm text-emerald-950 text-left leading-relaxed [print-color-adjust:exact]">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800 mb-1">
                  ✓ Hệ thống Housify ghi nhận qua SePay
                </div>
                <div>Mã GD: <span className="font-mono font-bold text-gray-900">{payment.sepayTxnId || '—'}</span></div>
                <div>Thời gian: <span className="font-semibold text-gray-800">{formatDateTime(payment.paidAt)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentDetailPage;

