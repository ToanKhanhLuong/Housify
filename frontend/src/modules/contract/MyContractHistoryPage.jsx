// UC-25 (Customer): xem lịch sử các hợp đồng đang hiệu lực và đã kết thúc mà mình từng đứng tên đại diện (chỉ xem)
// Khuôn danh sách Odoo: ControlBar (tìm theo phòng / tòa nhà, lọc trạng thái, loại hợp đồng, khoảng ngày bắt đầu), Thẻ / Bảng, Pager
import { useCallback, useState, useEffect } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiLayer, BiListUl, BiReset } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import MoneyText from '../../components/MoneyText';
import PageHeader from '../../components/PageHeader';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { CONTRACT_STATUS, CONTRACT_TYPE } from '../../constants/enums';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../constants/statusLabels';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useSavedState } from '../../utils/filter';
import contractApi from './contract.api';
import { ContractCard, Representative, Term } from './components/ContractListParts';

const LIMIT = 12;
const EMPTY_FILTERS = { status: [], contractType: [], from: '', to: '' };
const CUSTOMER_STATUSES = [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED];

const VIEW_OPTIONS = [
  { id: 'cards', icon: BiLayer, title: 'Dạng thẻ' },
  { id: 'table', icon: BiListUl, title: 'Dạng bảng' },
];

const FILTER_GROUPS = [
  {
    id: 'status',
    label: 'Trạng thái',
    type: 'checkbox',
    options: CUSTOMER_STATUSES.map((status) => ({
      value: status,
      label: CONTRACT_STATUS_LABEL[status].label,
    })),
  },
  {
    id: 'contractType',
    label: 'Loại hợp đồng',
    type: 'checkbox',
    beside: true,
    options: Object.values(CONTRACT_TYPE).map((type) => ({
      value: type,
      label: CONTRACT_TYPE_LABEL[type].label,
    })),
  },
  {
    id: 'startDate',
    label: 'Ngày bắt đầu',
    type: 'dateRange',
    minField: 'from',
    maxField: 'to',
  },
];

const MyContractHistoryPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useSavedState('my-contracts:query', '');
  const [filters, setFilters] = useSavedState('my-contracts:filters', EMPTY_FILTERS);
  const [page, setPage] = useSavedState('my-contracts:page', 1);
  const [view, setView] = useSavedState('my-contracts:view', 'cards');
  const [reloadKey, setReloadKey] = useState(0);
  // mốc thời gian để tính "còn X ngày" – lấy 1 lần khi mở trang (render phải thuần)
  const [now] = useState(() => Date.now());

  const keyword = query.trim();
  const statusList = filters.status ?? [];
  const contractTypeList = filters.contractType ?? [];
  const statusParam = statusList.join(',');
  const contractTypeParam = contractTypeList.join(',');
  const fromParam = filters.from || '';
  const toParam = filters.to || '';

  useEffect(() => {
    let ignore = false;
    const params = { page, limit: LIMIT };
    if (statusParam) params.status = statusParam;
    if (contractTypeParam) params.contractType = contractTypeParam;
    if (fromParam) params.from = fromParam;
    if (toParam) params.to = toParam;
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
  }, [page, statusParam, contractTypeParam, fromParam, toParam, keyword, reloadKey]);

  const silentRefresh = useCallback(() => {
    const params = { page, limit: LIMIT };
    if (statusParam) params.status = statusParam;
    if (contractTypeParam) params.contractType = contractTypeParam;
    if (fromParam) params.from = fromParam;
    if (toParam) params.to = toParam;
    if (keyword) params.q = keyword;
    return contractApi.list(params).then((response) => {
      if (response.data) setData(response.data);
    });
  }, [page, statusParam, contractTypeParam, fromParam, toParam, keyword]);

  useAutoRefresh(silentRefresh, { enabled: !loading && !loadError });

  const handleSearchChange = (value) => {
    setQuery(value);
    setPage(1);
    setRefreshing(true);
  };
  const handleFilterChange = (next) => {
    setFilters({
      status: next.status ?? [],
      contractType: next.contractType ?? [],
      from: next.from ?? '',
      to: next.to ?? '',
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
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setRefreshing(true);
  };
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const isFiltering = Boolean(
    keyword || statusList.length || contractTypeList.length || fromParam || toParam,
  );
  const items = data.items;
  const total = data.total;

  const columns = [
    {
      key: 'room',
      title: 'Phòng',
      render: (row) => (
        <span className="flex flex-col">
          <span className="fs-6 fw-bold">Phòng {row.room?.roomNumber ?? '—'}</span>
          <span className="small text-secondary">
            {row.room?.buildingName ? `${row.room.buildingName} · ` : ''}
            {CONTRACT_TYPE_LABEL[row.contractType]?.label ?? '—'} · Tầng {row.room?.floorNumber ?? '—'}
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
            <SkeletonRows rows={4} columns={5} />
          </Card.Body>
        </Card>
      );
    }
    if (loadError) {
      return (
        <ErrorState
          message="Không tải được lịch sử hợp đồng"
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
              <EmptyState message="Không có hợp đồng nào phù hợp. Thử đổi từ khóa hoặc bỏ bớt bộ lọc.">
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
              <EmptyState message="Bạn chưa có lịch sử hợp đồng thuê phòng nào." />
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
          onRowClick={(row) => navigate(`/my-contract/${row._id}`)}
        />
      );
    }
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((contract) => (
          <ContractCard
            key={contract._id}
            contract={contract}
            now={now}
            basePath="/my-contract"
            showBuilding
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        backTo="/my-contract"
        breadcrumbs={[{ label: 'Hợp đồng của tôi', to: '/my-contract' }, 'Lịch sử hợp đồng']}
      />

      <div className="small text-secondary mb-3">
        Xem lại các hợp đồng đang hiệu lực và đã kết thúc mà bạn đứng tên đại diện (chỉ xem).
      </div>

      {/* không dùng overflow-hidden: bảng Bộ lọc xổ ra ngoài thẻ sẽ bị cắt */}
      <Card className="mb-3">
        <ControlBar
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Tìm theo số phòng, tên tòa nhà..."
          filterGroups={FILTER_GROUPS}
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

export default MyContractHistoryPage;
