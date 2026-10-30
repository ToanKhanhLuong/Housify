// UC-13: chi tiết tòa nhà (Admin). Nút: "Chỉnh sửa" (UC-13), "Xóa" (UC-14)
// Dải số liệu (tầng, phòng, lấp đầy, trống) lấy trực tiếp từ building.roomStats
// Tab "Danh sách phòng" (UC-16..19), "Sơ đồ tầng" (UC-15) và "Nội quy" (UC-23)
// Manager mở qua /my-building: chỉ xem, không có nút sửa / xóa / thêm phòng
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Image, Placeholder, Tab, Tabs } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import FieldRow from '../../components/FieldRow';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { formatDate } from '../../utils/format';
import buildingApi from './building.api';
import BuildingFormModal from './components/BuildingFormModal';
import BuildingRoomsTab from './components/BuildingRoomsTab';
import BuildingFloorsTab from './components/BuildingFloorsTab';
import BuildingRulesTab from './components/BuildingRulesTab';

const BuildingDetailPage = ({ buildingId }) => {
  const params = useParams();
  const id = buildingId ?? params.id;
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;
  const navigate = useNavigate();

  // trạng thái tải tòa: loading → ok | notFound | error
  const [state, setState] = useState({ status: 'loading', building: null, error: '' });
  const [rooms, setRooms] = useState(null); // phòng cho sơ đồ tầng
  const [roomsError, setRoomsError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const building = state.building;
  const setBuilding = (next) => setState((current) => ({ ...current, building: next }));

  const loadBuilding = useCallback(
    () =>
      buildingApi
        .detail(id)
        .then((response) => setState({ status: 'ok', building: response.data, error: '' }))
        .catch((error) =>
          setState({
            status: error.status === 404 ? 'notFound' : 'error',
            building: null,
            error: error.message,
          }),
        ),
    [id],
  );

  // Chỉ tải rooms cho Sơ đồ tầng (BuildingFloorsTab)
  const loadRoomsForFloors = useCallback(
    () =>
      buildingApi
        .rooms(id)
        .then((response) => {
          setRooms(Array.isArray(response.data) ? response.data : []);
          setRoomsError('');
        })
        .catch((error) => {
          setRooms([]);
          setRoomsError(error.message);
        }),
    [id],
  );

  useEffect(() => {
    loadBuilding();
    loadRoomsForFloors();
  }, [loadBuilding, loadRoomsForFloors]);

  const handleRetry = () => {
    setState({ status: 'loading', building: null, error: '' });
    loadBuilding();
  };

  const handleRetryRooms = () => {
    setRooms(null);
    setRoomsError('');
    loadRoomsForFloors();
  };

  // UC-14: Xóa tòa nhà (xóa mềm). Bị chặn thì hiển thị đúng message BE trả về
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await buildingApi.remove(building._id);
      toast.success('Xóa tòa nhà thành công');
      navigate('/buildings', { replace: true });
    } catch (error) {
      toast.error(error.message);
      setShowDelete(false);
      setDeleting(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải tòa nhà">
        <Placeholder as="div" className="mb-3">
          <Placeholder className="w-64 h-6 rounded bg-body-tertiary" />
        </Placeholder>
        <Card className="mb-3">
          <SkeletonRows rows={1} columns={4} />
        </Card>
        <Card>
          <SkeletonRows rows={4} columns={2} />
        </Card>
      </div>
    );
  }

  if (state.status === 'notFound') {
    return (
      <EmptyState message="Không tìm thấy tòa nhà. Có thể tòa đã bị xóa.">
        {isAdmin && (
          <Button variant="secondary" onClick={() => navigate('/buildings')}>
            Về danh sách tòa nhà
          </Button>
        )}
      </EmptyState>
    );
  }

  if (state.status === 'error') {
    return (
      <Card>
        <ErrorState
          message="Không tải được thông tin tòa nhà."
          detail={state.error}
          onRetry={handleRetry}
        />
      </Card>
    );
  }

  // Dải số liệu lấy TRỰC TIẾP từ roomStats do BE trả về trong chi tiết tòa
  const roomStats = building.roomStats ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const roomTotal = roomStats.total ?? 0;
  const occupied = roomStats.occupied ?? 0;
  const available = roomStats.available ?? 0;
  const occupancy = roomTotal ? Math.round((occupied / roomTotal) * 100) : 0;

  const stats = [
    ['Số tầng', building.floorCount, 'tầng'],
    ['Số phòng', roomTotal, 'phòng'],
    ['Đang thuê', `${occupied}/${roomTotal}`, `· ${occupancy}%`],
    ['Phòng trống', available, 'phòng'],
  ];

  return (
    <>
      <PageHeader
        backTo={isAdmin ? '/buildings' : undefined}
        title={building.name}
        subtitle={building.address}
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

      {/* Dải số liệu chính của tòa từ roomStats */}
      <Card className="mb-3">
        <Card.Body className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3">
          {stats.map(([label, value, unit]) => (
            <div key={label}>
              <div className="small text-secondary">{label}</div>
              <div className="h4 fw-semibold mb-0 tabular-nums">
                {value} {unit && <span className="fs-6 fw-normal text-secondary">{unit}</span>}
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>

      {/* Thông tin tòa nhà và ảnh */}
      <Card className="mb-3">
        <Card.Body className="p-4">
          <div className="grid lg:grid-cols-2 column-gap-5 mb-4">
            <div>
              <FieldRow label="Tên tòa nhà" required>
                {building.name}
              </FieldRow>
              <FieldRow label="Địa chỉ" required>
                {building.address}
              </FieldRow>
              <FieldRow label="Mô tả">
                {building.description ? (
                  <span className="whitespace-pre-line">{building.description}</span>
                ) : (
                  <span className="text-secondary">Chưa có mô tả</span>
                )}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Manager phụ trách">
                {building.manager?.name ?? (
                  <span className="text-secondary">
                    Chưa có Manager
                    {isAdmin && (
                      <>
                        {' · '}
                        <Link to="/managers">Phân công ở Quản lý Manager</Link>
                      </>
                    )}
                  </span>
                )}
              </FieldRow>
              <FieldRow label="Ngày tạo">{formatDate(building.createdAt)}</FieldRow>
            </div>
          </div>

          {building.images?.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              {building.images.map((url) => (
                <div
                  key={url}
                  className="group h-32 overflow-hidden rounded border bg-body-tertiary"
                >
                  <Image
                    src={url}
                    alt={building.name}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
                  />
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Khu vực Tabs: Phòng, Sơ đồ tầng, Nội quy */}
      <Card>
        <Card.Body className="p-4">
          <Tabs defaultActiveKey="rooms" className="mb-3" mountOnEnter>
            <Tab eventKey="rooms" title={`Danh sách phòng (${roomTotal})`}>
              <BuildingRoomsTab
                building={building}
                canEdit={isAdmin}
                onRoomChanged={() => {
                  loadBuilding();
                  loadRoomsForFloors();
                }}
              />
            </Tab>
            <Tab eventKey="floors" title={`Sơ đồ tầng (${building.floorCount})`}>
              <BuildingFloorsTab
                building={building}
                rooms={rooms}
                error={roomsError}
                canEdit={isAdmin}
                onRetry={handleRetryRooms}
                onChanged={(updated) => {
                  setBuilding({ ...building, ...updated });
                  loadRoomsForFloors();
                }}
              />
            </Tab>
            <Tab eventKey="rules" title="Nội quy">
              <BuildingRulesTab building={building} readOnly={!isAdmin} />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {showForm && (
        <BuildingFormModal
          building={building}
          onHide={() => setShowForm(false)}
          onSaved={(updated) => {
            setBuilding({ ...building, ...updated });
            setShowForm(false);
          }}
        />
      )}

      <ConfirmModal
        show={showDelete}
        title="Xóa tòa nhà"
        message="Thao tác này sẽ xóa tòa nhà và các dữ liệu liên quan. Bạn có chắc chắn?"
        confirmText="Xóa"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
};

export default BuildingDetailPage;
