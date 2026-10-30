// UC-19: chi tiết phòng. Admin có nút "Chỉnh sửa" (UC-17), "Xóa" (UC-18); Manager chỉ xem (BR-052)
// Hợp đồng hiện tại, cư dân, lịch sử hợp đồng lấy từ module contract / occupant – bổ sung ở iter 3
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
  const [loadError, setLoadError] = useState(null); // { notFound, message } khi tải lỗi
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
        // 404: phòng không còn; lỗi khác (vd E01 Manager mở phòng tòa khác, mất mạng): báo kèm thử lại
        .catch((error) => setLoadError({ notFound: error.status === 404, message: error.message }))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // loại phòng cho form sửa, chỉ Admin cần
  useEffect(() => {
    if (!isAdmin) return;
    roomApi
      .listRoomTypes()
      .then((response) => setRoomTypes(response.data?.items ?? response.data ?? []))
      .catch((error) => toast.error(error.message));
  }, [isAdmin]);

  // phòng cùng tầng: chuyển nhanh sang phòng bên cạnh mà không phải quay lại danh sách
  const [neighbours, setNeighbours] = useState(null); // null: đang tải
  const buildingId = room?.buildingId;
  const floorNumber = room?.floorNumber;
  useEffect(() => {
    if (!buildingId || !floorNumber) return;
    roomApi
      .list(buildingId, { floor: floorNumber })
      .then((response) => setNeighbours(response.data?.items ?? response.data ?? []))
      .catch(() => setNeighbours([]));
  }, [buildingId, floorNumber]);

  const backTo = room ? `/rooms?buildingId=${room.buildingId}` : '/rooms';

  // UC-18: BE chặn khi phòng còn hợp đồng đang hiệu lực hoặc nháp, message nêu lý do
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
    // khung xương giữ đúng bố cục: tiêu đề, dải số liệu, 2 khung
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
        <Button variant="secondary" onClick={() => navigate('/rooms')}>
          Về danh sách phòng
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

  return (
    <>
      {/* h1 là tên phòng, dòng phụ nói phòng ở đâu; trạng thái bên phải như thanh trạng thái kiểu Odoo */}
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
        {/* thanh trạng thái kiểu Odoo: Trống › Đang thuê; Bảo trì nằm ngoài luồng nên tự hiện ở cuối */}
        <StatusSteps
          map={ROOM_STATUS_LABEL}
          steps={[ROOM_STATUS.AVAILABLE, ROOM_STATUS.OCCUPIED]}
          current={room.status}
        />
      </PageHeader>

      {/* dải số liệu chính: giá, cọc, diện tích, sức chứa – thứ người xem phòng hỏi đầu tiên */}
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
              'Sức chứa tối đa',
              <span key="capacity">
                {room.capacity} <span className="fs-6 text-secondary">người</span>
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

      {/* thông tin và ảnh: 2 khung giữ chiều cao riêng (items-start), không kéo giãn bằng nhau */}
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
            <FieldRow label="Ngày tạo">{formatDate(room.createdAt)}</FieldRow>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header className="fw-semibold">
            Ảnh phòng <span className="text-secondary fw-normal">({room.images?.length ?? 0})</span>
          </Card.Header>
          <Card.Body className="p-3">
            {/* Admin chưa có ảnh thì bấm "Thêm ảnh" mở form sửa để tải */}
            <RoomGallery
              images={room.images}
              name={`Phòng ${room.roomNumber}`}
              onAdd={isAdmin ? () => setShowForm(true) : undefined}
            />
          </Card.Body>
        </Card>
      </div>

      {/* phòng cùng tầng: phòng đang xem được viền đậm, bấm ô khác để chuyển phòng */}
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
