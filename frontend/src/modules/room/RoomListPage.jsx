// UC-19: danh sách phòng, lọc theo tòa nhà, tầng, loại phòng, trạng thái, khoảng giá. Bấm dòng mở chi tiết
// Admin chọn tòa (có "Tất cả") và có nút "Thêm phòng" (UC-16). Manager chỉ xem phòng tòa mình (BR-051), không thêm / sửa
import { useEffect, useState } from 'react';
import { Alert, Button, Form, InputGroup } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BiBuildings, BiReset } from 'react-icons/bi';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import FilterSelect from '../../components/FilterSelect';
import MoneyText from '../../components/MoneyText';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { ROOM_STATUS_LABEL, toOptions } from '../../constants/statusLabels';
import roomApi from './room.api';
import RoomFormModal from './components/RoomFormModal';

// nhớ tòa Admin chọn lần trước ('' = Tất cả). Trình duyệt chặn bộ nhớ thì bỏ qua, mặc định "Tất cả"
const SAVED_BUILDING_KEY = 'housify.rooms.buildingId';
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

const RoomListPage = () => {
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;
  const navigate = useNavigate();
  // tòa đang xem giữ trên URL để quay lại từ trang chi tiết vẫn đúng tòa
  const [searchParams, setSearchParams] = useSearchParams();

  const [buildings, setBuildings] = useState(null); // null: đang tải
  const [roomTypes, setRoomTypes] = useState([]);
  const [filters, setFilters] = useState({ floor: '', roomTypeId: '', status: '' });
  const [price, setPrice] = useState({ min: '', max: '' }); // lọc giá ngay trên FE, API chưa có tham số giá
  const [result, setResult] = useState({ key: null, rooms: [] });
  const [reloadCount, setReloadCount] = useState(0);
  const [showForm, setShowForm] = useState(false);

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
      .catch((error) => {
        setResult({ key: requestKey, rooms: [] });
        toast.error(error.message);
      });
  }, [canLoad, buildingId, filters, requestKey]);

  const rooms = result.rooms.filter(
    (room) =>
      (price.min === '' || room.rentPrice >= Number(price.min)) &&
      (price.max === '' || room.rentPrice <= Number(price.max)),
  );

  const handleFilter = (event) =>
    setFilters({ ...filters, [event.target.name]: event.target.value });

  // đổi tòa thì bỏ lọc tầng (mỗi tòa số tầng khác nhau), nhớ lựa chọn cho lần sau
  const handleChangeBuilding = (event) => {
    setSearchParams({ buildingId: event.target.value });
    saveBuilding(event.target.value);
    setFilters({ ...filters, floor: '' });
  };

  // có ô nào đang lọc không (Manager không đổi được tòa nên không tính tòa)
  const isFiltered =
    (isAdmin && Boolean(buildingId)) ||
    Object.values(filters).some(Boolean) ||
    price.min !== '' ||
    price.max !== '';

  // đưa mọi ô lọc về "Tất cả", kể cả tòa nhà và khoảng giá
  const handleResetFilters = () => {
    if (isAdmin) {
      setSearchParams({ buildingId: '' });
      saveBuilding('');
    }
    setFilters({ floor: '', roomTypeId: '', status: '' });
    setPrice({ min: '', max: '' });
  };

  const floorOptions = Array.from({ length: building?.floorCount ?? 0 }, (_, index) => ({
    value: String(index + 1),
    label: `Tầng ${index + 1}`,
  }));
  const roomTypeOptions = roomTypes.map((type) => ({ value: type._id, label: type.name }));
  const noRoomType = isAdmin && buildings !== null && roomTypes.length === 0;

  const columns = [
    { key: 'roomNumber', title: 'Mã phòng', className: 'fw-semibold' },
    // xem "Tất cả" thì cần biết phòng thuộc tòa nào
    ...(isAll ? [{ key: 'building', title: 'Tòa nhà', render: (row) => row.building?.name }] : []),
    { key: 'floorNumber', title: 'Tầng', render: (row) => `Tầng ${row.floorNumber}` },
    { key: 'roomType', title: 'Loại phòng', render: (row) => row.roomType?.name },
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

  if (buildings === null) return <Loading />;

  return (
    <>
      <PageHeader
        title="Phòng"
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

      {/* thanh lọc: mỗi ô có nhãn nằm trong ô, "Tất cả" là giá trị mặc định */}
      <div className="flex flex-wrap gap-2 mb-3">
        {isAdmin ? (
          <FilterSelect
            label="Tòa nhà"
            icon={BiBuildings}
            name="buildingId"
            options={buildings.map((item) => ({ value: item._id, label: item.name }))}
            placeholder="Tất cả"
            value={buildingId}
            onChange={handleChangeBuilding}
            className="w-80"
          />
        ) : (
          <InputGroup className="w-80">
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
          placeholder={isAll ? 'Chọn tòa trước' : 'Tất cả'}
          value={filters.floor}
          onChange={handleFilter}
          disabled={isAll}
          className="w-64"
        />
        <FilterSelect
          label="Loại phòng"
          name="roomTypeId"
          options={roomTypeOptions}
          placeholder="Tất cả"
          value={filters.roomTypeId}
          onChange={handleFilter}
          className="w-64"
        />
        <FilterSelect
          label="Trạng thái"
          name="status"
          options={toOptions(ROOM_STATUS_LABEL)}
          placeholder="Tất cả"
          value={filters.status}
          onChange={handleFilter}
          className="w-60"
        />
        <InputGroup className="w-80">
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
          <InputGroup.Text className="text-secondary">đ</InputGroup.Text>
        </InputGroup>
        <Button
          variant="secondary"
          className="flex items-center gap-1"
          onClick={handleResetFilters}
          disabled={!isFiltered}
        >
          <BiReset size={16} />
          Xóa bộ lọc
        </Button>
      </div>

      {noRoomType && (
        <Alert variant="warning">
          Chưa có loại phòng nào. Cần tạo loại phòng trước khi thêm phòng (UC-20).
        </Alert>
      )}

      {buildings.length === 0 && !user.building ? (
        <EmptyState message="Chưa có tòa nhà nào" />
      ) : (
        <DataTable
          columns={columns}
          data={rooms}
          loading={loading}
          emptyMessage="Không tìm thấy phòng phù hợp"
          onRowClick={(row) => navigate(`/rooms/${row._id}`)}
        />
      )}

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
