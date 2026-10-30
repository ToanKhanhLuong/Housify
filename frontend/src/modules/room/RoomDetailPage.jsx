// UC-19: chi tiết phòng. Admin có nút "Chỉnh sửa" (UC-17), "Xóa" (UC-18); Manager chỉ xem (BR-052)
// Hợp đồng hiện tại, cư dân, lịch sử hợp đồng lấy từ module contract / occupant – bổ sung ở iter 3
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Image } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import FieldRow from '../../components/FieldRow';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import ConfirmModal from '../../components/ConfirmModal';
import MoneyText from '../../components/MoneyText';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import roomApi from './room.api';
import RoomFormModal from './components/RoomFormModal';

const RoomDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadRoom = useCallback(
    () =>
      roomApi
        .detail(id)
        .then((response) => setRoom(response.data))
        .catch((error) => toast.error(error.message)) // vd E01 Manager mở phòng tòa khác
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

  if (loading) return <Loading />;
  if (!room) return <EmptyState message="Không tìm thấy phòng" />;

  return (
    <>
      <PageHeader
        backTo={backTo}
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
      />

      <Card>
        <Card.Body className="p-4">
          <div className="small text-secondary">Phòng · {room.building?.name}</div>
          <h2 className="h3 fw-semibold mb-4">{room.roomNumber}</h2>

          <div className="grid lg:grid-cols-2 column-gap-5 mb-4">
            <div>
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
              <FieldRow label="Trạng thái">
                <StatusBadge map={ROOM_STATUS_LABEL} value={room.status} />
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Diện tích" required>
                {room.area} m²
              </FieldRow>
              <FieldRow label="Sức chứa tối đa" required>
                {room.capacity} người
              </FieldRow>
              <FieldRow label="Giá thuê" required>
                <MoneyText value={room.rentPrice} />
              </FieldRow>
              <FieldRow label="Tiền cọc" required>
                <MoneyText value={room.deposit} />
              </FieldRow>
              <FieldRow label="Ngày tạo">{formatDate(room.createdAt)}</FieldRow>
            </div>
          </div>

          {room.images?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {room.images.map((url) => (
                <div
                  key={url}
                  className="group h-32 overflow-hidden rounded border bg-body-tertiary"
                >
                  <Image
                    src={url}
                    alt={room.roomNumber}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="small text-secondary">Phòng chưa có ảnh</div>
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
