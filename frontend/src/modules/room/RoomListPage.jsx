// UC-19: danh sách phòng theo tòa, lọc theo trạng thái, tầng, loại phòng, khoảng giá. Bấm dòng mở chi tiết
// Admin chọn tòa và có nút "Thêm phòng" (UC-16). Manager chỉ xem phòng tòa mình (BR-051), không thêm / sửa
import { useEffect, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import Select from '../../components/Select';
import Input from '../../components/Input';
import MoneyText from '../../components/MoneyText';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { ROOM_STATUS_LABEL, toOptions } from '../../constants/statusLabels';
import roomApi from './room.api';
import RoomFormModal from './components/RoomFormModal';

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

  // Manager: tòa được phân công lấy từ /auth/me; Admin: tòa trên URL, chưa chọn thì lấy tòa đầu tiên
  const buildingId = isAdmin
    ? (searchParams.get('buildingId') ?? buildings?.[0]?._id ?? '')
    : (user.building?._id ?? '');
  const building = isAdmin
    ? buildings?.find((item) => item._id === buildingId)
    : (buildings?.find((item) => item._id === buildingId) ?? user.building);

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

  useEffect(() => {
    if (!buildingId) return;
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    roomApi
      .list(buildingId, params)
      .then((response) =>
        setResult({ key: requestKey, rooms: response.data?.items ?? response.data ?? [] }),
      )
      .catch((error) => {
        setResult({ key: requestKey, rooms: [] });
        toast.error(error.message);
      });
  }, [buildingId, filters, requestKey]);

  const rooms = result.rooms.filter(
    (room) =>
      (price.min === '' || room.rentPrice >= Number(price.min)) &&
      (price.max === '' || room.rentPrice <= Number(price.max)),
  );

  const handleFilter = (event) =>
    setFilters({ ...filters, [event.target.name]: event.target.value });

  // đổi tòa thì bỏ lọc tầng (mỗi tòa số tầng khác nhau)
  const handleChangeBuilding = (event) => {
    setSearchParams({ buildingId: event.target.value });
    setFilters({ ...filters, floor: '' });
  };

  const floorOptions = Array.from({ length: building?.floorCount ?? 0 }, (_, index) => ({
    value: String(index + 1),
    label: `Tầng ${index + 1}`,
  }));
  const roomTypeOptions = roomTypes.map((type) => ({ value: type._id, label: type.name }));
  const noRoomType = isAdmin && buildings !== null && roomTypes.length === 0;

  const columns = [
    { key: 'roomNumber', title: 'Mã phòng', className: 'fw-semibold' },
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
        subtitle={!isAdmin ? building?.name : undefined}
        actions={
          isAdmin && (
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
              disabled={!building || roomTypes.length === 0}
            >
              Thêm phòng
            </Button>
          )
        }
      >
        {isAdmin && buildings.length > 0 && (
          <Select
            name="buildingId"
            options={buildings.map((item) => ({ value: item._id, label: item.name }))}
            placeholder={null}
            value={buildingId}
            onChange={handleChangeBuilding}
            className="mb-0 w-48"
            aria-label="Tòa nhà"
          />
        )}
        <Select
          name="floor"
          options={floorOptions}
          placeholder="Tất cả tầng"
          value={filters.floor}
          onChange={handleFilter}
          className="mb-0 w-36"
          aria-label="Tầng"
        />
        <Select
          name="roomTypeId"
          options={roomTypeOptions}
          placeholder="Tất cả loại phòng"
          value={filters.roomTypeId}
          onChange={handleFilter}
          className="mb-0 w-48"
          aria-label="Loại phòng"
        />
        <Select
          name="status"
          options={toOptions(ROOM_STATUS_LABEL)}
          placeholder="Tất cả trạng thái"
          value={filters.status}
          onChange={handleFilter}
          className="mb-0 w-44"
          aria-label="Trạng thái"
        />
        <Input
          name="priceMin"
          type="number"
          min={0}
          placeholder="Giá từ"
          value={price.min}
          onChange={(event) => setPrice({ ...price, min: event.target.value })}
          className="mb-0 w-28"
          aria-label="Giá thuê từ"
        />
        <Input
          name="priceMax"
          type="number"
          min={0}
          placeholder="Giá đến"
          value={price.max}
          onChange={(event) => setPrice({ ...price, max: event.target.value })}
          className="mb-0 w-28"
          aria-label="Giá thuê đến"
        />
      </PageHeader>

      {noRoomType && (
        <Alert variant="warning">
          Chưa có loại phòng nào. Cần tạo loại phòng trước khi thêm phòng (UC-20).
        </Alert>
      )}

      {!buildingId ? (
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
