// UC-39: lịch sử thanh toán. Manager (/payments) xem biên lai cả tòa mình; Customer (/my-payments) xem phòng mình
// Payment = biên lai đã chuyển tiền (như ảnh chụp chuyển khoản), khác hóa đơn = khoản phải trả. Mỗi thẻ là 1 giao dịch
// SePay đã khớp hóa đơn (hóa đơn chờ / đã hủy xem ở trang Hóa đơn). Mặc định xem dạng biên lai, đổi được sang Bảng
// ControlBar (lọc khoảng ngày trả), Pager. Bấm một biên lai → popup "Biên lai thanh toán"
// Ô tìm: gõ "11/2026" (cả tháng) hoặc "3/11/2026" (1 ngày) – API không có ?q nên FE đổi sang from / to
import { useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiReset } from 'react-icons/bi';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import MoneyText from '../../components/MoneyText';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { useSavedState } from '../../utils/filter';
import { formatDateTime } from '../../utils/format';
import paymentApi from './payment.api';
import { monthLabel, searchToRange } from './paymentFormat';
import OnTimeBadge from './components/OnTimeBadge';
import PaymentDetailModal from './components/PaymentDetailModal';
import ReceiptCard from './components/ReceiptCard';

const LIMIT = 12; // 12 thẻ = 3 hàng × 4 cột
const EMPTY_FILTERS = { from: '', to: '' };
// lọc theo ngày trả tiền (paidAt): 2 ô ngày "Từ – Đến" trong Bộ lọc (kiểu 'dateRange' của ControlBar)
const FILTER_GROUPS = [
  { id: 'paidAt', label: 'Ngày trả', type: 'dateRange', minField: 'from', maxField: 'to' },
];

