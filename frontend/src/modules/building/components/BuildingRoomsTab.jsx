// Component quản lý danh sách phòng bên trong trang chi tiết tòa nhà (UC-16..19)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Form, InputGroup, ListGroup, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BiPlus, BiReset, BiSearch } from 'react-icons/bi';
import DataTable from '../../../components/DataTable';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import SkeletonRows from '../../../components/SkeletonRows';
import StatusBadge from '../../../components/StatusBadge';
import MoneyText from '../../../components/MoneyText';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';
import roomApi from '../../room/room.api';
import roomTypeApi from '../../roomType/roomType.api';
import RoomFormModal from '../../room/components/RoomFormModal';

const STATUS_OPTIONS = [
  { value: ROOM_STATUS.AVAILABLE, label: ROOM_STATUS_LABEL[ROOM_STATUS.AVAILABLE].label },
  { value: ROOM_STATUS.OCCUPIED, label: ROOM_STATUS_LABEL[ROOM_STATUS.OCCUPIED].label },
  { value: ROOM_STATUS.MAINTENANCE, label: ROOM_STATUS_LABEL[ROOM_STATUS.MAINTENANCE].label },
];

const BuildingRoomsTab = ({ building, canEdit, onRoomChanged }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(null); // null: đang tải
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Bộ lọc
  const [keyword, setKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [priceError, setPriceError] = useState('');

  // Tải danh mục loại phòng để lọc
  useEffect(() => {
    roomTypeApi
      .list()
      .then((res) => setRoomTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRoomTypes([]));
  }, []);

  const loadRooms = useCallback(() => {
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setPriceError('Giá từ không được lớn hơn giá đến');
      return;
    }
    setPriceError('');

    const params = {};
    if (keyword.trim()) params.q = keyword.trim();
    if (selectedStatus) params.status = selectedStatus;
    if (selectedFloor) params.floor = selectedFloor;
    if (selectedRoomType) params.roomTypeId = selectedRoomType;
    if (minPrice !== '') params.minPrice = Number(minPrice);
    if (maxPrice !== '') params.maxPrice = Number(maxPrice);

    roomApi
      .list(building._id, params)
      .then((res) => {
        setRooms(Array.isArray(res.data) ? res.data : []);
        setLoadError('');
      })
      .catch((err) => {
        setRooms([]);
        setLoadError(err.message);
      });
  }, [building._id, keyword, selectedStatus, selectedFloor, selectedRoomType, minPrice, maxPrice]);

  useEffect(() => {
    const timer = setTimeout(loadRooms, 300);
    return () => clearTimeout(timer);
  }, [loadRooms]);

  const handleResetFilters = () => {
    setKeyword('');
    setSelectedStatus('');
    setSelectedFloor('');
    setSelectedRoomType('');
    setMinPrice('');
    setMaxPrice('');
    setPriceError('');
  };

  const isFiltered = Boolean(
    keyword.trim() ||
      selectedStatus ||
      selectedFloor ||
      selectedRoomType ||
      minPrice !== '' ||
      maxPrice !== '',
  );

  const floorOptions = Array.from({ length: building.floorCount ?? 0 }, (_, i) => ({
    value: String(i + 1),
    label: `Tầng ${i + 1}`,
  }));

  const columns = [
    {
      key: 'roomNumber',
      title: 'Mã phòng',
      className: 'fw-semibold',
    },
    {
      key: 'floorNumber',
      title: 'Tầng',
      align: 'center',
      render: (row) => `Tầng ${row.floorNumber}`,
    },
    {
      key: 'roomType',
      title: 'Loại phòng',
      render: (row) => row.roomType?.name ?? '—',
    },
    {
      key: 'area',
      title: 'Diện tích',
      align: 'end',
      render: (row) => `${row.area} m²`,
    },
    {
      key: 'rentPrice',
      title: 'Giá thuê',
      align: 'end',
      render: (row) => <MoneyText value={row.rentPrice} />,
    },
    {
      key: 'deposit',
      title: 'Tiền cọc',
      align: 'end',
      render: (row) => <MoneyText value={row.deposit} />,
    },
    {
      key: 'capacity',
      title: 'Sức chứa',
      align: 'center',
      render: (row) => `Tối đa ${row.roomType?.capacity ?? '—'} người`,
    },
    {
      key: 'occupantCount',
      title: 'Đang ở',
      align: 'center',
      render: (row) => `${row.occupantCount ?? 0} người`,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={ROOM_STATUS_LABEL} value={row.status} />,
    },
  ];

  const renderContent = () => {
    if (rooms === null) {
      return (
        <Card>
          <SkeletonRows rows={4} columns={6} />
        </Card>
      );
    }
    if (loadError) {
      return (
        <Card>
          <ErrorState
            message="Không tải được danh sách phòng."
            detail={loadError}
            onRetry={loadRooms}
          />
        </Card>
      );
    }
    if (rooms.length === 0) {
      return (
        <Card>
          {isFiltered ? (
            <EmptyState message="Không có phòng nào khớp với bộ lọc.">
              <Button variant="secondary" onClick={handleResetFilters}>
                Xóa bộ lọc
              </Button>
            </EmptyState>
          ) : (
            <EmptyState message="Tòa nhà chưa có phòng nào.">
              {canEdit && (
                <Button variant="primary" onClick={() => setShowCreate(true)}>
                  Thêm phòng đầu tiên
                </Button>
              )}
            </EmptyState>
          )}
        </Card>
      );
    }

    return (
      <>
        {/* Máy tính: bảng */}
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            data={rooms}
            onRowClick={(row) => navigate(`/rooms/${row._id}`)}
          />
        </div>

        {/* Điện thoại: danh sách thẻ */}
        <Card className="md:hidden">
          <ListGroup variant="flush">
            {rooms.map((room) => (
              <ListGroup.Item
                key={room._id}
                action
                onClick={() => navigate(`/rooms/${room._id}`)}
                className="py-3"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="fw-semibold">Phòng {room.roomNumber}</span>
                  <StatusBadge map={ROOM_STATUS_LABEL} value={room.status} />
                </div>
                <div className="small text-secondary mb-1">
                  Tầng {room.floorNumber} · {room.roomType?.name ?? '—'} · {room.area} m² · Sức chứa {room.roomType?.capacity ?? '—'} người
                </div>
                <div className="flex items-center justify-between gap-2 small">
                  <span className="fw-medium text-primary">
                    <MoneyText value={room.rentPrice} />/tháng
                  </span>
                  <span className="text-secondary">
                    Đang ở: {room.occupantCount ?? 0} người
                  </span>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      </>
    );
  };

  return (
    <div>
      {/* Thanh công cụ và bộ lọc */}
      <div className="mb-3">
        <Row className="g-2 mb-2">
          <Col md={3}>
            <InputGroup>
              <InputGroup.Text className="text-secondary">
                <BiSearch size={16} />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Tìm mã phòng..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </InputGroup>
          </Col>
          <Col md={2}>
            <Form.Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
            >
              <option value="">Tất cả tầng</option>
              {floorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Select
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
            >
              <option value="">Tất cả loại phòng</option>
              {roomTypes.map((rt) => (
                <option key={rt._id} value={rt._id}>
                  {rt.name}
                </option>
              ))}
            </Form.Select>
          </Col>
          {canEdit && (
            <Col md={3} className="text-end ms-auto">
              <Button
                variant="primary"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 ms-auto"
              >
                <BiPlus />
                Thêm phòng
              </Button>
            </Col>
          )}
        </Row>

        {/* Lọc khoảng giá */}
        <Row className="g-2 items-center">
          <Col md={2}>
            <Form.Control
              type="number"
              placeholder="Giá từ (₫)"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="number"
              placeholder="Giá đến (₫)"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </Col>
          {isFiltered && (
            <Col md={2}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
                className="flex items-center gap-1"
              >
                <BiReset />
                Xóa bộ lọc
              </Button>
            </Col>
          )}
          {priceError && (
            <Col xs={12}>
              <div className="small text-danger">{priceError}</div>
            </Col>
          )}
        </Row>
      </div>

      {/* Danh sách phòng */}
      {renderContent()}

      {/* Modal Thêm phòng (Admin) */}
      {showCreate && (
        <RoomFormModal
          building={building}
          roomTypes={roomTypes}
          onHide={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            loadRooms();
            onRoomChanged?.();
          }}
        />
      )}
    </div>
  );
};

export default BuildingRoomsTab;
