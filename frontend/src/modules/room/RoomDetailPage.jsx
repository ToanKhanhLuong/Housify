// UC-19: chi tiết phòng. Admin có nút "Chỉnh sửa" (UC-17), "Xóa" (UC-18); Manager chỉ xem (BR-052)
// Sức chứa lấy từ roomType.capacity, số người đang ở từ occupantCount
// Nút quay lại và xóa phòng đều chuyển hướng về chi tiết tòa nhà của phòng đó
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import FieldRow from '../../components/FieldRow';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import EmptyState from '../../components/EmptyState';
import ConfirmModal from '../../components/ConfirmModal';
import MoneyText from '../../components/MoneyText';
import StatusSteps from '../../components/StatusSteps';
import { useAuth } from '../../context/AuthContext';
import { ROLE, ROOM_STATUS } from '../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import roomApi from './room.api';
import RoomFormModal from './components/RoomFormModal';
import RoomFloorMap from './components/RoomFloorMap';
import RoomGallery from './components/RoomGallery';

const RoomDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadRoom = useCallback(
    () =>
      roomApi
        .detail(id)
        .then((response) => {
          setRoom(response.data);
          setLoadError(null);
        })
        .catch((error) => setLoadError({ notFound: error.status === 404, message: error.message }))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Tải danh mục loại phòng cho modal sửa
  useEffect(() => {
    if (!isAdmin) return;
    roomApi
      .listRoomTypes()
      .then((res) => setRoomTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRoomTypes([]));
  }, [isAdmin]);

  // Phòng cùng tầng: chuyển nhanh sang phòng bên cạnh
  const [neighbours, setNeighbours] = useState(null);
  const buildingId = room?.buildingId ?? room?.building?._id;
  const floorNumber = room?.floorNumber;

  useEffect(() => {
    if (!buildingId || !floorNumber) return;
    roomApi
      .list(buildingId, { floor: floorNumber })
      .then((response) => setNeighbours(Array.isArray(response.data) ? response.data : []))
      .catch(() => setNeighbours([]));
  }, [buildingId, floorNumber]);

  // Đường dẫn quay lại chi tiết tòa nhà của phòng đó (không về /rooms)
  const backTo = buildingId
    ? isAdmin
      ? `/buildings/${buildingId}`
      : '/my-building'
    : isAdmin
      ? '/buildings'
      : '/my-building';

  // UC-18: Xóa phòng, bị chặn thì hiện đúng message BE trả về
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await roomApi.remove(room._id);
      toast.success('Xóa phòng thành công');
      navigate(backTo, { replace: true });
    } catch (error) {
      toast.error(error.message);
      setShowDelete(false);
      setDeleting(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    loadRoom();
  };

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Đang tải phòng">
        <Card className="mb-3">
          <SkeletonRows rows={1} columns={4} />
        </Card>
        <div className="grid lg:grid-cols-2 gap-3">
          <Card>
            <SkeletonRows rows={5} columns={2} />
          </Card>
          <Card>
            <SkeletonRows rows={3} columns={1} />
          </Card>
        </div>
      </div>
    );
  }

  if (loadError?.notFound || (!loadError && !room)) {
    return (
      <EmptyState message="Không tìm thấy phòng. Có thể phòng đã bị xóa.">
        <Button variant="secondary" onClick={() => navigate(backTo)}>
          Về chi tiết tòa nhà
        </Button>
      </EmptyState>
    );
  }

  if (loadError) {
    return (
      <Card>
        <ErrorState
          message="Không tải được thông tin phòng."
          detail={loadError.message}
          onRetry={handleRetry}
        />
      </Card>
    );
  }

  const roomCapacity = room.roomType?.capacity ?? '—';
  const occupantCount = room.occupantCount ?? 0;

  return (
    <>
      <PageHeader
        backTo={backTo}
        title={`Phòng ${room.roomNumber}`}
        subtitle={`${room.building?.name ?? '—'} · Tầng ${room.floorNumber} · ${room.roomType?.name ?? '—'}`}
        actions={
          isAdmin && (
            <>
              <Button variant="secondary" onClick={() => setShowForm(true)}>
                Chỉnh sửa
              </Button>
              <Button variant="secondary" onClick={() => setShowDelete(true)}>
                Xóa
              </Button>
            </>
          )
        }
      >
        <StatusSteps
          map={ROOM_STATUS_LABEL}
          steps={[ROOM_STATUS.AVAILABLE, ROOM_STATUS.OCCUPIED]}
          current={room.status}
        />
      </PageHeader>

      {/* Dải số liệu chính: Giá, cọc, diện tích, sức chứa và đang ở */}
      <Card className="mb-3">
        <Card.Body className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3">
          {[
            ['Giá thuê / tháng', <MoneyText key="rent" value={room.rentPrice} />],
            ['Tiền cọc', <MoneyText key="deposit" value={room.deposit} />],
            [
              'Diện tích',
              <span key="area">
                {room.area} <span className="fs-6 text-secondary">m²</span>
              </span>,
            ],
            [
              'Đang ở',
              <span key="occupants">
                {occupantCount} / {roomCapacity} <span className="fs-6 text-secondary">người</span>
              </span>,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="small text-secondary">{label}</div>
              <div className="h4 fw-semibold mb-0 tabular-nums">{value}</div>
            </div>
          ))}
        </Card.Body>
      </Card>

      {/* Thông tin phòng và ảnh phòng */}
      <div className="grid lg:grid-cols-2 gap-3 items-start">
        <Card>
          <Card.Header className="fw-semibold">Thông tin phòng</Card.Header>
          <Card.Body className="px-4 py-3">
            <FieldRow label="Mã phòng" required>
              {room.roomNumber}
            </FieldRow>
            <FieldRow label="Tòa nhà">{room.building?.name}</FieldRow>
            <FieldRow label="Tầng" required>
              Tầng {room.floorNumber}
            </FieldRow>
            <FieldRow label="Loại phòng" required>
              {room.roomType?.name}
            </FieldRow>
            <FieldRow label="Sức chứa">Tối đa {roomCapacity} người</FieldRow>
            <FieldRow label="Đang ở">{occupantCount} / {roomCapacity} người</FieldRow>
            <FieldRow label="Ngày tạo">{formatDate(room.createdAt)}</FieldRow>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header className="fw-semibold">
            Ảnh phòng <span className="text-secondary fw-normal">({room.images?.length ?? 0})</span>
          </Card.Header>
          <Card.Body className="p-3">
            <RoomGallery
              images={room.images}
              name={`Phòng ${room.roomNumber}`}
              onAdd={isAdmin ? () => setShowForm(true) : undefined}
            />
          </Card.Body>
        </Card>
      </div>

      {/* Phòng cùng tầng */}
      <Card className="mt-3">
        <Card.Header className="fw-semibold">
          Phòng cùng tầng{' '}
          <span className="text-secondary fw-normal">· Tầng {room.floorNumber}</span>
        </Card.Header>
        <Card.Body className="p-3">
          {neighbours === null ? (
            <SkeletonRows rows={1} columns={3} />
          ) : neighbours.length <= 1 ? (
            <p className="mb-0 text-secondary">Tầng {room.floorNumber} chỉ có phòng này.</p>
          ) : (
            <RoomFloorMap rooms={neighbours} currentId={room._id} framed={false} />
          )}
        </Card.Body>
      </Card>

      {showForm && (
        <RoomFormModal
          room={room}
          building={room.building}
          roomTypes={roomTypes}
          onHide={() => setShowForm(false)}
          onSaved={(updated) => {
            setRoom({ ...room, ...updated });
            setShowForm(false);
          }}
        />
      )}

      <ConfirmModal
        show={showDelete}
        title="Xóa phòng"
        message={`Bạn chắc chắn muốn xóa phòng ${room.roomNumber}?`}
        confirmText="Xóa"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
};

export default RoomDetailPage;