const PaymentListPage = () => {
  const { user } = useAuth();
  const isManager = user.role === ROLE.MANAGER;
  const invoiceBasePath = isManager ? '/invoices' : '/my-invoices';
  const basePath = isManager ? '/payments' : '/my-payments';

  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true); // lần tải đầu (và Thử lại): khung xương
  const [refreshing, setRefreshing] = useState(false); // đổi lọc / trang: làm mờ danh sách cũ
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useSavedState(`${basePath}:query`, '');
  const [filters, setFilters] = useSavedState(`${basePath}:filters`, EMPTY_FILTERS);
  const [page, setPage] = useSavedState(`${basePath}:page`, 1);
  const [view, setView] = useSavedState(`${basePath}:view`, 'cards'); // mặc định xem dạng biên lai
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null); // giao dịch đang mở popup

  // ô tìm (tháng / ngày) được ưu tiên hơn khoảng ngày trong Bộ lọc. Gõ sai dạng thì không gọi API, hiện gợi ý
  const keyword = query.trim();
  const searchRange = keyword ? searchToRange(keyword) : null;
  const noMatch = Boolean(keyword && !searchRange);
  const fromParam = searchRange?.from ?? filters.from;
  const toParam = searchRange?.to ?? filters.to;

  // ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp (gõ / bấm nhanh)
  useEffect(() => {
    if (noMatch) return undefined;
    let ignore = false;
    const params = { page, limit: LIMIT };
    if (fromParam) params.from = fromParam;
    if (toParam) params.to = toParam;

    paymentApi
      .list(params)
      .then((response) => {
        if (ignore) return;
        setData(response.data ?? { items: [], total: 0, page: 1, limit: LIMIT });
        setLoadError('');
      })
      .catch((error) => !ignore && setLoadError(error.message))
      .finally(() => {
        if (ignore) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, fromParam, toParam, noMatch, reloadKey]);

  // đổi lọc / tìm thì về trang 1
  const handleSearchChange = (value) => {
    setQuery(value);
    setPage(1);
    setRefreshing(true);
  };
  const handleFilterChange = (next) => {
    let from = next.from || '';
    let to = next.to || '';
    // chọn ngược (Từ sau Đến) thì đảo lại, BE báo lỗi nếu from > to
    if (from && to && from > to) [from, to] = [to, from];
    setFilters({ from, to });
    setPage(1);
    setRefreshing(true);
  };
  const handlePageChange = (next) => {
    setPage(next);
    setRefreshing(true);
  };
  const handleResetFilters = () => {
    setQuery('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setRefreshing(true);
  };
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const isFiltering = Boolean(keyword || filters.from || filters.to);
  const items = noMatch ? [] : data.items;
  const total = noMatch ? 0 : data.total;

  const columns = [
    { key: 'paidAt', title: 'Thời gian trả', render: (row) => formatDateTime(row.paidAt) },
    ...(isManager
      ? [{ key: 'room', title: 'Phòng', render: (row) => row.invoice?.roomNumber || '—' }]
      : []),
    {
      key: 'invoiceCode',
      title: 'Hóa đơn',
      className: 'fw-semibold',
      render: (row) => row.invoice?.invoiceCode ?? '—',
    },
    { key: 'month', title: 'Kỳ', render: (row) => monthLabel(row.invoice?.month) },
    {
      key: 'amount',
      title: 'Số tiền',
      align: 'end',
      render: (row) => <MoneyText value={row.amount} className="fw-semibold" />,
    },
    { key: 'bankName', title: 'Ngân hàng' },
    { key: 'statusLabel', title: 'Tình trạng', render: (row) => <OnTimeBadge label={row.statusLabel} /> },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <Card.Body>
            <SkeletonRows rows={5} columns={5} />
          </Card.Body>
        </Card>
      );
    }
    if (loadError) {
      return (
        <ErrorState
          message="Không tải được lịch sử thanh toán"
          detail={loadError}
          onRetry={reload}
        />
      );
    }
    if (items.length === 0) {
      return (
        <Card>
          <Card.Body>
            {isFiltering ? (
              <EmptyState
                message={
                  noMatch
                    ? 'Gõ tháng dạng 11/2026 hoặc ngày dạng 3/11/2026.'
                    : 'Không có giao dịch nào trong khoảng thời gian này.'
                }
              >
                <Button
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={handleResetFilters}
                >
                  <BiReset />
                  Xóa bộ lọc
                </Button>
              </EmptyState>
            ) : (
              <EmptyState message="Chưa có lịch sử thanh toán nào." />
            )}
          </Card.Body>
        </Card>
      );
    }

    if (view === 'table') {
      return <DataTable columns={columns} data={items} onRowClick={setSelected} />;
    }

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((payment) => (
          <ReceiptCard
            key={payment._id}
            payment={payment}
            showRoom={isManager}
            onClick={() => setSelected(payment)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* không dùng overflow-hidden: bảng Bộ lọc xổ ra ngoài thẻ sẽ bị cắt */}
      <Card className="mb-3">
        <ControlBar
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Tìm theo tháng (vd 11/2026) hoặc ngày trả (vd 3/11/2026)..."
          filterGroups={FILTER_GROUPS}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          count={loading || loadError ? null : `${total} biên lai`}
          view={view}
          onViewChange={setView}
        />
      </Card>

      <div className="small text-secondary mb-3">
        Mỗi biên lai là một lần chuyển khoản đã được hệ thống tự ghi nhận qua SePay
        {isManager ? '' : ' – không cần chụp màn hình gửi quản lý'}. Số tiền phải trả từng tháng
        xem ở trang Hóa đơn.
      </div>

      <div
        className={`transition-opacity ${refreshing ? 'opacity-50' : ''}`}
        aria-busy={refreshing}
      >
        {renderContent()}
      </div>

      {!loading && !loadError && total > 0 && (
        <div className="flex justify-end mt-3">
          <Pager page={data.page} limit={data.limit} total={total} onChange={handlePageChange} />
        </div>
      )}

      {selected && (
        <PaymentDetailModal
          payment={selected}
          invoiceBasePath={invoiceBasePath}
          onHide={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default PaymentListPage;
