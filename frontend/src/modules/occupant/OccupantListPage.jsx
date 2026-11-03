// UC-30: danh sách cư dân trong tòa (Manager, /occupants). Mặc định chỉ người Đang ở; lọc trạng thái, tìm theo mã phòng
// Khuôn danh sách như trang Hóa đơn: ControlBar, đổi Thẻ / Bảng, Pager. Bấm một người → trang chi tiết
// UC-32: nút "Thêm người ở cùng" (chọn phòng có hợp đồng đang hiệu lực). Từ chi tiết hợp đồng mở sang với
// location.state.addTo = { _id, roomNumber } → popup mở sẵn đúng phòng, thêm xong quay lại hợp đồng
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiReset, BiUserPlus } from 'react-icons/bi';
import { useLocation, useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ItemCard from '../../components/ItemCard';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { OCCUPANT_STATUS } from '../../constants/enums';
import { OCCUPANT_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import occupantApi from './occupant.api';
import AddOccupantModal from './components/AddOccupantModal';

const LIMIT = 12; // 12 thẻ = 3 hàng × 4 cột
const DEFAULT_FILTERS = { status: [OCCUPANT_STATUS.STAYED] }; // giống mặc định của BE
const ALL_STATUS = Object.values(OCCUPANT_STATUS).join(',');

const roomText = (occupant) =>
  occupant.room ? `Phòng ${occupant.room.roomNumber} · Tầng ${occupant.room.floorNumber}` : '—';

const OccupantListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true); // lần tải đầu (và Thử lại): khung xương
  const [refreshing, setRefreshing] = useState(false); // đổi lọc / trang: làm mờ danh sách cũ
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [view, setView] = useState('table');
  const [reloadKey, setReloadKey] = useState(0);
  const [rooms, setRooms] = useState([]); // phòng của tòa để đổi mã phòng → roomId
  // popup thêm: true = tự chọn phòng; { _id, roomNumber } = phòng chọn sẵn (mở từ chi tiết hợp đồng)
  const [adding, setAdding] = useState(() => location.state?.addTo ?? null);
  const returnTo = location.state?.returnTo ?? null;

  const buildingId = user.building?._id;
  useEffect(() => {
    if (!buildingId) return;
    occupantApi
      .rooms(buildingId)
      .then((response) => setRooms(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRooms([]));
  }, [buildingId]);

  const filterGroups = useMemo(
    () => [
      {
        id: 'status',
        label: 'Trạng thái',
        type: 'checkbox',
        options: Object.values(OCCUPANT_STATUS).map((status) => ({
          value: status,
          label: OCCUPANT_STATUS_LABEL[status].label,
        })),
      },
    ],
    [],
  );

  // ô tìm: mã phòng → roomId (API không có ?q). Gõ phòng không có trong tòa thì không gọi API, báo không có
  const keyword = query.trim();
  const matchedRoom = keyword ? rooms.find((room) => room.roomNumber === keyword) : null;
  const noMatch = Boolean(keyword && !matchedRoom && rooms.length > 0);
  const roomId = matchedRoom?._id ?? '';
  // bỏ hết ô trạng thái = xem cả hai (BE không truyền status thì chỉ trả Đang ở)
  const statusParam = filters.status.length ? filters.status.join(',') : ALL_STATUS;

  // ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp (gõ / bấm nhanh)
  useEffect(() => {
    if (noMatch) return undefined;
    let ignore = false;
    const params = { page, limit: LIMIT, status: statusParam };
    if (roomId) params.roomId = roomId;

    occupantApi
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
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setRefreshing(true);
  };
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const closeAdd = () => {
    setAdding(null);
    // mở từ hợp đồng: xóa state để tải lại trang không bật lại popup
    if (location.state?.addTo) navigate(location.pathname, { replace: true, state: null });
  };
  const handleAdded = () => {
    setAdding(null);
    if (returnTo) {
      navigate(returnTo, { replace: true });
      return;
    }
    reload();
  };

  const isDefaultFilter =
    filters.status.length === 1 && filters.status[0] === OCCUPANT_STATUS.STAYED;
  const isFiltering = Boolean(keyword || !isDefaultFilter);
  const items = noMatch ? [] : data.items;
  const total = noMatch ? 0 : data.total;

  const columns = [
    { key: 'name', title: 'Họ tên', className: 'fw-semibold' },
    { key: 'cccd', title: 'CCCD' },
    { key: 'phone', title: 'Số điện thoại' },
    { key: 'room', title: 'Phòng', render: roomText },
    { key: 'roleLabel', title: 'Vai trò' },
    { key: 'joinDate', title: 'Ngày vào ở', render: (row) => formatDate(row.joinDate) },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={OCCUPANT_STATUS_LABEL} value={row.status} />,
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
        <ErrorState message="Không tải được danh sách cư dân" detail={loadError} onRetry={reload} />
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
                    ? `Tòa của bạn không có phòng "${keyword}". Gõ đúng mã phòng, vd 101.`
                    : 'Không có cư dân nào phù hợp. Thử đổi phòng hoặc bộ lọc trạng thái.'
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
              <EmptyState message="Chưa có cư dân nào." />
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
          onRowClick={(row) => navigate(`/occupants/${row._id}`)}
        />
      );
    }

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((occupant) => (
          <ItemCard
            key={occupant._id}
            to={`/occupants/${occupant._id}`}
            // index.css gạch chân link khi rê chuột → tắt riêng cho thẻ
            className="no-underline"
            title={occupant.name}
            badge={<StatusBadge map={OCCUPANT_STATUS_LABEL} value={occupant.status} />}
            subtitle={`${roomText(occupant)} · ${occupant.roleLabel}`}
            stats={
              <>
                <span>CCCD {occupant.cccd}</span>
                <span>{occupant.phone}</span>
              </>
            }
            footer={
              <>
                <span>Vào ở: {formatDate(occupant.joinDate)}</span>
                {occupant.exitDate && <span>Ra: {formatDate(occupant.exitDate)}</span>}
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
              onClick={() => setAdding(true)}
            >
              <BiUserPlus />
              Thêm người ở cùng
            </Button>
          }
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Tìm theo mã phòng, vd 101..."
          filterGroups={filterGroups}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          count={loading || loadError ? null : `${total} cư dân`}
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

      {adding && (
        <AddOccupantModal
          presetContract={adding === true ? null : adding}
          onHide={closeAdd}
          onSaved={handleAdded}
        />
      )}
    </>
  );
};

export default OccupantListPage;
