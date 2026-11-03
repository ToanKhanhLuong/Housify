// UC-19: chi tiết phòng theo mockup docs/mock/RoomDetail.dc.html, cùng kiểu "tờ giấy" với chi tiết tòa nhà
// Admin: "Chỉnh sửa" (UC-17), "Chuyển sang bảo trì" / "Chuyển về trống" (UC-17, chỉ Trống ↔ Bảo trì), "Xóa phòng" (UC-18)
// Manager chỉ xem (BR-052). Sức chứa lấy từ roomType.capacity, số người đang ở từ occupantCount
// Iter 2 (Manager): thêm hợp đồng đang hiệu lực + cư dân đang ở (RoomTenancySection); lịch sử hợp đồng để iter 3
// Nút quay lại, breadcrumbs và xóa phòng đều đưa về chi tiết tòa của phòng (Manager: /my-building)
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Image, Modal, Placeholder } from 'react-bootstrap';
import {
  BiArea,
  BiBuildings,
  BiCategory,
  BiCheckCircle,
  BiDoorOpen,
  BiEditAlt,
  BiFile,
  BiGroup,
  BiLayer,
  BiMoney,
  BiTime,
  BiTrash,
  BiUser,
  BiWallet,
  BiWrench,
} from 'react-icons/bi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import FieldRow from '../../components/FieldRow';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import EmptyState from '../../components/EmptyState';
import ConfirmModal from '../../components/ConfirmModal';
import BlockedBox from '../../components/BlockedBox';
import MoneyText from '../../components/MoneyText';
import StatusBadge from '../../components/StatusBadge';
import StatusSteps from '../../components/StatusSteps';
import { useAuth } from '../../context/AuthContext';
import { ROLE, ROOM_STATUS } from '../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import roomApi from './room.api';
import RoomFormModal from './components/RoomFormModal';
import RoomFloorMap from './components/RoomFloorMap';
import RoomTenancySection from './components/RoomTenancySection';

const STEPS = [ROOM_STATUS.AVAILABLE, ROOM_STATUS.OCCUPIED, ROOM_STATUS.MAINTENANCE];

// dòng thông tin: icon đơn sắc + nhãn nhạt, giá trị đậm (giống chi tiết tòa / Manager)
// inline-flex để dấu * đỏ của FieldRow vẫn đứng ngay sau nhãn
const InfoRow = ({ icon: Icon, label, required = false, children }) => (
  <FieldRow
    label={
      <span className="inline-flex items-center gap-2 fw-normal text-secondary">
        <Icon />
        {label}
      </span>
    }
    required={required}
  >
    <span className="fw-medium text-body-emphasis">{children ?? '—'}</span>
  </FieldRow>
);

const RoomDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  // trạng thái tải phòng: loading → ok | notFound | error
  const [state, setState] = useState({ status: 'loading', room: null, error: '' });
  const [roomTypes, setRoomTypes] = useState([]);
  const [neighbours, setNeighbours] = useState(null); // phòng cùng tầng, null = đang tải
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [blockedReason, setBlockedReason] = useState(''); // lý do BE chặn xóa (UC-18)

  const room = state.room;
  const mergeRoom = (next) =>
    setState((current) => ({ ...current, room: { ...current.room, ...next } }));

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadRoom = useCallback(
    () =>
      roomApi
        .detail(id)
        .then((response) => setState({ status: 'ok', room: response.data, error: '' }))
        .catch((error) =>
          setState({
            status: error.status === 404 ? 'notFound' : 'error',
            room: null,
            error: error.message,
          }),
        ),
    [id],
  );

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // danh mục loại phòng cho modal sửa (chỉ Admin)
  useEffect(() => {
    if (!isAdmin) return;
    roomApi
      .listRoomTypes()
      .then((response) => setRoomTypes(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRoomTypes([]));
  }, [isAdmin]);

  // phòng cùng tầng: chuyển nhanh sang phòng bên cạnh
  const buildingId = room?.buildingId ?? room?.building?._id;
  const floorNumber = room?.floorNumber;
  useEffect(() => {
    if (!buildingId || !floorNumber) return;
    roomApi
      .list(buildingId, { floor: floorNumber })
      .then((response) => setNeighbours(Array.isArray(response.data) ? response.data : []))
      .catch(() => setNeighbours([]));
  }, [buildingId, floorNumber]);

  const buildingPath = isAdmin
    ? buildingId
      ? `/buildings/${buildingId}`
      : '/buildings'
    : '/my-building';

  const handleRetry = () => {
    setState({ status: 'loading', room: null, error: '' });
    loadRoom();
  };

  // UC-17: đổi nhanh Trống ↔ Bảo trì; BE chặn (vd còn hợp đồng nháp) thì báo đúng câu BE trả
  const handleChangeStatus = async (status) => {
    setChangingStatus(true);
    try {
      const response = await roomApi.update(room._id, { status });
      mergeRoom(response.data);
      toast.success(
        status === ROOM_STATUS.MAINTENANCE
          ? 'Đã chuyển phòng sang bảo trì'
          : 'Đã chuyển phòng về trống',
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setChangingStatus(false);
    }
  };

  // UC-18: xóa mềm phòng; bị chặn (còn hợp đồng) thì hiện lý do BE trả trong khung đỏ
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await roomApi.remove(room._id);
      toast.success('Xóa phòng thành công');
      navigate(buildingPath, { replace: true });
    } catch (error) {
      setShowDelete(false);
      setDeleting(false);
      if (error.status === 400) setBlockedReason(error.message);
      else toast.error(error.message);
    }
  };

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải phòng">
        <Placeholder as="div" className="mb-3">
          <Placeholder className="w-64 h-6 rounded bg-body-tertiary" />
        </Placeholder>
        <Card>
          <Card.Body>
            <SkeletonRows rows={5} columns={2} />
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (state.status === 'notFound') {
    return (
      <EmptyState message="Không tìm thấy phòng. Có thể phòng đã bị xóa.">
        <Button variant="secondary" onClick={() => navigate(buildingPath)}>
          {isAdmin ? 'Về danh sách tòa nhà' : 'Về tòa của tôi'}
        </Button>
      </EmptyState>
    );
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message="Không tải được thông tin phòng"
        detail={state.error}
        onRetry={handleRetry}
      />
    );
  }

  const capacity = room.roomType?.capacity ?? '—';
  const occupantCount = room.occupantCount ?? 0;
  const images = room.images ?? [];
  const buildingName = room.building?.name ?? 'Tòa nhà';

  return (
    <>
      <PageHeader
        backTo={buildingPath}
        breadcrumbs={
          isAdmin
            ? [
                { label: 'Tòa nhà', to: '/buildings' },
                { label: buildingName, to: buildingPath },
                `Phòng ${room.roomNumber}`,
              ]
            : [{ label: 'Tòa của tôi', to: '/my-building' }, `Phòng ${room.roomNumber}`]
        }
        actions={
          isAdmin ? (
            <>
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => setShowForm(true)}
              >
                <BiEditAlt />
                Chỉnh sửa
              </Button>
              {/* Đang thuê do hợp đồng quyết định nên không có nút đổi trạng thái (BR-052) */}
              {room.status === ROOM_STATUS.AVAILABLE && (
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={() => handleChangeStatus(ROOM_STATUS.MAINTENANCE)}
                  disabled={changingStatus}
                >
                  <BiWrench />
                  Chuyển sang bảo trì
                </Button>
              )}
              {room.status === ROOM_STATUS.MAINTENANCE && (
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={() => handleChangeStatus(ROOM_STATUS.AVAILABLE)}
                  disabled={changingStatus}
                >
                  <BiCheckCircle />
                  Chuyển về trống
                </Button>
              )}
              <Button
                variant="secondary"
                className="flex items-center gap-2"
                onClick={() => setShowDelete(true)}
              >
                <BiTrash />
                Xóa phòng
              </Button>
            </>
          ) : (
            // Manager: phòng Trống thì tạo hợp đồng ngay cho phòng này (UC-24, mở form chọn sẵn phòng)
            room.status === ROOM_STATUS.AVAILABLE && (
              <Button
                as={Link}
                to={`/contracts/new?roomId=${room._id}`}
                variant="primary"
                className="flex items-center gap-2 no-underline"
              >
                <BiFile />
                Tạo hợp đồng
              </Button>
            )
          )
        }
      >
        <StatusSteps map={ROOM_STATUS_LABEL} steps={STEPS} current={room.status} />
      </PageHeader>

      <Card className="hf-paper">
        {/* định danh: tòa · tầng, mã phòng + nhãn trạng thái */}
        <div className="flex flex-col gap-1">
          <span className="small text-secondary">
            Phòng · {buildingName} · Tầng {room.floorNumber}
          </span>
          <span className="flex items-center gap-3">
            <h1 className="h3 fw-bold mb-0">{room.roomNumber}</h1>
            <StatusBadge map={ROOM_STATUS_LABEL} value={room.status} />
          </span>
        </div>

        {/* thông tin 2 cột; * đỏ ở các trường bắt buộc khi tạo phòng (UC-16) */}
        <div className="grid lg:grid-cols-2 column-gap-5">
          <div>
            <InfoRow icon={BiDoorOpen} label="Mã phòng" required>
              {room.roomNumber}
            </InfoRow>
            <InfoRow icon={BiBuildings} label="Tòa nhà">
              <Link to={buildingPath}>{buildingName}</Link>
            </InfoRow>
            <InfoRow icon={BiLayer} label="Tầng" required>
              Tầng {room.floorNumber}
            </InfoRow>
            <InfoRow icon={BiCategory} label="Loại phòng" required>
              {room.roomType?.name}
            </InfoRow>
            <InfoRow icon={BiGroup} label="Sức chứa">
              Tối đa {capacity} người{' '}
              <span className="fw-normal text-secondary">(theo loại phòng)</span>
            </InfoRow>
          </div>
          <div>
            <InfoRow icon={BiUser} label="Đang ở">
              {occupantCount} / {capacity} người
            </InfoRow>
            <InfoRow icon={BiArea} label="Diện tích" required>
              {room.area} m²
            </InfoRow>
            <InfoRow icon={BiMoney} label="Giá thuê" required>
              <span className="fw-semibold">
                <MoneyText value={room.rentPrice} />
              </span>{' '}
              / tháng
            </InfoRow>
            <InfoRow icon={BiWallet} label="Tiền cọc" required>
              <MoneyText value={room.deposit} />
            </InfoRow>
            <InfoRow icon={BiTime} label="Ngày tạo">
              {formatDate(room.createdAt)}
            </InfoRow>
          </div>
        </div>

        {/* UC-19 bổ sung (iter 2): hợp đồng đang hiệu lực + cư dân đang ở – chỉ Manager (Admin không gọi được API
            hợp đồng / cư dân). key = id phòng: sang phòng cùng tầng thì tải lại từ đầu */}
        {!isAdmin && <RoomTenancySection key={room._id} room={room} />}

        {/* ảnh phòng: hàng ảnh nhỏ, bấm mở ảnh gốc (giống chi tiết tòa) */}
        <div className="flex flex-col gap-2">
          <span className="fw-semibold">Ảnh phòng</span>
          {images.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {images.map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-40 h-28 overflow-hidden rounded border"
                  title="Xem ảnh gốc"
                >
                  <Image
                    src={url}
                    alt={`Phòng ${room.roomNumber} – ảnh ${index + 1}`}
                    className="h-full w-full object-cover transition-opacity hover:opacity-75"
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="hf-ph w-40 h-28">Chưa có ảnh</div>
          )}
        </div>

        {/* phòng cùng tầng: bấm ô để sang phòng bên cạnh */}
        <div className="flex flex-col gap-2">
          <span className="fw-semibold">
            Phòng cùng tầng{' '}
            <span className="fw-normal text-secondary">· Tầng {room.floorNumber}</span>
          </span>
          {neighbours === null ? (
            <SkeletonRows rows={1} columns={3} />
          ) : neighbours.length <= 1 ? (
            <span className="text-secondary">Tầng {room.floorNumber} chỉ có phòng này.</span>
          ) : (
            <RoomFloorMap rooms={neighbours} currentId={room._id} framed={false} />
          )}
        </div>

        {!isAdmin && (
          <Alert variant="info" className="mb-0">
            Bạn chỉ xem được thông tin phòng. Cấu hình phòng do Admin chỉnh sửa.
          </Alert>
        )}
      </Card>

      {showForm && (
        <RoomFormModal
          room={room}
          building={room.building}
          roomTypes={roomTypes}
          onHide={() => setShowForm(false)}
          onSaved={(updated) => {
            mergeRoom(updated);
            setShowForm(false);
          }}
        />
      )}

      <ConfirmModal
        show={showDelete}
        title={`Xóa phòng ${room.roomNumber}?`}
        message={`Phòng sẽ bị ẩn khỏi danh sách. Mã ${room.roomNumber} có thể dùng lại cho phòng mới trong tòa.`}
        confirmText="Xóa phòng"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      {/* UC-18 bị chặn: phòng còn hợp đồng đang hiệu lực / nháp → hiện đúng lý do BE trả */}
      <Modal show={Boolean(blockedReason)} onHide={() => setBlockedReason('')} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5">Không thể xóa phòng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BlockedBox message={blockedReason} />
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button variant="secondary" onClick={() => setBlockedReason('')}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default RoomDetailPage;
