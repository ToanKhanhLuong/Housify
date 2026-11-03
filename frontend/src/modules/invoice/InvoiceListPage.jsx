// UC-36: danh sách hóa đơn. Manager (/invoices) xem mọi hóa đơn tòa mình; Customer (/my-invoices) xem phòng mình, không thấy nháp
// Khuôn danh sách như trang Tòa nhà: ControlBar (lọc trạng thái, kỳ tháng), đổi Thẻ / Bảng
// Ô tìm: gõ kỳ "11/2026" (cả 2 vai trò) hoặc mã phòng "101" (Manager) – API không có ?q nên FE đổi sang month / roomId
// Hóa đơn tăng theo thời gian nên BE phân trang (api.md) → Pager, không nhóm. Chưa có mockup riêng cho hóa đơn
// Manager: nút "Tạo hóa đơn" (UC-34, trang /invoices/new) và "Tạo hàng loạt" (UC-34 A1, modal)
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiLayerPlus, BiPlus, BiReset } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ItemCard from '../../components/ItemCard';
import MoneyText from '../../components/MoneyText';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { INVOICE_STATUS, ROLE } from '../../constants/enums';
import { INVOICE_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import invoiceApi from './invoice.api';
import { dueStatus, monthLabel, roomOf } from './invoiceFormat';
import BulkInvoiceModal from './components/BulkInvoiceModal';

const LIMIT = 12; // 12 thẻ = 3 hàng × 4 cột
const EMPTY_FILTERS = { status: [], month: '' };
// ô chọn kỳ chỉ tới tháng 12 của năm hiện tại (tính 1 lần khi nạp trang, render phải thuần)
const MAX_MONTH = `${new Date().getFullYear()}-12`;

const DueText = ({ invoice }) => {
  const { text, variant } = dueStatus(invoice);
  return <span className={`small text-${variant}-emphasis`}>{text}</span>;
};

const InvoiceListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user.role === ROLE.MANAGER;
  const basePath = isManager ? '/invoices' : '/my-invoices';

  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true); // lần tải đầu (và Thử lại): khung xương
  const [refreshing, setRefreshing] = useState(false); // đổi lọc / trang: làm mờ danh sách cũ
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [view, setView] = useState('table');
  const [reloadKey, setReloadKey] = useState(0);
  const [showBulk, setShowBulk] = useState(false);
  const [rooms, setRooms] = useState([]); // phòng của tòa (Manager) để đổi mã phòng → roomId

  // Manager: tải phòng của tòa mình một lần để tìm hóa đơn theo mã phòng (API lọc theo roomId)
  const buildingId = user.building?._id;
  useEffect(() => {
    if (!isManager || !buildingId) return;
    invoiceApi
      .rooms(buildingId)
      .then((response) => setRooms(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRooms([]));
  }, [isManager, buildingId]);

  // Customer không thấy hóa đơn nháp nên bỏ lựa chọn "Nháp"
  const filterGroups = useMemo(
    () => [
      {
        id: 'status',
        label: 'Trạng thái',
        type: 'checkbox',
        options: Object.values(INVOICE_STATUS)
          .filter((status) => isManager || status !== INVOICE_STATUS.DRAFT)
          .map((status) => ({ value: status, label: INVOICE_STATUS_LABEL[status].label })),
      },
      // kỳ = tháng của hóa đơn: 1 ô chọn tháng/năm trong Bộ lọc (kiểu 'month' của ControlBar)
      { id: 'month', label: 'Kỳ', type: 'month', max: MAX_MONTH },
    ],
    [isManager],
  );

  // ô tìm: "11/2026" → kỳ; Manager gõ mã phòng → roomId. Gõ không khớp thì không gọi API, báo không có
  const keyword = query.trim();
  const monthMatch = keyword.match(/^(\d{1,2})\/(\d{4})$/);
  const searchMonth = monthMatch ? `${monthMatch[2]}-${monthMatch[1].padStart(2, '0')}` : '';
  const matchedRoom =
    isManager && keyword && !searchMonth ? rooms.find((room) => room.roomNumber === keyword) : null;
  const noMatch = Boolean(
    keyword && !searchMonth && !matchedRoom && (!isManager || rooms.length > 0),
  );
  const roomId = matchedRoom?._id ?? '';
  const monthParam = searchMonth || filters.month;
  const statusParam = filters.status.join(',');

  // ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp (gõ / bấm nhanh)
  useEffect(() => {
    if (noMatch) return undefined;
    let ignore = false;
    const params = { page, limit: LIMIT };
    if (statusParam) params.status = statusParam;
    if (monthParam) params.month = monthParam;
    if (roomId) params.roomId = roomId;

    invoiceApi
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
  }, [page, statusParam, monthParam, roomId, noMatch, reloadKey]);

  // đổi lọc / tìm thì về trang 1
  const handleSearchChange = (value) => {
    setQuery(value);
    setPage(1);
    setRefreshing(true);
  };
  const handleFilterChange = (next) => {
    // gõ tay quá năm hiện tại thì bỏ qua kỳ đó (ô tháng có max nhưng trình duyệt vẫn cho gõ)
    const month = next.month && next.month <= MAX_MONTH ? next.month : '';
    setFilters({ status: next.status ?? [], month });
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

  const isFiltering = Boolean(keyword || filters.status.length || filters.month);
  const items = noMatch ? [] : data.items;
  const total = noMatch ? 0 : data.total;

  const columns = [
    { key: 'invoiceCode', title: 'Mã hóa đơn', className: 'fw-semibold' },
    ...(isManager
      ? [{ key: 'room', title: 'Phòng', render: (row) => roomOf(row)?.roomNumber ?? '—' }]
      : []),
    { key: 'month', title: 'Kỳ', render: (row) => monthLabel(row.month) },
    {
      key: 'totalAmount',
      title: 'Tổng tiền',
      align: 'end',
      render: (row) => <MoneyText value={row.totalAmount} className="fw-semibold" />,
    },
    { key: 'dueDate', title: 'Hạn thanh toán', render: (row) => formatDate(row.dueDate) },
    { key: 'due', title: 'Tình trạng', render: (row) => <DueText invoice={row} /> },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={INVOICE_STATUS_LABEL} value={row.status} />,
    },
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
          message="Không tải được danh sách hóa đơn"
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
                      ? `Tòa của bạn không có phòng "${keyword}". Gõ mã phòng (vd 101) hoặc kỳ (vd 11/2026).`
                      : 'Gõ kỳ theo dạng tháng/năm, vd 11/2026.'
                    : 'Không có hóa đơn nào phù hợp. Thử đổi từ khóa hoặc bỏ bớt bộ lọc.'
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
              <EmptyState
                message={isManager ? 'Tòa chưa có hóa đơn nào.' : 'Bạn chưa có hóa đơn nào.'}
              />
            )}
          </Card.Body>
        </Card>
      );
    }

    if (view === 'table') {
      return (
        <DataTable
          columns={columns}
          data={items}
          onRowClick={(row) => navigate(`${basePath}/${row._id}`)}
        />
      );
    }

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((invoice) => (
          <ItemCard
            key={invoice._id}
            to={`${basePath}/${invoice._id}`}
            // index.css gạch chân link khi rê chuột → tắt riêng cho thẻ
            className="no-underline"
            title={invoice.invoiceCode}
            badge={<StatusBadge map={INVOICE_STATUS_LABEL} value={invoice.status} />}
            subtitle={`${isManager ? `Phòng ${roomOf(invoice)?.roomNumber ?? '—'} · ` : ''}Kỳ ${monthLabel(invoice.month)}`}
            stats={
              <span className="fs-6 fw-bold text-body">
                <MoneyText value={invoice.totalAmount} />
              </span>
            }
            footer={
              <>
                <span>Hạn: {formatDate(invoice.dueDate)}</span>
                <DueText invoice={invoice} />
              </>
            }
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
          actions={
            isManager && (
              <>
                <Button
                  variant="primary"
                  className="flex items-center gap-1"
                  onClick={() => navigate('/invoices/new')}
                >
                  <BiPlus />
                  Tạo hóa đơn
                </Button>
                <Button
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => setShowBulk(true)}
                >
                  <BiLayerPlus />
                  Tạo hàng loạt
                </Button>
              </>
            )
          }
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder={
            isManager
              ? 'Tìm theo mã phòng (vd 101) hoặc kỳ (vd 11/2026)...'
              : 'Tìm theo kỳ, vd 11/2026...'
          }
          filterGroups={filterGroups}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          count={loading || loadError ? null : `${total} hóa đơn`}
          view={view}
          onViewChange={setView}
        />
      </Card>

      {!isManager && (
        <div className="small text-secondary mb-3">
          Hóa đơn chờ thanh toán: mở hóa đơn để quét mã QR chuyển khoản. Giữ nguyên nội dung chuyển
          khoản để hệ thống tự ghi nhận.
        </div>
      )}

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

      {showBulk && (
        <BulkInvoiceModal
          onHide={() => setShowBulk(false)}
          onDone={() => {
            setShowBulk(false);
            reload();
          }}
        />
      )}
    </>
  );
};

export default InvoiceListPage;
