// UC-19: danh sách phòng. Câu hỏi của trang: "bao nhiêu phòng đang trống, phòng nào?"
// Tab trạng thái có số đếm; thanh công cụ: tìm mã phòng, tòa nhà, tầng, loại phòng, khoảng giá. Bấm dòng mở chi tiết
// Admin chọn tòa (có "Tất cả") và có nút "Thêm phòng" (UC-16). Manager chỉ xem phòng tòa mình (BR-051), không thêm / sửa
import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Form,
  InputGroup,
  ListGroup,
  Offcanvas,
} from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BiBuildings, BiFilterAlt, BiGridAlt, BiListUl, BiReset, BiSearch } from 'react-icons/bi';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import FilterSelect from '../../components/FilterSelect';
import MoneyText from '../../components/MoneyText';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { ROLE, ROOM_STATUS } from '../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../constants/statusLabels';
import roomApi from './room.api';
import RoomFloorMap from './components/RoomFloorMap';
import RoomFormModal from './components/RoomFormModal';
import RoomStatusTabs from './components/RoomStatusTabs';
import RoomThumb from './components/RoomThumb';

// nhớ tòa Admin chọn lần trước ('' = Tất cả). Trình duyệt chặn bộ nhớ thì bỏ qua, mặc định "Tất cả"
const SAVED_BUILDING_KEY = 'housify.rooms.buildingId';
const SAVED_VIEW_KEY = 'housify.rooms.view'; // 'table' | 'map'
const readSavedBuilding = () => {
  try {
    return localStorage.getItem(SAVED_BUILDING_KEY);
  } catch {
    return null;
  }
};
const saveBuilding = (value) => {
  try {
    localStorage.setItem(SAVED_BUILDING_KEY, value);
  } catch {
    // không lưu được thì thôi, lần sau về "Tất cả"
  }
};
const readSavedView = () => {
  try {
    return localStorage.getItem(SAVED_VIEW_KEY) === 'map' ? 'map' : 'table';
  } catch {
    return 'table';
  }
};
const saveView = (value) => {
  try {
    localStorage.setItem(SAVED_VIEW_KEY, value);
  } catch {
    // không lưu được thì lần sau về Bảng
  }
};

const EMPTY_FILTERS = { floor: '', roomTypeId: '' };
const EMPTY_PRICE = { min: '', max: '' };

