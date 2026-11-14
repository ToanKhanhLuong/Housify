// UC-39: lịch sử thanh toán. Manager (/payments) xem biên lai cả tòa mình; Customer (/my-payments) xem phòng mình
// Payment = biên lai đã chuyển tiền (như ảnh chụp chuyển khoản), khác hóa đơn = khoản phải trả. Mỗi thẻ là 1 giao dịch
// SePay đã khớp hóa đơn (hóa đơn chờ / đã hủy xem ở trang Hóa đơn). Mặc định xem dạng biên lai, đổi được sang Bảng
// ControlBar (lọc khoảng ngày trả, Manager lọc thêm theo phòng), Pager. Bấm một biên lai → popup "Biên lai thanh toán"
// Ô tìm: gõ "11/2026" (cả tháng), "3/11/2026" (1 ngày) hoặc mã phòng "201" (Manager) – API không có ?q nên FE đổi sang from / to / roomId
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiReset } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import MoneyText from '../../components/MoneyText';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useSavedState } from '../../utils/filter';
import { formatDateTime } from '../../utils/format';
import paymentApi from './payment.api';
import { monthLabel, searchToRange } from './paymentFormat';
import OnTimeBadge from './components/OnTimeBadge';
import PaymentDetailModal from './components/PaymentDetailModal';
import ReceiptCard from './components/ReceiptCard';

const LIMIT = 12; // 12 thẻ = 3 hàng × 4 cột
const EMPTY_FILTERS = { from: '', to: '', roomId: '' };
// lọc theo ngày trả tiền (paidAt): 2 ô ngày "Từ – Đến" trong Bộ lọc (kiểu 'dateRange' của ControlBar)
const DATE_FILTER = { id: 'paidAt', label: 'Ngày trả', type: 'dateRange', minField: 'from', maxField: 'to' };

const PaymentListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user.role === ROLE.MANAGER;
  const invoiceBasePath = isManager ? '/invoices' : '/my-invoices';
  const basePath = isManager ? '/payments' : '/my-payments';
  const buildingId = user.building?._id;

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
  const [rooms, setRooms] = useSavedState(`${basePath}:rooms:${buildingId ?? ''}`, []); // phòng của tòa (Manager)

  // Manager: tải phòng của tòa mình một lần để lọc theo phòng (API lọc theo roomId)
  useEffect(() => {
    if (!isManager || !buildingId) return;
    paymentApi
      .rooms(buildingId)
      .then((response) => {
        const list = Array.isArray(response.data) ? [...response.data] : [];
        list.sort((a, b) =>
          String(a.roomNumber).localeCompare(String(b.roomNumber), 'vi', { numeric: true }),
        );
        setRooms(list);
      })
      .catch(() => setRooms([]));
  }, [isManager, buildingId, setRooms]);

  // Manager có thêm nhóm "Phòng" (chọn 1) trong Bộ lọc
  const filterGroups = useMemo(
    () =>
      isManager && rooms.length > 0
        ? [
            DATE_FILTER,
            {
              id: 'roomId',
              label: 'Phòng',
              type: 'radio',
              maxVisible: 5,
              options: rooms.map((room) => ({ value: room._id, label: `Phòng ${room.roomNumber}` })),
            },
          ]
        : [DATE_FILTER],
    [isManager, rooms],
  );

  // ô tìm: tháng / ngày → from, to; Manager gõ mã phòng → roomId. Ô tìm được ưu tiên hơn Bộ lọc.
  // Gõ sai dạng thì không gọi API, hiện gợi ý
  const keyword = query.trim();
  const searchRange = keyword ? searchToRange(keyword) : null;
  const matchedRoom =
    isManager && keyword && !searchRange
      ? rooms.find((room) => String(room.roomNumber) === keyword)
      : null;
  const noMatch = Boolean(keyword && !searchRange && !matchedRoom);
  const fromParam = searchRange?.from ?? filters.from;
  const toParam = searchRange?.to ?? filters.to;
  const roomParam = matchedRoom?._id ?? (isManager ? filters.roomId || '' : '');

  // ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp (gõ / bấm nhanh)
  useEffect(() => {
    if (noMatch) return undefined;
    let ignore = false;
    const params = { page, limit: LIMIT };
    if (fromParam) params.from = fromParam;
    if (toParam) params.to = toParam;
    if (roomParam) params.roomId = roomParam;

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
  }, [page, fromParam, toParam, roomParam, noMatch, reloadKey]);

  const silentRefresh = useCallback(() => {
    if (noMatch) return Promise.resolve();
    const params = { page, limit: LIMIT };
    if (fromParam) params.from = fromParam;
    if (toParam) params.to = toParam;
    if (roomParam) params.roomId = roomParam;
    return paymentApi.list(params).then((response) => {
      if (response.data) setData(response.data);
    });
  }, [page, fromParam, toParam, roomParam, noMatch]);

  useAutoRefresh(silentRefresh, { enabled: !loading && !loadError && !selected });

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
    setFilters({ from, to, roomId: next.roomId || '' });
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

  const isFiltering = Boolean(keyword || filters.from || filters.to || filters.roomId);
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
                    ? isManager
                      ? 'Không có phòng này. Gõ mã phòng (vd 201), tháng dạng 11/2026 hoặc ngày dạng 3/11/2026.'
                      : 'Gõ tháng dạng 11/2026 hoặc ngày dạng 3/11/2026.'
                    : 'Không có giao dịch nào khớp bộ lọc.'
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

    const handlePaymentClick = (payment) => {
      navigate(`${basePath}/${payment._id}`, { state: { payment } });
    };

    if (view === 'table') {
      return <DataTable columns={columns} data={items} onRowClick={handlePaymentClick} />;
    }

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((payment) => (
          <ReceiptCard
            key={payment._id}
            payment={payment}
            showRoom={isManager}
            onClick={() => handlePaymentClick(payment)}
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
          searchPlaceholder={
            isManager
              ? 'Tìm theo phòng (vd 201), tháng (vd 11/2026) hoặc ngày trả (vd 3/11/2026)...'
              : 'Tìm theo tháng (vd 11/2026) hoặc ngày trả (vd 3/11/2026)...'
          }
          filterGroups={filterGroups}
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
    </>
  );
};

export default PaymentListPage;
