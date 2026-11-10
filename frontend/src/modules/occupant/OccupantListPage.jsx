// UC-30: cư dân trong tòa (Manager, /occupants), gom theo phòng
// "Theo phòng": mỗi phòng một thẻ (sức chứa dạng chấm, thành viên có avatar, nút Thêm người khi còn chỗ)
// "Bảng": mỗi dòng là người đại diện, sổ xuống xem người ở cùng
// Cả 2 chế độ chia trang theo phòng (12 phòng / trang) để không tách người cùng phòng; vượt 1 trang mới hiện phân trang
// Lọc Đang ở / Đã chuyển đi (mặc định Đang ở như BE), tìm theo mã phòng
// UC-32: "Thêm người ở cùng". Từ chi tiết hợp đồng mở sang với location.state.addTo = { _id, roomNumber } → popup mở sẵn
// đúng phòng, thêm xong quay lại hợp đồng (location.state.returnTo)
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiGridAlt, BiListUl, BiReset, BiUserPlus } from 'react-icons/bi';
import { useLocation, useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { OCCUPANT_STATUS } from '../../constants/enums';
import { OCCUPANT_STATUS_LABEL } from '../../constants/statusLabels';
import { useSavedState } from '../../utils/filter';
import occupantApi from './occupant.api';
import { groupByRoom } from './occupantFormat';
import AddOccupantModal from './components/AddOccupantModal';
import RepresentativeTable from './components/RepresentativeTable';
import RoomGroupCard from './components/RoomGroupCard';

const PAGE_ROOMS = 12; // số phòng mỗi trang, chung cho Theo phòng (4 hàng × 3 thẻ) và Bảng
const ALL_LIMIT = 50; // tải hết (BE cho tối đa 50 mỗi lần) để gom đủ người của mỗi phòng
const DEFAULT_FILTERS = { status: [OCCUPANT_STATUS.STAYED] }; // giống mặc định của BE
const ALL_STATUS = Object.values(OCCUPANT_STATUS).join(',');
const VIEW_OPTIONS = [
  { id: 'rooms', icon: BiGridAlt, title: 'Theo phòng' },
  { id: 'table', icon: BiListUl, title: 'Bảng' },
];
const EMPTY_DATA = { items: [], total: 0 };

// gọi lần lượt từng trang 50 người tới hết
const fetchAll = async (params) => {
  const first = await occupantApi.list({ ...params, page: 1, limit: ALL_LIMIT });
  const items = [...(first.data?.items ?? [])];
  const totalPages = first.data?.totalPages ?? 1;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await occupantApi.list({ ...params, page, limit: ALL_LIMIT });
    items.push(...(next.data?.items ?? []));
  }
  return { items, total: first.data?.total ?? items.length };
};

const OccupantListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const buildingId = user.building?._id;
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true); // lần tải đầu (và Thử lại): khung xương
  const [refreshing, setRefreshing] = useState(false); // đổi lọc / trang: làm mờ danh sách cũ
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useSavedState('occupants:query', '');
  const [filters, setFilters] = useSavedState('occupants:filters', DEFAULT_FILTERS);
  const [page, setPage] = useSavedState('occupants:page', 1);
  const [view, setView] = useSavedState('occupants:view', 'rooms');
  const [reloadKey, setReloadKey] = useState(0);
  const [rooms, setRooms] = useSavedState(`occupants:rooms:${buildingId ?? ''}`, []); // phòng của tòa: đổi mã phòng → roomId, sức chứa
  const [expanded, setExpanded] = useState(() => new Set()); // chế độ Bảng: phòng đang sổ người ở cùng
  // popup thêm: true = tự chọn phòng; { _id, roomNumber } = phòng chọn sẵn
  const [adding, setAdding] = useState(() => location.state?.addTo ?? null);
  const returnTo = location.state?.returnTo ?? null;

  // phòng tải lại mỗi khi danh sách tải lại (thêm / rời phòng làm đổi số người)
  useEffect(() => {
    if (!buildingId) return;
    occupantApi
      .rooms(buildingId)
      .then((response) => setRooms(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRooms([]));
  }, [buildingId, reloadKey, setRooms]);
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

    fetchAll(params)
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
  }, [statusParam, roomId, noMatch, reloadKey]);

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
  };
  const toggleRoom = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
  const groups = groupByRoom(items, roomsById);
  // chia trang theo phòng (cả 2 chế độ xem)
  const pageGroups = groups.slice((page - 1) * PAGE_ROOMS, page * PAGE_ROOMS);
  const allOpen = pageGroups.length > 0 && pageGroups.every((group) => expanded.has(group.room._id ?? 'none'));
  const toggleAll = () =>
    setExpanded(allOpen ? new Set() : new Set(pageGroups.map((group) => group.room._id ?? 'none')));

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
        <div className="flex flex-col gap-2">
          <Button variant="secondary" size="sm" className="hf-btn-ghost self-end" onClick={toggleAll}>
            {allOpen ? 'Thu gọn tất cả' : 'Mở tất cả người ở cùng'}
          </Button>
          <RepresentativeTable
            groups={pageGroups}
            expanded={expanded}
            onToggle={toggleRoom}
            onOpen={openMember}
          />
        </div>
      );
    }

    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {pageGroups.map((group) => (
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
          count={loading || loadError ? null : `${total} cư dân · ${groups.length} phòng`}
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

      {/* chỉ hiện khi vượt 1 trang */}
      {!loading && !loadError && groups.length > PAGE_ROOMS && (
        <div className="flex justify-end mt-3">
          <Pager page={page} limit={PAGE_ROOMS} total={groups.length} onChange={setPage} />
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
