// UC-13: chi tiết tòa nhà (Admin). Nút: "Chỉnh sửa" (UC-13), "Xóa" (UC-14)
// Dải số liệu (tầng, phòng, lấp đầy, trống) → tờ giấy thông tin → tab "Sơ đồ tầng" (UC-15) và "Nội quy" (UC-23)
// Phân công Manager làm ở module manager (UC-11)
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
import { ROOM_STATUS } from '../../constants/enums';
import { formatDate } from '../../utils/format';
import buildingApi from './building.api';
import BuildingFormModal from './components/BuildingFormModal';
import BuildingFloorsTab from './components/BuildingFloorsTab';
import BuildingRulesTab from './components/BuildingRulesTab';

const BuildingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // trạng thái tải: loading → ok | notFound | error
  const [state, setState] = useState({ status: 'loading', building: null, error: '' });
  const [rooms, setRooms] = useState(null); // null: đang tải phòng
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

  const loadRooms = useCallback(
    () =>
      buildingApi
        .rooms(id)
        .then((response) => {
          setRooms(response.data?.items ?? response.data ?? []);
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
    loadRooms();
  }, [loadBuilding, loadRooms]);

  const handleRetry = () => {
    setState({ status: 'loading', building: null, error: '' });
    loadBuilding();
  };

  const handleRetryRooms = () => {
    setRooms(null);
    setRoomsError('');
    loadRooms();
  };

  // UC-14: BE kiểm 2 điều kiện (không phòng nào còn hợp đồng hiệu lực / nháp, không còn Manager)
  // bị chặn thì message của BE nêu lý do và danh sách phòng đang vướng
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
    // khung xương giữ đúng bố cục: tiêu đề, dải số liệu, tờ giấy
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
        <Button variant="secondary" onClick={() => navigate('/buildings')}>
          Về danh sách tòa nhà
        </Button>
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

  // dải số liệu tính từ phòng thật của tòa
  const occupied = rooms?.filter((room) => room.status === ROOM_STATUS.OCCUPIED).length ?? 0;
  const available = rooms?.filter((room) => room.status === ROOM_STATUS.AVAILABLE).length ?? 0;
  const roomTotal = rooms?.length ?? 0;
  const occupancy = roomTotal ? Math.round((occupied / roomTotal) * 100) : 0;
  const pending = rooms === null ? '…' : null; // đang tải phòng thì số liệu hiện "…"

  const stats = [
    ['Số tầng', building.floorCount, 'tầng'],
    ['Số phòng', pending ?? roomTotal, 'phòng'],
    ['Đang thuê', pending ?? `${occupied}/${roomTotal}`, pending ? '' : `· ${occupancy}%`],
    ['Phòng trống', pending ?? available, 'phòng'],
  ];

  return (
    <>
      <PageHeader
        backTo="/buildings"
        title={building.name}
        subtitle={building.address}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              Chỉnh sửa
            </Button>
            <Button variant="secondary" onClick={() => setShowDelete(true)}>
              Xóa
            </Button>
          </>
        }
      />

      {/* dải số liệu: tòa có bao nhiêu phòng, đang lấp đầy bao nhiêu – câu Admin hỏi đầu tiên */}
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

      {/* tờ giấy kiểu Odoo: nhãn – giá trị 2 cột, ảnh, rồi tab */}
      <Card>
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
                    Chưa có Manager · <Link to="/managers">Phân công ở Quản lý Manager</Link>
                  </span>
                )}
              </FieldRow>
              <FieldRow label="Ngày tạo">{formatDate(building.createdAt)}</FieldRow>
            </div>
          </div>

          {building.images?.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
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

          <Tabs defaultActiveKey="floors" className="mb-3" mountOnEnter>
            <Tab eventKey="floors" title={`Sơ đồ tầng (${building.floorCount})`}>
              <BuildingFloorsTab
                building={building}
                rooms={rooms}
                error={roomsError}
                canEdit
                onRetry={handleRetryRooms}
                onChanged={(updated) => setBuilding({ ...building, ...updated })}
              />
            </Tab>
            <Tab eventKey="rules" title="Nội quy">
              <BuildingRulesTab building={building} />
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
        message="Thao tác này sẽ xóa toàn bộ tầng và phòng thuộc tòa nhà. Bạn có chắc chắn?"
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
