// Tab "Phòng" trong chi tiết tòa (UC-15..19, chốt 30/10) theo mockup docs/mock/BuildingDetail.dc.html
// Thanh ControlBar: "Thêm phòng", "Quản lý tầng" (Admin) · tìm mã phòng · lọc trạng thái / loại phòng / tầng / giá thuê
// Hai dạng xem: "Theo tầng" (mỗi tầng một hàng cuộn ngang, mỗi phòng một ô màu theo trạng thái) và "Bảng"
// Lọc gửi lên BE: status, roomTypeId, floor chọn nhiều (nối dấu phẩy), minPrice / maxPrice (api.md)
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { BiLayer, BiListUl, BiPlus } from 'react-icons/bi';
import ControlBar from '../../../components/ControlBar';
import DataTable from '../../../components/DataTable';
import Pager from '../../../components/Pager';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import SkeletonRows from '../../../components/SkeletonRows';
import StatusBadge from '../../../components/StatusBadge';
import MoneyText from '../../../components/MoneyText';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';
import { formatFilterQuery, useSavedState } from '../../../utils/filter';
import roomApi from '../../room/room.api';
import roomTypeApi from '../../roomType/roomType.api';
import RoomFormModal from '../../room/components/RoomFormModal';
import BuildingFloorsModal from './BuildingFloorsModal';

const PAGE_SIZE = 10;
const STATUS_ORDER = [ROOM_STATUS.AVAILABLE, ROOM_STATUS.OCCUPIED, ROOM_STATUS.MAINTENANCE];

// màu ô phòng theo trạng thái (class hf-tile-* trong index.css chung)
const TILE_CLASS = {
  [ROOM_STATUS.AVAILABLE]: 'hf-tile-ok',
  [ROOM_STATUS.OCCUPIED]: 'hf-tile-plum',
  [ROOM_STATUS.MAINTENANCE]: 'hf-tile-warn',
};

const VIEW_OPTIONS = [
  { id: 'floors', icon: BiLayer, title: 'Theo tầng' },
  { id: 'table', icon: BiListUl, title: 'Dạng bảng' },
];

const EMPTY_FILTERS = {
  status: [],
  roomTypeId: [],
  floor: [],
  minPrice: undefined,
  maxPrice: undefined,
};

// chú thích màu: chấm theo màu nhãn trạng thái phòng
const Legend = ({ count }) => (
  <div className="flex flex-wrap items-center gap-3 small">
    {STATUS_ORDER.map((status) => (
      <span key={status} className="inline-flex items-center gap-1">
        <span
          className={`inline-block w-2 h-2 rounded-circle bg-${ROOM_STATUS_LABEL[status].variant}`}
        />
        {ROOM_STATUS_LABEL[status].label}
      </span>
    ))}
    <span className="text-secondary">· {count} phòng</span>
  </div>
);

// ô một phòng ở dạng "Theo tầng" (gọn, 3 dòng): mã + trạng thái, loại · diện tích, số người + giá
const RoomTile = ({ room }) => (
  <Link
    to={`/rooms/${room._id}`}
    className={`hf-tile w-38 shrink-0 p-2 gap-1 small no-underline ${TILE_CLASS[room.status] ?? ''}`}
  >
    <span className="flex items-center justify-between gap-1">
      <span className="fw-bold">{room.roomNumber}</span>
      <StatusBadge map={ROOM_STATUS_LABEL} value={room.status} />
    </span>
    <span className="truncate">
      {room.roomType?.name ?? '—'} · {room.area} m²
    </span>
    {/* số người và giá chung một dòng cho ô gọn */}
    <span className="flex items-center justify-between gap-1">
      <span className="text-secondary">
        {room.occupantCount ?? 0}/{room.roomType?.capacity ?? '—'} người
      </span>
      <span className="fw-semibold">
        <MoneyText value={room.rentPrice} />
      </span>
    </span>
  </Link>
);

