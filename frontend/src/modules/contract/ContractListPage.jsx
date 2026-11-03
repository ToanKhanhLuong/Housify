// UC-25: danh sách hợp đồng (Manager) – hợp đồng tòa mình, mới nhất trước, có phân trang (api.md)
// Khuôn danh sách như Hóa đơn: ControlBar (nút Tạo hợp đồng, tìm mã phòng, lọc trạng thái), đổi Thẻ / Bảng, Pager
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
import MoneyText from '../../components/MoneyText';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { CONTRACT_STATUS } from '../../constants/enums';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import contractApi from './contract.api';
import { representativeLabel } from './contractFormat';

const LIMIT = 12;
const FILTER_GROUPS = [
  {
    id: 'status',
    label: 'Trạng thái',
    type: 'checkbox',
    options: Object.values(CONTRACT_STATUS).map((status) => ({
      value: status,
      label: CONTRACT_STATUS_LABEL[status].label,
    })),
  },
];

const ContractListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ status: [] });
  const [page, setPage] = useState(1);
  const [view, setView] = useState('table');
  const [reloadKey, setReloadKey] = useState(0);
  const [rooms, setRooms] = useState([]);

  // phòng của tòa để đổi mã phòng gõ vào → roomId
  const buildingId = user.building?._id;
  useEffect(() => {
    if (!buildingId) return;
    contractApi
      .rooms(buildingId)
      .then((response) => setRooms(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRooms([]));
  }, [buildingId]);

  const keyword = query.trim();
  const matchedRoom = keyword ? rooms.find((room) => room.roomNumber === keyword) : null;
  const noMatch = Boolean(keyword && rooms.length > 0 && !matchedRoom);
  const roomId = matchedRoom?._id ?? '';
  const statusParam = filters.status.join(',');

  // ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp
  useEffect(() => {
    if (noMatch) return undefined;
    let ignore = false;
    const params = { page, limit: LIMIT };
    if (statusParam) params.status = statusParam;
    if (roomId) params.roomId = roomId;
    contractApi
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
  }, [page, statusParam, roomId, noMatch, reloadKey]);

  const handleSearchChange = (value) => {
    setQuery(value);
    setPage(1);
    setRefreshing(true);
  };
  const handleFilterChange = (next) => {
    setFilters({ status: next.status ?? [] });
    setPage(1);
    setRefreshing(true);
  };
  const handlePageChange = (next) => {
    setPage(next);
    setRefreshing(true);
  };
  const handleResetFilters = () => {
    setQuery('');
    setFilters({ status: [] });
    setPage(1);
    setRefreshing(true);
  };
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const isFiltering = Boolean(keyword || filters.status.length);
  const items = noMatch ? [] : data.items;
  const total = noMatch ? 0 : data.total;

  const columns = [
    {
      key: 'room',
      title: 'Phòng',
      className: 'fw-semibold',
      render: (row) => row.room?.roomNumber ?? '—',
    },
    {
      key: 'type',
      title: 'Loại',
      render: (row) => CONTRACT_TYPE_LABEL[row.contractType]?.label ?? '—',
    },
    {
      key: 'representative',
      title: 'Người đại diện',
      render: (row) => representativeLabel(row.representative),
    },
    {
      key: 'occupantCount',
      title: 'Số người',
      align: 'end',
      render: (row) => row.occupantCount ?? 0,
    },
    { key: 'startDate', title: 'Bắt đầu', render: (row) => formatDate(row.startDate) },
    { key: 'endDate', title: 'Kết thúc', render: (row) => formatDate(row.endDate) },
    {
      key: 'rentPrice',
      title: 'Giá thuê',
      align: 'end',
      render: (row) => <MoneyText value={row.rentPrice} />,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={CONTRACT_STATUS_LABEL} value={row.status} />,
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
    if (loadError)
      return (
        <ErrorState
          message="Không tải được danh sách hợp đồng"
          detail={loadError}
          onRetry={reload}
        />
      );
    if (items.length === 0) {
      return (
        <Card>
          <Card.Body>
            {isFiltering ? (
              <EmptyState
                message={
                  noMatch
                    ? `Tòa của bạn không có phòng "${keyword}".`
                    : 'Không có hợp đồng nào phù hợp. Thử đổi mã phòng hoặc bỏ bớt bộ lọc.'
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
              <EmptyState message="Tòa chưa có hợp đồng nào. Bấm Tạo hợp đồng để bắt đầu.">
                <Button variant="secondary" onClick={() => navigate('/contracts/new')}>
                  Tạo hợp đồng
                </Button>
              </EmptyState>
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
          onRowClick={(row) => navigate(`/contracts/${row._id}`)}
        />
      );
    }
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((contract) => (
          <ItemCard
            key={contract._id}
            to={`/contracts/${contract._id}`}
            className="no-underline"
            title={`Phòng ${contract.room?.roomNumber ?? '—'}`}
            badge={<StatusBadge map={CONTRACT_STATUS_LABEL} value={contract.status} />}
            subtitle={`${CONTRACT_TYPE_LABEL[contract.contractType]?.label ?? ''} · ${representativeLabel(contract.representative)}`}
            stats={
              <span className="fs-6 fw-bold text-body">
                <MoneyText value={contract.rentPrice} />
                <span className="small fw-normal text-secondary"> / tháng</span>
              </span>
            }
            footer={
              <>
                <span>
                  {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                </span>
                <span>{contract.occupantCount ?? 0} người</span>
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
            <Button
              variant="primary"
              className="flex items-center gap-1"
              onClick={() => navigate('/contracts/new')}
            >
              <BiPlus />
              Tạo hợp đồng
            </Button>
          }
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Tìm theo mã phòng, vd 101..."
          filterGroups={FILTER_GROUPS}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          count={loading || loadError ? null : `${total} hợp đồng`}
          view={view}
          onViewChange={setView}
        />
      </Card>

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

export default ContractListPage;
