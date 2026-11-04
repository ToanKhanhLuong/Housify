// UC-43, 44: danh sách đơn sự cố. Manager (/incidents) xem đơn cả tòa, lọc trạng thái, loại, thời gian, tìm theo mã phòng
// Customer (/my-incidents) xem đơn mình gửi, có nút "Tạo báo cáo sự cố". Khuôn như trang Hóa đơn: ControlBar, Thẻ / Bảng, Pager
// API không có ?q nên mã phòng gõ vào ô tìm được đổi sang roomId
import { useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiPlus, BiReset } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ItemCard from '../../components/ItemCard';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { INCIDENT_STATUS, INCIDENT_TYPE, ROLE } from '../../constants/enums';
import { INCIDENT_STATUS_LABEL, INCIDENT_TYPE_LABEL } from '../../constants/statusLabels';
import { formatDate, formatDateTime } from '../../utils/format';
import incidentApi from './incident.api';
import CreateIncidentModal from './components/CreateIncidentModal';

const LIMIT = 12; // 12 thẻ = 3 hàng × 4 cột
const EMPTY_FILTERS = { status: [], type: [], from: '', to: '' };
const EMPTY_DATA = { items: [], total: 0, page: 1, limit: LIMIT };

const FILTER_GROUPS = [
  {
    id: 'status',
    label: 'Trạng thái',
    type: 'checkbox',
    options: Object.values(INCIDENT_STATUS).map((status) => ({
      value: status,
      label: INCIDENT_STATUS_LABEL[status].label,
    })),
  },
  {
    id: 'type',
    label: 'Loại sự cố',
    type: 'checkbox',
    beside: true,
    options: Object.values(INCIDENT_TYPE).map((type) => ({
      value: type,
      label: INCIDENT_TYPE_LABEL[type].label,
    })),
  },
  { id: 'createdAt', label: 'Ngày gửi', type: 'dateRange', minField: 'from', maxField: 'to' },
];

const IncidentListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user.role === ROLE.MANAGER;
  const basePath = isManager ? '/incidents' : '/my-incidents';

  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true); // lần tải đầu (và Thử lại): khung xương
  const [refreshing, setRefreshing] = useState(false); // đổi lọc / trang: làm mờ danh sách cũ
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [view, setView] = useState(isManager ? 'table' : 'cards');
  const [reloadKey, setReloadKey] = useState(0);
  const [rooms, setRooms] = useState([]); // phòng của tòa (Manager) để đổi mã phòng → roomId
  const [creating, setCreating] = useState(false);

  const buildingId = user.building?._id;
  useEffect(() => {
    if (!isManager || !buildingId) return;
    incidentApi
      .rooms(buildingId)
      .then((response) => setRooms(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRooms([]));
  }, [isManager, buildingId]);

  // ô tìm chỉ dùng cho Manager: mã phòng → roomId. Gõ phòng không có trong tòa thì không gọi API, báo không có
  const keyword = isManager ? query.trim() : '';
  const matchedRoom = keyword ? rooms.find((room) => room.roomNumber === keyword) : null;
  const noMatch = Boolean(keyword && !matchedRoom && rooms.length > 0);
  const roomId = matchedRoom?._id ?? '';
  const statusParam = filters.status.join(',');
  const typeParam = filters.type.join(',');
  const { from, to } = filters;

  // ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp (gõ / bấm nhanh)
  useEffect(() => {
    if (noMatch) return undefined;
    let ignore = false;
    const params = { page, limit: LIMIT };
    if (statusParam) params.status = statusParam;
    if (typeParam) params.type = typeParam;
    if (roomId) params.roomId = roomId;
    if (from) params.from = from;
    if (to) params.to = to;

    incidentApi
      .list(params)
      .then((response) => {
        if (ignore) return;
        setData(response.data ?? EMPTY_DATA);
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
  }, [page, statusParam, typeParam, roomId, from, to, noMatch, reloadKey]);

  const handleSearchChange = (value) => {
    setQuery(value);
    // ô tìm của Customer không lọc gì nên không tải lại
    if (!isManager) return;
    setPage(1);
    setRefreshing(true);
  };
  const handleFilterChange = (next) => {
    let nextFrom = next.from || '';
    let nextTo = next.to || '';
    // chọn ngược (Từ sau Đến) thì đảo lại
    if (nextFrom && nextTo && nextFrom > nextTo) [nextFrom, nextTo] = [nextTo, nextFrom];
    setFilters({ status: next.status ?? [], type: next.type ?? [], from: nextFrom, to: nextTo });
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

  const isFiltering = Boolean(keyword || statusParam || typeParam || from || to);
  const items = noMatch ? [] : data.items;
  const total = noMatch ? 0 : data.total;
  const roomText = (row) => (row.room ? `Phòng ${row.room.roomNumber}` : '—');

  const columns = [
    { key: 'incidentCode', title: 'Mã đơn', className: 'fw-semibold' },
    {
      key: 'title',
      title: 'Tiêu đề',
      render: (row) => (
        <span className="block max-w-96 truncate" title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: 'type',
      title: 'Loại',
      render: (row) => INCIDENT_TYPE_LABEL[row.type]?.label ?? '—',
    },
    ...(isManager
      ? [
          { key: 'room', title: 'Phòng', render: roomText },
          { key: 'reporter', title: 'Người gửi', render: (row) => row.reporter?.name ?? '—' },
        ]
      : []),
    { key: 'createdAt', title: 'Ngày gửi', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={INCIDENT_STATUS_LABEL} value={row.status} />,
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
      return <ErrorState message="Không tải được danh sách sự cố" detail={loadError} onRetry={reload} />;
    }
    if (items.length === 0) {
      return (
        <Card>
          <Card.Body>
            {isFiltering ? (
              <EmptyState
                message={
                  noMatch
                    ? `Tòa của bạn không có phòng "${keyword}". Gõ đúng mã phòng, vd 101.`
                    : 'Không có đơn nào phù hợp. Thử bỏ bớt bộ lọc.'
                }
              >
                <Button variant="secondary" className="flex items-center gap-1" onClick={handleResetFilters}>
                  <BiReset />
                  Xóa bộ lọc
                </Button>
              </EmptyState>
            ) : (
              <EmptyState message={isManager ? 'Tòa chưa có báo cáo sự cố nào.' : 'Bạn chưa gửi báo cáo sự cố nào.'} />
            )}
          </Card.Body>
        </Card>
      );
    }

    if (view === 'table') {
      return (
        <DataTable columns={columns} data={items} onRowClick={(row) => navigate(`${basePath}/${row._id}`)} />
      );
    }

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((incident) => (
          <ItemCard
            key={incident._id}
            to={`${basePath}/${incident._id}`}
            className="no-underline"
            title={incident.title}
            badge={<StatusBadge map={INCIDENT_STATUS_LABEL} value={incident.status} />}
            subtitle={`${incident.incidentCode} · ${INCIDENT_TYPE_LABEL[incident.type]?.label ?? ''}`}
            footer={
              <>
                <span>{isManager ? roomText(incident) : 'Ngày gửi'}</span>
                <span>{formatDate(incident.createdAt)}</span>
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
            !isManager && (
              <Button variant="primary" className="flex items-center gap-1" onClick={() => setCreating(true)}>
                <BiPlus />
                Tạo báo cáo sự cố
              </Button>
            )
          }
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder={isManager ? 'Tìm theo mã phòng, vd 101...' : 'Lọc theo trạng thái, loại, ngày gửi...'}
          filterGroups={FILTER_GROUPS}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          count={loading || loadError ? null : `${total} đơn`}
          view={view}
          onViewChange={setView}
        />
      </Card>

      {/* gõ phòng không có trong tòa thì không gọi API nên không làm mờ */}
      <div
        className={`transition-opacity ${refreshing && !noMatch ? 'opacity-50' : ''}`}
        aria-busy={refreshing && !noMatch}
      >
        {renderContent()}
      </div>

      {!loading && !loadError && total > 0 && (
        <div className="flex justify-end mt-3">
          <Pager page={data.page} limit={data.limit} total={total} onChange={handlePageChange} />
        </div>
      )}

      {creating && (
        <CreateIncidentModal
          onHide={() => setCreating(false)}
          onCreated={(incident) => {
            setCreating(false);
            navigate(`${basePath}/${incident._id}`);
          }}
        />
      )}
    </>
  );
};

export default IncidentListPage;
