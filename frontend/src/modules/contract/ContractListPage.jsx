// UC-25: danh sách hợp đồng (Manager) – hợp đồng tòa mình, mới nhất trước, có phân trang (api.md)
// Khuôn danh sách như Hóa đơn: ControlBar (nút Tạo hợp đồng, tìm phòng / tên, lọc trạng thái / tầng), đổi Thẻ / Bảng, Pager
// Cột Thời hạn có thanh tiến độ, nhãn còn X ngày (vàng khi sắp hết hạn)
// Tìm kiếm theo số phòng, tên người đại diện, SĐT, CCCD; lọc trạng thái và tầng
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiLayer, BiListUl, BiPlus, BiReset } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import MoneyText from '../../components/MoneyText';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { CONTRACT_STATUS } from '../../constants/enums';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../constants/statusLabels';
import contractApi from './contract.api';
import buildingApi from '../building/building.api';
import { ContractCard, Representative, Term } from './components/ContractListParts';

const LIMIT = 12;

const VIEW_OPTIONS = [
  { id: 'cards', icon: BiLayer, title: 'Dạng thẻ' },
  { id: 'table', icon: BiListUl, title: 'Dạng bảng' },
];

const ContractListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ status: [], floor: [] });
  const [page, setPage] = useState(1);
  const [view, setView] = useState('cards');
  const [reloadKey, setReloadKey] = useState(0);
  const [floorCount, setFloorCount] = useState(0);
  // mốc thời gian để tính "còn X ngày" – lấy 1 lần khi mở trang (render phải thuần)
  const [now] = useState(() => Date.now());

  const buildingId = user.building?._id;

  // Lấy thông tin tòa nhà để có số tầng (phục vụ lọc theo tầng)
  useEffect(() => {
    if (!buildingId) return;
    buildingApi
      .detail(buildingId)
      .then((response) => {
        if (response.data?.floorCount) {
          setFloorCount(response.data.floorCount);
        }
      })
      .catch(() => {});
  }, [buildingId]);

  const totalFloors = floorCount || user.building?.floorCount || 0;

  const filterGroups = useMemo(() => {
    const groups = [
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

    if (totalFloors > 0) {
      groups.push({
        id: 'floor',
        label: 'Tầng',
        type: 'checkbox',
        beside: true,
        maxVisible: 5,
        options: Array.from({ length: totalFloors }, (_, index) => ({
          value: String(index + 1),
          label: `Tầng ${index + 1}`,
        })),
      });
    }

    return groups;
  }, [totalFloors]);

  const keyword = query.trim();
  const statusParam = filters.status.join(',');
  const floorParam = filters.floor.join(',');

  // ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp
  useEffect(() => {
    let ignore = false;
    const params = { page, limit: LIMIT };
    if (statusParam) params.status = statusParam;
    if (floorParam) params.floor = floorParam;
    if (keyword) params.q = keyword;
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
  }, [page, statusParam, floorParam, keyword, reloadKey]);

  const handleSearchChange = (value) => {
    setQuery(value);
    setPage(1);
    setRefreshing(true);
  };
  const handleFilterChange = (next) => {
    setFilters({
      status: next.status ?? [],
      floor: next.floor ?? [],
    });
    setPage(1);
    setRefreshing(true);
  };
  const handlePageChange = (next) => {
    setPage(next);
    setRefreshing(true);
  };
  const handleResetFilters = () => {
    setQuery('');
    setFilters({ status: [], floor: [] });
    setPage(1);
    setRefreshing(true);
  };
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const isFiltering = Boolean(keyword || filters.status.length || filters.floor.length);
  const items = data.items;
  const total = data.total;

  const columns = [
    {
      key: 'room',
      title: 'Phòng',
      render: (row) => (
        <span className="flex flex-col">
          <span className="fs-6 fw-bold">{row.room?.roomNumber ?? '—'}</span>
          <span className="small text-secondary">
            {CONTRACT_TYPE_LABEL[row.contractType]?.label ?? '—'} · {row.occupantCount ?? 0} người
          </span>
        </span>
      ),
    },
    {
      key: 'representative',
      title: 'Người đại diện',
      render: (row) => <Representative contract={row} />,
    },
    { key: 'term', title: 'Thời hạn', render: (row) => <Term contract={row} now={now} /> },
    {
      key: 'rentPrice',
      title: 'Giá thuê',
      align: 'end',
      render: (row) => (
        <span className="flex flex-col items-end">
          <MoneyText value={row.rentPrice} className="fw-semibold" />
          <span className="small text-secondary">/ tháng</span>
        </span>
      ),
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
                message="Không có hợp đồng nào phù hợp. Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
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
          <ContractCard key={contract._id} contract={contract} now={now} />
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
          searchPlaceholder="Tìm theo phòng, tên người..."
          filterGroups={filterGroups}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          count={loading || loadError ? null : `${total} hợp đồng`}
          view={view}
          onViewChange={setView}
          viewOptions={VIEW_OPTIONS}
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