const BuildingRoomsTab = ({ building, canEdit, onRoomChanged, onBuildingChanged }) => {
  const navigate = useNavigate();
  const stateKey = `buildingRooms:${building._id}`;
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useSavedState('buildingRooms:roomTypes', []);
  const [loading, setLoading] = useState(true); // lần tải đầu: khung xương
  const [refreshing, setRefreshing] = useState(false); // tìm / lọc lại: làm mờ danh sách cũ
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useSavedState(`${stateKey}:query`, '');
  const [filters, setFilters] = useSavedState(`${stateKey}:filters`, EMPTY_FILTERS);
  const [view, setView] = useSavedState(`${stateKey}:view`, 'floors');
  const [page, setPage] = useSavedState(`${stateKey}:page`, 1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showFloors, setShowFloors] = useState(false);

  // danh mục loại phòng để lọc và để form thêm phòng chọn
  useEffect(() => {
    roomTypeApi
      .list()
      .then((response) => setRoomTypes(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRoomTypes([]));
  }, [setRoomTypes]);

  // khoảng giá sai thì không gọi BE (BE cũng chặn bằng 422)
  const priceError =
    filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice)
      ? 'Giá từ không được lớn hơn giá đến'
      : '';
  // khóa chuỗi để effect chỉ chạy khi bộ lọc thật sự đổi
  const filterKey = JSON.stringify(
    formatFilterQuery({
      q: query.trim(),
      ...filters,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    }),
  );

  // ô tìm đã tự đợi 300ms trong ControlBar; ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp
  useEffect(() => {
    if (priceError) return undefined;
    let ignore = false;
    roomApi
      .list(building._id, JSON.parse(filterKey))
      .then((response) => {
        if (ignore) return;
        setRooms(Array.isArray(response.data) ? response.data : []);
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
  }, [building._id, filterKey, priceError, reloadKey]);

  const handleSearchChange = (value) => {
    setQuery(value);
    setRefreshing(true);
  };

  const handleFilterChange = (next) => {
    setFilters({
      status: next.status ?? [],
      roomTypeId: next.roomTypeId ?? [],
      floor: next.floor ?? [],
      minPrice: next.minPrice,
      maxPrice: next.maxPrice,
    });
    setRefreshing(true);
  };

  const reload = () => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  };

  const handleResetFilters = () => {
    setQuery('');
    setFilters(EMPTY_FILTERS);
    setRefreshing(true);
  };

  const maxPage = Math.max(1, Math.ceil(rooms.length / PAGE_SIZE));
  const safePage = Math.min(page, maxPage);

  const paginatedRooms = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rooms.slice(start, start + PAGE_SIZE);
  }, [rooms, safePage]);

  const isFiltering = Boolean(
    query.trim() ||
    filters.status.length ||
    filters.roomTypeId.length ||
    filters.floor.length ||
    filters.minPrice ||
    filters.maxPrice,
  );

  const filterGroups = [
    {
      id: 'status',
      label: 'Trạng thái',
      type: 'checkbox',
      options: STATUS_ORDER.map((status) => ({
        value: status,
        label: ROOM_STATUS_LABEL[status].label,
      })),
    },
    // loại phòng cạnh trạng thái cho bảng lọc đỡ dài; quá 3 loại thì cuộn
    {
      id: 'roomTypeId',
      label: 'Loại phòng',
      type: 'checkbox',
      beside: true,
      maxVisible: 3,
      options: roomTypes.map((roomType) => ({ value: roomType._id, label: roomType.name })),
    },
    // tòa nhiều tầng: quá 5 tầng thì cuộn
    {
      id: 'floor',
      label: 'Tầng',
      type: 'checkbox',
      maxVisible: 5,
      options: Array.from({ length: building.floorCount ?? 0 }, (_, index) => ({
        value: String(index + 1),
        label: `Tầng ${index + 1}`,
      })),
    },
    {
      id: 'price',
      label: 'Giá thuê (đ)',
      type: 'range',
      minField: 'minPrice',
      maxField: 'maxPrice',
    },
  ];

  const columns = [
    { key: 'roomNumber', title: 'Mã phòng', className: 'fw-semibold' },
    { key: 'floorNumber', title: 'Tầng', render: (row) => `Tầng ${row.floorNumber}` },
    { key: 'roomType', title: 'Loại phòng', render: (row) => row.roomType?.name ?? '—' },
    { key: 'area', title: 'Diện tích', align: 'end', render: (row) => `${row.area} m²` },
    {
      key: 'occupantCount',
      title: 'Đang ở',
      render: (row) => `${row.occupantCount ?? 0}/${row.roomType?.capacity ?? '—'} người`,
    },
    {
      key: 'rentPrice',
      title: 'Giá thuê',
      align: 'end',
      render: (row) => <MoneyText value={row.rentPrice} />,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={ROOM_STATUS_LABEL} value={row.status} />,
    },
  ];

  // dạng "Theo tầng": tầng cao nhất ở trên; đang lọc thì ẩn tầng không có phòng khớp
  const renderFloors = () => {
    const floors = Array.from({ length: building.floorCount ?? 0 }, (_, index) => {
      const floorNumber = building.floorCount - index;
      const floorRooms = rooms
        .filter((room) => room.floorNumber === floorNumber)
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true }));
      return { floorNumber, rooms: floorRooms };
    }).filter((floor) => !isFiltering || floor.rooms.length > 0);

    return (
      <div>
        {floors.map((floor) => (
          <div key={floor.floorNumber} className="flex items-start gap-3 py-3 border-top">
            <div className="w-24 shrink-0 pt-3">
              <div className="fw-semibold">Tầng {floor.floorNumber}</div>
              <div className="small text-secondary">{floor.rooms.length} phòng</div>
            </div>
            {/* mỗi tầng một hàng, nhiều phòng thì cuộn ngang (không xuống dòng); p-1 chừa chỗ cho viền sáng khi rê chuột */}
            <div className="flex flex-nowrap gap-2 flex-1 min-w-0 overflow-x-auto p-1 pb-2">
              {floor.rooms.map((room) => (
                <RoomTile key={room._id} room={room} />
              ))}
              {floor.rooms.length === 0 && (
                <div className="flex items-center px-3 py-2 rounded border border-dashed small text-secondary">
                  Chưa có phòng
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <SkeletonRows rows={4} columns={4} />;
    if (loadError) {
      return (
        <ErrorState message="Không tải được danh sách phòng" detail={loadError} onRetry={reload} />
      );
    }
    if (rooms.length === 0) {
      return isFiltering ? (
        <EmptyState message="Không tìm thấy phòng phù hợp">
          <Button variant="secondary" onClick={handleResetFilters}>
            Xóa bộ lọc
          </Button>
        </EmptyState>
      ) : (
        <EmptyState message="Tòa nhà chưa có phòng nào.">
          {canEdit && (
            <Button variant="secondary" onClick={() => setShowCreate(true)}>
              Thêm phòng
            </Button>
          )}
        </EmptyState>
      );
    }
    if (view === 'table') {
      return (
        <div className="flex flex-col gap-2">
          <DataTable
            columns={columns}
            data={paginatedRooms}
            onRowClick={(row) => navigate(`/rooms/${row._id}`)}
          />
          {rooms.length > PAGE_SIZE && (
            <div className="flex justify-end mt-2">
              <Pager
                page={safePage}
                limit={PAGE_SIZE}
                total={rooms.length}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      );
    }
    return renderFloors();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* không dùng overflow-hidden: bảng Bộ lọc xổ ra ngoài thẻ sẽ bị cắt */}
      <Card>
        <ControlBar
          actions={
            canEdit && (
              <>
                <Button
                  variant="primary"
                  className="flex items-center gap-1"
                  onClick={() => setShowCreate(true)}
                >
                  <BiPlus />
                  Thêm phòng
                </Button>
                <Button
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => setShowFloors(true)}
                >
                  <BiLayer />
                  Quản lý tầng
                </Button>
              </>
            )
          }
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Tìm theo mã phòng..."
          filterGroups={filterGroups}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          view={view}
          onViewChange={setView}
          viewOptions={VIEW_OPTIONS}
        />
      </Card>

      {priceError && <div className="small text-danger">{priceError}</div>}
      <Legend count={rooms.length} />

      <div
        className={`transition-opacity ${refreshing ? 'opacity-50' : ''}`}
        aria-busy={refreshing}
      >
        {renderContent()}
      </div>

      {showCreate && (
        <RoomFormModal
          building={building}
          roomTypes={roomTypes}
          onHide={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            reload();
            onRoomChanged?.();
          }}
        />
      )}

      {showFloors && (
        <BuildingFloorsModal
          building={building}
          onHide={() => setShowFloors(false)}
          onChanged={(updated) => {
            onBuildingChanged?.(updated);
            reload();
          }}
        />
      )}
    </div>
  );
};

export default BuildingRoomsTab;