const RoomListPage = () => {
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;
  const navigate = useNavigate();
  // tòa đang xem giữ trên URL để quay lại từ trang chi tiết vẫn đúng tòa
  const [searchParams, setSearchParams] = useSearchParams();

  const [buildings, setBuildings] = useState(null); // null: đang tải
  const [roomTypes, setRoomTypes] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS); // gửi lên API
  const [status, setStatus] = useState(''); // lọc trên FE để đếm được cả 4 tab
  const [keyword, setKeyword] = useState(''); // tìm mã phòng (UC-19 "tìm một phòng cụ thể")
  const [price, setPrice] = useState(EMPTY_PRICE); // lọc giá trên FE, API chưa có tham số giá
  const [showFilters, setShowFilters] = useState(false); // điện thoại: mở / đóng phần lọc
  const [result, setResult] = useState({ key: null, rooms: [] });
  const [reloadCount, setReloadCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState(readSavedView); // Bảng hoặc Sơ đồ, nhớ cho lần sau

  // Admin: URL → lựa chọn lần trước → "Tất cả" (''); tòa đã bị xóa thì về "Tất cả"
  // Manager: luôn là tòa được phân công (lấy từ /auth/me)
  const chosenId = searchParams.get('buildingId') ?? readSavedBuilding() ?? '';
  const buildingId = isAdmin
    ? buildings?.some((item) => item._id === chosenId)
      ? chosenId
      : ''
    : (user.building?._id ?? '');
  const building = buildingId
    ? (buildings?.find((item) => item._id === buildingId) ?? user.building)
    : null;
  const isAll = isAdmin && !buildingId;

  useEffect(() => {
    roomApi
      .listBuildings()
      .then((response) => setBuildings(response.data?.items ?? response.data ?? []))
      .catch((error) => {
        setBuildings([]);
        toast.error(error.message);
      });
    roomApi
      .listRoomTypes()
      .then((response) => setRoomTypes(response.data?.items ?? response.data ?? []))
      .catch((error) => toast.error(error.message));
  }, []);

  // mỗi bộ (tòa + lọc + lần tải lại) là một key; key của kết quả khác key hiện tại nghĩa là đang tải
  const requestKey = JSON.stringify({ buildingId, ...filters, reloadCount });
  const loading = result.key !== requestKey;
  const canLoad = buildings !== null && (isAll ? buildings.length > 0 : Boolean(buildingId));

  useEffect(() => {
    if (!canLoad) return;
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    const request = buildingId ? roomApi.list(buildingId, params) : roomApi.listAll(params);
    request
      .then((response) =>
        setResult({ key: requestKey, rooms: response.data?.items ?? response.data ?? [] }),
      )
      .catch((error) => setResult({ key: requestKey, rooms: [], error: error.message }));
  }, [canLoad, buildingId, filters, requestKey]);

  // lọc trên FE theo thứ tự: mã phòng, giá → đếm theo trạng thái → tab trạng thái
  const search = keyword.trim().toLowerCase();
  const inScope = result.rooms.filter(
    (room) =>
      (!search || room.roomNumber.toLowerCase().includes(search)) &&
      (price.min === '' || room.rentPrice >= Number(price.min)) &&
      (price.max === '' || room.rentPrice <= Number(price.max)),
  );
  const counts = inScope.reduce(
    (total, room) => ({ ...total, [room.status]: (total[room.status] ?? 0) + 1 }),
    { '': inScope.length },
  );
  const rooms = status ? inScope.filter((room) => room.status === status) : inScope;

  const handleFilter = (event) =>
    setFilters({ ...filters, [event.target.name]: event.target.value });

  // đổi tòa thì bỏ lọc tầng (mỗi tòa số tầng khác nhau), nhớ lựa chọn cho lần sau
  const handleChangeBuilding = (event) => {
    setSearchParams({ buildingId: event.target.value });
    saveBuilding(event.target.value);
    setFilters({ ...filters, floor: '' });
  };

  // số ô lọc đang dùng (không tính tab trạng thái; Manager không đổi được tòa nên không tính tòa)
  const activeCount = [
    isAdmin && buildingId,
    filters.floor,
    filters.roomTypeId,
    keyword.trim(),
    price.min !== '' || price.max !== '',
  ].filter(Boolean).length;

  // đưa mọi ô về "Tất cả", kể cả tòa nhà, khoảng giá, ô tìm và tab trạng thái
  const handleResetFilters = () => {
    if (isAdmin) {
      setSearchParams({ buildingId: '' });
      saveBuilding('');
    }
    setFilters(EMPTY_FILTERS);
    setPrice(EMPTY_PRICE);
    setKeyword('');
    setStatus('');
  };

  const floorOptions = Array.from({ length: building?.floorCount ?? 0 }, (_, index) => ({
    value: String(index + 1),
    label: `Tầng ${index + 1}`,
  }));
  const roomTypeOptions = roomTypes.map((type) => ({ value: type._id, label: type.name }));
  const noRoomType = isAdmin && buildings !== null && roomTypes.length === 0;

  // dòng phụ dưới mã phòng: xem "Tất cả" thì cần biết phòng thuộc tòa nào
  const placeOf = (room) =>
    isAll ? `${room.building?.name ?? '—'} · Tầng ${room.floorNumber}` : `Tầng ${room.floorNumber}`;

  // câu trả lời cho câu hỏi của trang, ngay dưới tiêu đề
  const scopeName = building?.name ?? 'Tất cả tòa nhà';
  const summary = loading
    ? scopeName
    : [
        scopeName,
        `${counts[''] ?? 0} phòng`,
        `${counts[ROOM_STATUS.AVAILABLE] ?? 0} trống`,
        counts[ROOM_STATUS.MAINTENANCE] ? `${counts[ROOM_STATUS.MAINTENANCE]} đang bảo trì` : null,
      ]
        .filter(Boolean)
        .join(' · ');

  const columns = [
    {
      key: 'roomNumber',
      title: 'Phòng',
      render: (row) => (
        <div className="flex items-center gap-3">
          <RoomThumb room={row} />
          <div className="min-w-0">
            <div className="fw-semibold">{row.roomNumber}</div>
            <div className="small text-secondary">{placeOf(row)}</div>
          </div>
        </div>
      ),
    },
    { key: 'roomType', title: 'Loại phòng', render: (row) => row.roomType?.name ?? '—' },
    {
      key: 'area',
      title: 'Diện tích',
      align: 'end',
      render: (row) => (
        <>
          {row.area} <span className="text-secondary">m²</span>
        </>
      ),
    },
    {
      key: 'capacity',
      title: 'Sức chứa',
      align: 'end',
      render: (row) => (
        <>
          {row.capacity} <span className="text-secondary">người</span>
        </>
      ),
    },
    {
      key: 'rentPrice',
      title: 'Giá thuê / tháng',
      align: 'end',
      render: (row) => <MoneyText value={row.rentPrice} className="fw-semibold" />,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={ROOM_STATUS_LABEL} value={row.status} />,
    },
  ];

  // số phòng đang hiện + xóa bộ lọc (chỉ khi đang lọc)
  const resultBar = (
    <>
      {(activeCount > 0 || status) && (
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-1 whitespace-nowrap"
          onClick={handleResetFilters}
        >
          <BiReset size={16} />
          Xóa bộ lọc
        </Button>
      )}
      <span className="text-secondary whitespace-nowrap tabular-nums">
        {loading ? '…' : `${rooms.length} phòng`}
      </span>
      {/* chế độ xem: Bảng (so sánh giá, diện tích) hoặc Sơ đồ (thấy phòng trống theo tầng) */}
      <ButtonGroup size="sm" aria-label="Chế độ xem">
        {[
          ['table', 'Bảng', BiListUl],
          ['map', 'Sơ đồ', BiGridAlt],
        ].map(([key, label, Icon]) => (
          <Button
            key={key}
            variant="secondary"
            active={view === key}
            aria-pressed={view === key}
            className="flex items-center gap-1"
            onClick={() => {
              setView(key);
              saveView(key);
            }}
          >
            <Icon size={16} />
            {label}
          </Button>
        ))}
      </ButtonGroup>
    </>
  );

  if (buildings === null) {
    return (
      <Card>
        <SkeletonRows rows={5} columns={5} media />
      </Card>
    );
  }

  const noBuilding = buildings.length === 0 && !user.building;

  // các ô lọc: viết một lần, dùng ở hàng ngang (màn lg) và trong panel trượt lên (màn nhỏ hơn)
  const filterControls = (
    <>
      {isAdmin ? (
        <FilterSelect
          label="Tòa nhà"
          icon={BiBuildings}
          name="buildingId"
          options={buildings.map((item) => ({ value: item._id, label: item.name }))}
          placeholder="Tất cả"
          value={buildingId}
          onChange={handleChangeBuilding}
          className="w-full lg:w-72"
        />
      ) : (
        <InputGroup className="w-full lg:w-72">
          <InputGroup.Text className="flex items-center gap-1 text-secondary">
            <BiBuildings size={16} />
            Tòa nhà
          </InputGroup.Text>
          <Form.Control value={building?.name ?? ''} aria-label="Tòa nhà" readOnly disabled />
        </InputGroup>
      )}
      <FilterSelect
        label="Tầng"
        name="floor"
        options={floorOptions}
        placeholder="Tất cả"
        value={filters.floor}
        onChange={handleFilter}
        disabled={isAll}
        className="w-full lg:w-44"
      />
      <FilterSelect
        label="Loại phòng"
        name="roomTypeId"
        options={roomTypeOptions}
        placeholder="Tất cả"
        value={filters.roomTypeId}
        onChange={handleFilter}
        className="w-full lg:w-52"
      />
      <InputGroup className="w-full lg:w-56">
        <InputGroup.Text className="text-secondary">Giá</InputGroup.Text>
        <Form.Control
          name="priceMin"
          type="number"
          min={0}
          placeholder="từ"
          value={price.min}
          onChange={(event) => setPrice({ ...price, min: event.target.value })}
          aria-label="Giá thuê từ"
        />
        <Form.Control
          name="priceMax"
          type="number"
          min={0}
          placeholder="đến"
          value={price.max}
          onChange={(event) => setPrice({ ...price, max: event.target.value })}
          aria-label="Giá thuê đến"
        />
      </InputGroup>
    </>
  );

  // thân danh sách: chưa có tòa · đang tải (khung xương) · lỗi (thử lại) · trống (gợi ý) · bảng / thẻ
  const renderBody = () => {
    if (noBuilding) {
      return (
        <Card>
          <EmptyState message="Chưa có tòa nhà nào. Tạo tòa nhà trước, rồi thêm phòng vào tòa.">
            {isAdmin && (
              <Button variant="secondary" onClick={() => navigate('/buildings')}>
                Đến trang Tòa nhà
              </Button>
            )}
          </EmptyState>
        </Card>
      );
    }
    if (loading) {
      return (
        <Card>
          <SkeletonRows rows={5} columns={5} media />
        </Card>
      );
    }
    if (result.error) {
      return (
        <Card>
          <ErrorState
            message="Không tải được danh sách phòng."
            detail={result.error}
            onRetry={() => setReloadCount((count) => count + 1)}
          />
        </Card>
      );
    }
    if (rooms.length === 0) {
      return (
        <Card>
          {result.rooms.length === 0 ? (
            <EmptyState
              message={
                isAdmin
                  ? `${scopeName} chưa có phòng nào. Bấm Thêm phòng để bắt đầu.`
                  : `${scopeName} chưa có phòng nào.`
              }
            >
              {isAdmin && roomTypes.length > 0 && (
                <Button variant="secondary" onClick={() => setShowForm(true)}>
                  Thêm phòng
                </Button>
              )}
            </EmptyState>
          ) : (
            <EmptyState message="Không có phòng nào khớp với bộ lọc.">
              <Button variant="secondary" onClick={handleResetFilters}>
                Xóa bộ lọc
              </Button>
            </EmptyState>
          )}
        </Card>
      );
    }
    if (view === 'map') return <RoomFloorMap rooms={rooms} showBuilding={isAll} />;
    return (
      <>
        {/* máy tính, tablet: bảng */}
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            data={rooms}
            onRowClick={(row) => navigate(`/rooms/${row._id}`)}
          />
        </div>

        {/* điện thoại: mỗi phòng một thẻ 2 dòng, mã phòng + giá ở dòng 1, phần còn lại ở dòng 2 */}
        <Card className="md:hidden">
          <ListGroup variant="flush">
            {rooms.map((room) => (
              <ListGroup.Item
                key={room._id}
                action
                onClick={() => navigate(`/rooms/${room._id}`)}
                className="flex items-center gap-3 py-3"
              >
                <RoomThumb room={room} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="fw-semibold">{room.roomNumber}</span>
                    <MoneyText value={room.rentPrice} className="fw-semibold" />
                  </div>
                  <div className="flex items-center justify-between gap-2 small text-secondary">
                    <span className="truncate">
                      {placeOf(room)} · {room.roomType?.name ?? '—'} · {room.area} m²
                    </span>
                    <StatusBadge map={ROOM_STATUS_LABEL} value={room.status} />
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Phòng"
        subtitle={summary}
        actions={
          isAdmin && (
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
              disabled={buildings.length === 0 || roomTypes.length === 0}
            >
              Thêm phòng
            </Button>
          )
        }
      />

      {noRoomType && (
        <Alert variant="warning">
          Chưa có loại phòng nào. Cần tạo loại phòng trước khi thêm phòng (UC-20).
        </Alert>
      )}

      <RoomStatusTabs value={status} counts={counts} onChange={setStatus}>
        {resultBar}
      </RoomStatusTabs>

      {/* thanh công cụ: ô tìm đứng đầu; dưới màn lg các ô lọc nằm trong panel trượt từ dưới lên */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <InputGroup className="w-full md:w-auto md:flex-1 lg:flex-none lg:w-48">
          <InputGroup.Text className="text-secondary">
            <BiSearch size={16} aria-hidden="true" />
          </InputGroup.Text>
          <Form.Control
            name="keyword"
            type="search"
            placeholder="Tìm mã phòng"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Tìm mã phòng"
          />
        </InputGroup>

        <Button
          variant="secondary"
          className="flex items-center gap-1 lg:hidden"
          onClick={() => setShowFilters(true)}
          aria-haspopup="dialog"
        >
          <BiFilterAlt size={16} />
          Bộ lọc
          {activeCount > 0 && (
            <Badge pill bg="primary-subtle" text="primary-emphasis">
              {activeCount}
            </Badge>
          )}
        </Button>

        <div className="hidden lg:flex flex-wrap items-center gap-2">{filterControls}</div>

        {/* điện thoại: số phòng + xóa bộ lọc ở cuối thanh công cụ (máy tính đặt trên hàng tab) */}
        <div className="flex md:hidden items-center gap-2 ms-auto">{resultBar}</div>
      </div>

      {/* panel lọc trượt từ dưới lên (điện thoại, tablet); lọc áp dụng ngay, nút cuối để đóng panel */}
      <Offcanvas
        show={showFilters}
        onHide={() => setShowFilters(false)}
        placement="bottom"
        className="h-auto max-h-screen"
        aria-labelledby="room-filter-title"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title id="room-filter-title" className="h5">
            Bộ lọc
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="flex flex-col gap-3">
          {filterControls}
          <div className="flex gap-2 pt-2">
            <Button variant="primary" onClick={() => setShowFilters(false)}>
              Xem {rooms.length} phòng
            </Button>
            {activeCount > 0 && (
              <Button variant="secondary" onClick={handleResetFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {renderBody()}

      {showForm && (
        <RoomFormModal
          room={{}}
          building={building}
          buildings={buildings}
          roomTypes={roomTypes}
          onHide={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setReloadCount((count) => count + 1); // UC-16 bước 4: phòng mới hiện trong danh sách
          }}
        />
      )}
    </>
  );
};

export default RoomListPage;
