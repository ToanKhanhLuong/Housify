// UC-39: xem chi tiết biên lai thanh toán (dạng hóa đơn/biên lai in thực tế chuẩn chỉnh)
// Có 3 tab: Biên lai (tờ in chuẩn A5/A4), Giao dịch SePay, Khoản thu (chi tiết hóa đơn gốc)
// Hỗ trợ in trực tiếp / xuất PDF qua window.print(), quy ước "Xác nhận điện tử"
import { useEffect, useState } from 'react';
import { Button, Modal, Nav } from 'react-bootstrap';
import { BiPrinter, BiReceipt } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatDateTime, formatMoney } from '../../../utils/format';
import { moneyInWords } from '../../../utils/moneyInWords';
import invoiceApi from '../../invoice/invoice.api';
import { monthLabel } from '../paymentFormat';
import OnTimeBadge from './OnTimeBadge';

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

const PaymentDetailModal = ({ payment, invoiceBasePath, onHide }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('receipt');
  const [fullInvoice, setFullInvoice] = useState(payment.invoice || null);

  // Nếu invoice trong payment chưa có items, tự động fetch chi tiết invoice để có đủ bảng kê
  useEffect(() => {
    if (payment.invoice?._id && (!fullInvoice?.items || fullInvoice.items.length === 0)) {
      invoiceApi
        .detail(payment.invoice._id)
        .then((res) => {
          if (res.data) {
            setFullInvoice((prev) => ({
              ...prev,
              ...res.data,
              items: res.data.items || [],
              building: prev?.building || res.data.contractId?.roomId?.buildingId,
              representative: res.data.representative || prev?.representative || {
                name: res.data.representativeName || payment.representativeName || '',
                phone: res.data.representativePhone || payment.representativePhone || '',
                email: res.data.contractId?.representativeEmail || '',
              },
            }));
          }
        })
        .catch(() => {});
    }
  }, [payment.invoice, fullInvoice, payment.representativeName, payment.representativePhone]);

  const invoice = fullInvoice || payment.invoice;
  const building = invoice?.building;
  const representative = invoice?.representative || payment?.representative;
  const repName =
    representative?.name ||
    invoice?.representativeName ||
    payment?.representativeName ||
    '—';
  const repEmail =
    representative?.email ||
    invoice?.representativeEmail ||
    invoice?.contractId?.representativeEmail ||
    '—';
  const repPhone =
    representative?.phone ||
    invoice?.representativePhone ||
    payment?.representativePhone ||
    '—';
  const roomText = invoice?.roomNumber
    ? `${invoice.roomNumber}${invoice.floorNumber ? ` · Tầng ${invoice.floorNumber}` : ''}`
    : '—';

  const isUnderpaid =
    payment.paymentStatus === 'UNDERPAID' ||
    (invoice && Number(payment.amount) < Number(invoice.totalAmount));
  const isOverpaid =
    payment.paymentStatus === 'OVERPAID' ||
    (invoice && Number(payment.amount) > Number(invoice.totalAmount));
  const items = invoice?.items || [];

  const handlePrint = () => {
    setActiveTab('receipt');
    setTimeout(() => {
      window.print();
    }, 150);
  };

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
          .modal, .modal-backdrop, .modal-header, .modal-footer, .nav-tabs, .btn, .no-print {
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

      <Modal show onHide={onHide} size="lg" centered className="housify-receipt-modal">
        <Modal.Header closeButton className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Modal.Title className="text-lg font-bold text-gray-800 mb-0">
              Biên lai thanh toán
            </Modal.Title>
            <OnTimeBadge label={payment.statusLabel} />
          </div>
        </Modal.Header>

        {/* Tab chuyển đổi */}
        <div className="px-4 pt-2 border-b bg-gray-50/50">
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            <Nav.Item>
              <Nav.Link eventKey="receipt" className="font-semibold text-sm">
                Biên lai
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="items" className="font-semibold text-sm">
                Khoản thu ({items.length})
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        <Modal.Body className="p-4 bg-gray-50/40 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: BIÊN LAI IN CHUẨN */}
          {activeTab === 'receipt' && (
            <div
              id="housify-receipt-print"
              className="relative bg-white border rounded-lg p-6 shadow-xs [print-color-adjust:exact]"
            >
              {/* Dấu ĐÃ THANH TOÁN hoặc CHƯA ĐỦ TIỀN / CHUYỂN THỪA */}
              {isUnderpaid || isOverpaid ? (
                <div
                  className="absolute right-8 top-20 px-3 py-1 rounded text-xs font-bold uppercase select-none pointer-events-none"
                  style={{
                    transform: 'rotate(-12deg)',
                    border: '2px dashed #dc2626',
                    color: '#dc2626',
                    backgroundColor: 'rgba(254, 242, 242, 0.9)',
                    letterSpacing: '.06em',
                  }}
                >
                  {isUnderpaid ? 'CHƯA ĐỦ TIỀN' : 'CHUYỂN THỪA'}
                </div>
              ) : (
                <div className="stamp-paid absolute right-8 top-20 px-3 py-1 rounded text-xs font-bold uppercase select-none pointer-events-none">
                  ĐÃ THANH TOÁN
                </div>
              )}

              {/* Đầu biên lai */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#714b67] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    H
                  </div>
                  <div>
                    <div className="font-bold text-base text-[#714b67] tracking-tight">Housify</div>
                    <div className="text-xs text-gray-600">
                      {building?.name || 'Tòa nhà cho thuê'} · {building?.address || 'Hệ thống Housify'}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600 leading-tight">
                  <div>Quản lý: <span className="font-medium text-gray-800">{building?.managerName || 'Quản lý tòa nhà'}</span></div>
                  <div>Điện thoại: <span className="font-medium text-gray-800">{building?.managerPhone || '—'}</span></div>
                </div>
              </div>

              {/* Tiêu đề biên lai */}
              <div className="text-center my-4">
                <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 mb-1">
                  BIÊN LAI THANH TOÁN TIỀN PHÒNG
                </h2>
                <div className="flex justify-between items-center text-xs text-gray-600 px-1">
                  <span className="italic">{formatVietnameseDate(payment.paidAt)}</span>
                  <span>
                    Số biên lai: <span className="font-mono font-semibold text-gray-800">{invoice?.invoiceCode || payment.sepayTxnId}</span>
                  </span>
                </div>
              </div>

              {/* Thông tin 2 cột */}
              <div className="bg-gray-50/60 rounded-md p-3 border border-gray-200/80 mb-4 text-xs leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <div className="flex">
                    <span className="w-28 text-gray-500 shrink-0">Đại diện:</span>
                    <span className="font-semibold text-gray-900">{repName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-gray-500 shrink-0">Kỳ hóa đơn:</span>
                    <span className="font-medium text-gray-800">Tháng {monthLabel(invoice?.month)}</span>
                  </div>

                  <div className="flex">
                    <span className="w-28 text-gray-500 shrink-0">Phòng:</span>
                    <span className="font-semibold text-gray-900">{roomText}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-gray-500 shrink-0">Ngày gửi:</span>
                    <span className="text-gray-800">{invoice?.sentAt ? formatDateTime(invoice.sentAt) : (invoice?.createdAt ? formatDateTime(invoice.createdAt) : '—')}</span>
                  </div>

                  <div className="flex">
                    <span className="w-28 text-gray-500 shrink-0">Email:</span>
                    <span className="text-gray-800 break-all">{repEmail}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-gray-500 shrink-0">Hạn thanh toán:</span>
                    <span className="text-gray-800">{invoice?.dueDate ? formatDate(invoice.dueDate) : '—'}</span>
                  </div>

                  <div className="flex">
                    <span className="w-28 text-gray-500 shrink-0">Điện thoại:</span>
                    <span className="text-gray-800">{repPhone}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-gray-500 shrink-0">Hình thức:</span>
                    <span className="font-medium text-gray-800">Chuyển khoản</span>
                  </div>

                  <div className="flex sm:col-span-2">
                    <span className="w-28 text-gray-500 shrink-0">Thanh toán lúc:</span>
                    <span className="font-medium text-emerald-700">{formatDateTime(payment.paidAt)}</span>
                  </div>
                </div>
              </div>

              {/* Bảng chi tiết khoản thu chuẩn */}
              <div className="border border-gray-200 rounded overflow-hidden mb-3">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100/80 text-gray-700 uppercase font-semibold">
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-3 text-center w-10">STT</th>
                      <th className="py-2 px-3 text-left">Khoản thu</th>
                      <th className="py-2 px-3 text-center w-24">Số lượng</th>
                      <th className="py-2 px-3 text-right w-28">Đơn giá</th>
                      <th className="py-2 px-3 text-right w-28">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/70">
                    {items.length > 0 ? (
                      items.map((it, idx) => (
                        <tr key={it._id || idx} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 text-center text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-gray-900">{it.description}</td>
                          <td className="py-2 px-3 text-center text-gray-700">{formatItemQuantity(it)}</td>
                          <td className={`py-2 px-3 text-right tabular-nums ${Number(it.unitPrice) < 0 ? 'text-danger fw-semibold' : 'text-gray-700'}`}>
                            {formatMoney(it.unitPrice)}
                          </td>
                          <td className={`py-2 px-3 text-right tabular-nums font-semibold ${Number(it.amount) < 0 ? 'text-danger' : 'text-gray-900'}`}>
                            {formatMoney(it.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-3 text-center text-gray-500">1</td>
                        <td className="py-2 px-3 font-medium text-gray-900">Tiền phòng & dịch vụ kỳ {monthLabel(invoice?.month)}</td>
                        <td className="py-2 px-3 text-center text-gray-700">1 kỳ</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-700">{formatMoney(payment.amount)}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(payment.amount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tổng kết tiền */}
              <div className="flex justify-end mb-3">
                <div className="w-full max-w-72 text-xs bg-gray-50/80 p-2.5 rounded border border-gray-200/80">
                  <div className="flex justify-between py-1 text-gray-700">
                    <span>Tổng cộng:</span>
                    <span className="font-bold text-gray-900 tabular-nums">{formatMoney(invoice?.totalAmount || payment.amount)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-emerald-700 font-semibold border-t border-gray-200/60">
                    <span>{isUnderpaid || isOverpaid ? 'Số tiền đã chuyển:' : 'Đã thanh toán:'}</span>
                    <span className="tabular-nums">{formatMoney(payment.amount)}</span>
                  </div>
                  {isOverpaid ? (
                    <div className="flex justify-between py-1 text-danger border-t border-gray-200/60 font-medium">
                      <span>Tiền thừa (chưa gạch nợ):</span>
                      <span className="tabular-nums">{formatMoney(Math.max(0, Number(payment.amount) - Number(invoice?.totalAmount || payment.amount)))}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between py-1 text-gray-500 border-t border-gray-200/60">
                      <span>Còn lại:</span>
                      <span className="tabular-nums">{formatMoney(Math.max(0, (invoice?.totalAmount || payment.amount) - payment.amount))}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Số tiền bằng chữ */}
              <div className="italic text-xs text-gray-600 mb-6 bg-amber-50/50 p-2 rounded border border-amber-200/50">
                Số tiền bằng chữ: <span className="font-medium text-gray-800">{moneyInWords(payment.amount)}</span>.
              </div>

              {/* Khu vực xác nhận */}
              <div className="grid grid-cols-2 gap-6 text-xs text-center pt-2 border-t border-gray-200">
                <div>
                  <div className="font-bold text-gray-800 uppercase tracking-wide">Người nộp tiền</div>
                  <div className="text-gray-500 mb-8">(Người đại diện)</div>
                  <div className="font-bold text-gray-900 text-sm">{repName}</div>
                </div>
                <div>
                  <div className="font-bold text-gray-800 uppercase tracking-wide">Xác nhận điện tử</div>
                  <div className="mt-1 mx-auto max-w-64 rounded-md border border-emerald-600 bg-emerald-50/90 p-2.5 text-xs text-emerald-900 text-left leading-relaxed [print-color-adjust:exact]">
                    <div className="font-semibold flex items-center gap-1 text-emerald-800">
                      ✓ Hệ thống Housify ghi nhận qua SePay
                    </div>
                    <div>Mã GD: <span className="font-mono font-semibold">{payment.sepayTxnId || '—'}</span></div>
                    <div>Thời gian: <span>{formatDateTime(payment.paidAt)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BẢNG KÊ CÁC KHOẢN THU */}
          {activeTab === 'items' && (
            <div className="bg-white border rounded-lg p-5">
              <div className="grid grid-cols-2 gap-3 text-xs mb-4 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-gray-500">Mã hóa đơn:</span>{' '}
                  <span className="font-mono font-semibold text-gray-900">{invoice?.invoiceCode || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phòng:</span>{' '}
                  <span className="font-semibold text-gray-900">{roomText}</span>
                </div>
                <div>
                  <span className="text-gray-500">Kỳ hóa đơn:</span>{' '}
                  <span className="font-medium text-gray-900">Tháng {monthLabel(invoice?.month)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Hạn thanh toán:</span>{' '}
                  <span className="font-medium text-gray-900">{invoice?.dueDate ? formatDate(invoice.dueDate) : '—'}</span>
                </div>
              </div>

              <div className="border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-semibold">
                    <tr className="border-b">
                      <th className="py-2 px-3 text-left">Khoản thu</th>
                      <th className="py-2 px-3 text-center">Số lượng</th>
                      <th className="py-2 px-3 text-right">Đơn giá</th>
                      <th className="py-2 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.length > 0 ? (
                      items.map((it, idx) => (
                        <tr key={it._id || idx}>
                          <td className="py-2.5 px-3 font-medium text-gray-900">{it.description}</td>
                          <td className="py-2.5 px-3 text-center text-gray-700">{formatItemQuantity(it)}</td>
                          <td className={`py-2.5 px-3 text-right tabular-nums ${Number(it.unitPrice) < 0 ? 'text-danger fw-semibold' : 'text-gray-700'}`}>
                            {formatMoney(it.unitPrice)}
                          </td>
                          <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${Number(it.amount) < 0 ? 'text-danger' : 'text-gray-900'}`}>
                            {formatMoney(it.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-3 px-3 text-center text-gray-500 italic">
                          Không có dữ liệu chi tiết khoản thu
                        </td>
                      </tr>
                    )}
                    <tr className="bg-gray-50 font-bold border-t border-gray-300">
                      <td colSpan={3} className="py-2.5 px-3 text-right">Tổng hóa đơn:</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">
                        {formatMoney(invoice?.totalAmount || payment.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="flex items-center justify-between px-4 py-3 bg-white border-t">
          <div className="flex items-center gap-2">
            {invoice?._id && (
              <Button
                variant="primary"
                size="sm"
                className="flex items-center gap-1.5 bg-[#714b67] border-[#714b67] hover:bg-[#5e3e56]"
                onClick={() => navigate(`${invoiceBasePath}/${invoice._id}`)}
              >
                <BiReceipt size={16} />
                Xem hóa đơn
              </Button>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              className="flex items-center gap-1.5"
              onClick={handlePrint}
            >
              <BiPrinter size={16} />
              In biên lai / PDF
            </Button>
          </div>
          <Button variant="secondary" size="sm" onClick={onHide}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PaymentDetailModal;
