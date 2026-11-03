// UC-29 (Admin, /terminations): danh sách đơn chấm dứt – mặc định lọc đơn Đơn phương đang Chờ xử lý để duyệt / từ chối
// Lọc trạng thái, loại đơn (bỏ hết = xem tất cả), phân trang (api.md). Bấm một đơn → chi tiết /terminations/:id
// Manager mở cùng trang thì thấy đơn của tòa mình (BE tự lọc)
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiReset } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { ROLE, TERMINATION_STATUS, TERMINATION_TYPE } from '../../constants/enums';
import { TERMINATION_STATUS_LABEL, TERMINATION_TYPE_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import terminationApi from './termination.api';

const LIMIT = 12;
const EMPTY_DATA = { items: [], total: 0, page: 1, limit: LIMIT };

const TerminationListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;
  // Admin: mở trang là thấy ngay đơn đơn phương chờ duyệt
  const defaultFilters = useMemo(
    () =>
      isAdmin
        ? { status: [TERMINATION_STATUS.PENDING], type: [TERMINATION_TYPE.UNILATERAL] }
        : { status: [], type: [] },
    [isAdmin],
  );

  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const filterGroups = useMemo(
    () => [
      {
        id: 'status',
        label: 'Trạng thái',
        type: 'checkbox',
        options: Object.values(TERMINATION_STATUS).map((status) => ({
          value: status,
          label: TERMINATION_STATUS_LABEL[status].label,
        })),
      },
      {
        id: 'type',
        label: 'Loại đơn',
        type: 'checkbox',
        options: Object.values(TERMINATION_TYPE).map((type) => ({
          value: type,
          label: TERMINATION_TYPE_LABEL[type].label,
        })),
      },
    ],
    [],
  );

  const statusParam = filters.status.join(',');
  const typeParam = filters.type.join(',');

  useEffect(() => {
    let ignore = false;
    const params = { page, limit: LIMIT };
    if (statusParam) params.status = statusParam;
    if (typeParam) params.type = typeParam;
    terminationApi
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
  }, [page, statusParam, typeParam, reloadKey]);

  const handleFilterChange = (next) => {
    setFilters({ status: next.status ?? [], type: next.type ?? [] });
    setPage(1);
    setRefreshing(true);
  };
  const handlePageChange = (next) => {
    setPage(next);
    setRefreshing(true);
  };
  const handleReset = () => {
    setFilters(defaultFilters);
    setPage(1);
    setRefreshing(true);
  };
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const columns = [
    {
      key: 'room',
      title: 'Phòng',
      className: 'fw-semibold',
      render: (row) => (row.room ? `Phòng ${row.room.roomNumber}` : '—'),
    },
    { key: 'building', title: 'Tòa nhà', render: (row) => row.room?.building?.name ?? '—' },
    {
      key: 'type',
      title: 'Loại đơn',
      render: (row) => <StatusBadge map={TERMINATION_TYPE_LABEL} value={row.type} />,
    },
    { key: 'representative', title: 'Người đại diện', render: (row) => row.representative?.name ?? '—' },
    {
      key: 'reason',
      title: 'Lý do',
      render: (row) => (
        <span className="block max-w-72 truncate" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    { key: 'effectiveDate', title: 'Ngày hiệu lực', render: (row) => formatDate(row.effectiveDate) },
    { key: 'createdAt', title: 'Ngày gửi', render: (row) => formatDate(row.createdAt) },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={TERMINATION_STATUS_LABEL} value={row.status} />,
    },
  ];

  const isFiltering = statusParam !== defaultFilters.status.join(',') || typeParam !== defaultFilters.type.join(',');

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
      return <ErrorState message="Không tải được danh sách đơn chấm dứt" detail={loadError} onRetry={reload} />;
    }
    if (data.items.length === 0) {
      return (
        <Card>
          <Card.Body>
            <EmptyState
              message={
                isAdmin && !isFiltering
                  ? 'Không có đơn đơn phương nào đang chờ duyệt.'
                  : 'Không có đơn chấm dứt nào phù hợp bộ lọc.'
              }
            >
              {isFiltering && (
                <Button variant="secondary" className="flex items-center gap-1" onClick={handleReset}>
                  <BiReset />
                  Về bộ lọc mặc định
                </Button>
              )}
            </EmptyState>
          </Card.Body>
        </Card>
      );
    }
    return (
      <DataTable
        columns={columns}
        data={data.items}
        onRowClick={(row) => navigate(`/terminations/${row._id}`)}
      />
    );
  };

  return (
    <>
      <Card className="mb-3">
        <ControlBar
          searchPlaceholder="Lọc theo trạng thái, loại đơn..."
          filterGroups={filterGroups}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          count={loading || loadError ? null : `${data.total} đơn`}
        />
      </Card>

      <div className={`transition-opacity ${refreshing ? 'opacity-50' : ''}`} aria-busy={refreshing}>
        {renderContent()}
      </div>

      {!loading && !loadError && data.total > 0 && (
        <div className="flex justify-end mt-3">
          <Pager page={data.page} limit={data.limit} total={data.total} onChange={handlePageChange} />
        </div>
      )}
    </>
  );
};

export default TerminationListPage;
