// UC-30: cư dân trong tòa (Manager, /occupants). Đầu trang là dải số liệu (người đang ở, phòng có người, chỗ trống…)
// Mặc định xem "Theo phòng": mỗi phòng một thẻ (sức chứa dạng chấm, thành viên có avatar, nút Thêm người khi còn chỗ)
// Đổi sang "Bảng" để xem từng người, có phân trang. Lọc Đang ở / Đã chuyển đi (mặc định Đang ở như BE), tìm theo mã phòng
// UC-32: "Thêm người ở cùng". Từ chi tiết hợp đồng mở sang với location.state.addTo = { _id, roomNumber } → popup mở sẵn
// đúng phòng, thêm xong quay lại hợp đồng (location.state.returnTo)
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiGridAlt, BiListUl, BiReset, BiUserPlus } from 'react-icons/bi';
import { useLocation, useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { OCCUPANT_STATUS } from '../../constants/enums';
import { OCCUPANT_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import occupantApi from './occupant.api';
import { groupByRoom } from './occupantFormat';
import AddOccupantModal from './components/AddOccupantModal';
import OccupancyStats from './components/OccupancyStats';
import OccupantAvatar from './components/OccupantAvatar';
import RoomGroupCard from './components/RoomGroupCard';

const PAGE_LIMIT = 12; // chế độ Bảng
const ALL_LIMIT = 50; // chế độ Theo phòng: tải hết (BE cho tối đa 50 mỗi lần) để gom đủ người của mỗi phòng
const DEFAULT_FILTERS = { status: [OCCUPANT_STATUS.STAYED] }; // giống mặc định của BE
const ALL_STATUS = Object.values(OCCUPANT_STATUS).join(',');
const VIEW_OPTIONS = [
  { id: 'rooms', icon: BiGridAlt, title: 'Theo phòng' },
  { id: 'table', icon: BiListUl, title: 'Bảng' },
];
const EMPTY_DATA = { items: [], total: 0, page: 1, limit: PAGE_LIMIT };

// Theo phòng: gọi lần lượt từng trang 50 người tới hết
const fetchAll = async (params) => {
  const first = await occupantApi.list({ ...params, page: 1, limit: ALL_LIMIT });
  const items = [...(first.data?.items ?? [])];
  const totalPages = first.data?.totalPages ?? 1;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await occupantApi.list({ ...params, page, limit: ALL_LIMIT });
    items.push(...(next.data?.items ?? []));
  }
  return { items, total: first.data?.total ?? items.length, page: 1, limit: ALL_LIMIT };
};

const OccupantListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true); // lần tải đầu (và Thử lại): khung xương
  const [refreshing, setRefreshing] = useState(false); // đổi lọc / trang: làm mờ danh sách cũ
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [view, setView] = useState('rooms');
  const [reloadKey, setReloadKey] = useState(0);
  const [rooms, setRooms] = useState([]); // phòng của tòa: đổi mã phòng → roomId, sức chứa, dải số liệu
  // popup thêm: true = tự chọn phòng; { _id, roomNumber } = phòng chọn sẵn
  const [adding, setAdding] = useState(() => location.state?.addTo ?? null);
  const returnTo = location.state?.returnTo ?? null;

  // phòng tải lại mỗi khi danh sách tải lại (thêm / rời phòng làm đổi số người)
  const buildingId = user.building?._id;
  useEffect(() => {
    if (!buildingId) return;
    occupantApi
      .rooms(buildingId)
      .then((response) => setRooms(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRooms([]));
  }, [buildingId, reloadKey]);
  const roomsById = useMemo(
    () => Object.fromEntries(rooms.map((room) => [room._id, room])),
    [rooms],
  );

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
    const params = { status: statusParam };
    if (roomId) params.roomId = roomId;
    const request =
      view === 'rooms'
        ? fetchAll(params)
        : occupantApi.list({ ...params, page, limit: PAGE_LIMIT }).then((response) => response.data);

    request
      .then((result) => {
        if (ignore) return;
        setData(result ?? EMPTY_DATA);
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
  }, [view, page, statusParam, roomId, noMatch, reloadKey]);

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
  const handleViewChange = (next) => {
    setView(next);
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
  const openMember = (member) => navigate(`/occupants/${member._id}`);

  const isDefaultFilter =
    filters.status.length === 1 && filters.status[0] === OCCUPANT_STATUS.STAYED;
  const isFiltering = Boolean(keyword || !isDefaultFilter);
  const items = noMatch ? [] : data.items;
  const total = noMatch ? 0 : data.total;
  const groups = view === 'rooms' ? groupByRoom(items, roomsById) : [];

  const columns = [
    {
      key: 'name',
      title: 'Họ tên',
      render: (row) => (
        <span className="flex items-center gap-2">
          <OccupantAvatar name={row.name} isRepresentative={row.isRepresentative} />
          <span className="fw-semibold">{row.name}</span>
          {row.isRepresentative && <span className="hf-badge hf-b-plum">Đại diện</span>}
        </span>
      ),
    },
    {
      key: 'room',
      title: 'Phòng',
      render: (row) => (row.room ? `${row.room.roomNumber} · Tầng ${row.room.floorNumber}` : '—'),
    },
    { key: 'cccd', title: 'CCCD' },
    { key: 'phone', title: 'Số điện thoại' },
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
      return <DataTable columns={columns} data={items} onRowClick={openMember} />;
    }

    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {groups.map((group) => (
          <RoomGroupCard
            key={group.room._id ?? 'none'}
            group={group}
            onOpenMember={openMember}
            onAdd={setAdding}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {rooms.length > 0 && <OccupancyStats rooms={rooms} />}

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
          count={
            loading || loadError
              ? null
              : view === 'rooms'
                ? `${total} cư dân · ${groups.length} phòng`
                : `${total} cư dân`
          }
          view={view}
          onViewChange={handleViewChange}
          viewOptions={VIEW_OPTIONS}
        />
      </Card>

      <div
        className={`transition-opacity ${refreshing ? 'opacity-50' : ''}`}
        aria-busy={refreshing}
      >
        {renderContent()}
      </div>

      {view === 'table' && !loading && !loadError && total > 0 && (
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
