// UC-13: chi tiết tòa nhà theo mockup docs/mock/BuildingDetail.dc.html và chốt 30/10
// Admin: "Chỉnh sửa" (UC-13), "Thao tác ▾ → Xóa tòa nhà" (UC-14; bị chặn thì hiện lý do BE trả)
// Tờ giấy: ảnh đại diện (ảnh đầu tiên), tên, địa chỉ, số tầng / phòng theo trạng thái, Manager, mô tả, ảnh
// Tab: "Phòng" (UC-15..19, gồm Quản lý tầng), "Giá dịch vụ" (chỉ Admin, UC-22 xem), "Nội quy" (UC-23)
// Manager mở qua /my-building: chỉ xem, không có nút sửa / xóa / thêm phòng, không có tab Giá dịch vụ (API chỉ Admin)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Image, Modal, Placeholder, Tab, Tabs } from 'react-bootstrap';
import { BiEditAlt, BiTrash } from 'react-icons/bi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import FieldRow from '../../components/FieldRow';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import ConfirmModal from '../../components/ConfirmModal';
import ActionDropdown from '../../components/ActionDropdown';
import BlockedBox from '../../components/BlockedBox';
import { useAuth } from '../../context/AuthContext';
import { ROLE, ROOM_STATUS } from '../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import buildingApi from './building.api';
import BuildingFormModal from './components/BuildingFormModal';
import BuildingRoomsTab from './components/BuildingRoomsTab';
import BuildingRulesTab from './components/BuildingRulesTab';
import BuildingServicePricesTab from './components/BuildingServicePricesTab';

// nhãn số phòng theo trạng thái trên đầu tờ giấy: màu theo nhãn trạng thái phòng
const STAT_BADGES = [
  { key: 'available', status: ROOM_STATUS.AVAILABLE },
  { key: 'occupied', status: ROOM_STATUS.OCCUPIED },
  { key: 'maintenance', status: ROOM_STATUS.MAINTENANCE },
];

const BuildingDetailPage = ({ buildingId }) => {
  const params = useParams();
  const id = buildingId ?? params.id;
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;
  const navigate = useNavigate();

  // trạng thái tải tòa: loading → ok | notFound | error
  const [state, setState] = useState({ status: 'loading', building: null, error: '' });
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blockedReason, setBlockedReason] = useState(''); // lý do BE chặn xóa (UC-14)

  const building = state.building;
  const mergeBuilding = (next) =>
    setState((current) => ({ ...current, building: { ...current.building, ...next } }));

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
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

  useEffect(() => {
    loadBuilding();
  }, [loadBuilding]);

  const handleRetry = () => {
    setState({ status: 'loading', building: null, error: '' });
    loadBuilding();
  };

  // UC-14: xóa mềm tòa; bị chặn (còn Manager / phòng có hợp đồng) thì hiện lý do BE trả trong khung đỏ
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await buildingApi.remove(building._id);
      toast.success('Xóa tòa nhà thành công');
      navigate('/buildings', { replace: true });
    } catch (error) {
      setShowDelete(false);
      setDeleting(false);
      if (error.status === 400) setBlockedReason(error.message);
      else toast.error(error.message);
    }
  };

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải tòa nhà">
        <Placeholder as="div" className="mb-3">
          <Placeholder className="w-64 h-6 rounded bg-body-tertiary" />
        </Placeholder>
        <Card>
          <Card.Body>
            <SkeletonRows rows={5} columns={3} media />
          </Card.Body>
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
      <ErrorState
        message="Không tải được thông tin tòa nhà"
        detail={state.error}
        onRetry={handleRetry}
      />
    );
  }

  const roomStats = building.roomStats ?? {};
  const images = building.images ?? [];

  return (
    <>
      <PageHeader
        backTo={isAdmin ? '/buildings' : undefined}
        breadcrumbs={
          isAdmin ? [{ label: 'Tòa nhà', to: '/buildings' }, building.name] : ['Tòa của tôi']
        }
        actions={
          isAdmin && (
            <>
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => setShowForm(true)}
              >
                <BiEditAlt />
                Chỉnh sửa
              </Button>
              {/* thao tác nguy hiểm gom vào "Thao tác ▾" như mockup */}
              <ActionDropdown
                size="md"
                items={[
                  {
                    label: 'Xóa tòa nhà',
                    icon: BiTrash,
                    danger: true,
                    onClick: () => setShowDelete(true),
                  },
                ]}
              />
            </>
          )
        }
      />

      <Card className="hf-paper">
        {/* định danh: ảnh đại diện = ảnh đầu tiên, tên, địa chỉ, số tầng / phòng theo trạng thái */}
        <div className="flex flex-wrap items-start gap-4">
          {images[0] ? (
            <a
              href={images[0]}
              target="_blank"
              rel="noreferrer"
              className="block w-56 h-36 shrink-0 overflow-hidden rounded border"
              title="Xem ảnh gốc"
            >
              <Image src={images[0]} alt={building.name} className="h-full w-full object-cover" />
            </a>
          ) : (
            <div className="hf-ph w-56 h-36 shrink-0">Chưa có ảnh</div>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="small text-secondary">Tòa nhà</span>
            <h1 className="h3 fw-bold mb-0">{building.name}</h1>
            <span>{building.address}</span>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">
                {building.floorCount} tầng
              </span>
              <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">
                {roomStats.total ?? 0} phòng
              </span>
              {STAT_BADGES.map((item) => {
                const { variant, label } = ROOM_STATUS_LABEL[item.status];
                return (
                  <span
                    key={item.key}
                    className={`badge rounded-pill bg-${variant}-subtle text-${variant}-emphasis`}
                  >
                    {roomStats[item.key] ?? 0} {label.toLowerCase()}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* thông tin 2 cột; * đỏ ở tên, địa chỉ (bắt buộc khi tạo, UC-12) */}
        <div className="grid lg:grid-cols-2 column-gap-5">
          <div>
            <FieldRow label="Manager phụ trách">
              {building.manager ? (
                isAdmin ? (
                  <Link to={`/managers/${building.manager._id}`}>{building.manager.name}</Link>
                ) : (
                  building.manager.name
                )
              ) : (
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
          <div>
            <FieldRow label="Mô tả">
              {building.description ? (
                <span className="whitespace-pre-line">{building.description}</span>
              ) : (
                <span className="text-secondary">Chưa có mô tả</span>
              )}
            </FieldRow>
          </div>
        </div>

        {/* hàng ảnh nhỏ, bấm mở ảnh gốc */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block w-32 h-20 overflow-hidden rounded border"
                title={index === 0 ? 'Ảnh đại diện' : 'Xem ảnh gốc'}
              >
                <Image
                  src={url}
                  alt={`${building.name} – ảnh ${index + 1}`}
                  className="h-full w-full object-cover transition-opacity hover:opacity-75"
                />
              </a>
            ))}
          </div>
        )}

        <Tabs defaultActiveKey="rooms" className="mb-0" mountOnEnter>
          <Tab eventKey="rooms" title="Phòng" className="pt-3">
            <BuildingRoomsTab
              building={building}
              canEdit={isAdmin}
              onRoomChanged={loadBuilding}
              onBuildingChanged={mergeBuilding}
            />
          </Tab>
          {isAdmin && (
            <Tab eventKey="prices" title="Giá dịch vụ" className="pt-3">
              <BuildingServicePricesTab building={building} canEdit={isAdmin} />
            </Tab>
          )}
          <Tab eventKey="rules" title="Nội quy" className="pt-3">
            <BuildingRulesTab building={building} readOnly={!isAdmin} />
          </Tab>
        </Tabs>
      </Card>

      {showForm && (
        <BuildingFormModal
          building={building}
          onHide={() => setShowForm(false)}
          onSaved={(updated) => {
            mergeBuilding(updated);
            setShowForm(false);
          }}
        />
      )}

      <ConfirmModal
        show={showDelete}
        title="Xóa tòa nhà"
        message={`Xóa tòa "${building.name}"? Toàn bộ phòng của tòa cũng bị xóa theo.`}
        confirmText="Xóa"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      {/* UC-14 bị chặn: còn Manager phụ trách hoặc còn phòng có hợp đồng → hiện đúng lý do BE trả */}
      <Modal show={Boolean(blockedReason)} onHide={() => setBlockedReason('')} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5">Không thể xóa tòa nhà</Modal.Title>
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-2">
          <BlockedBox message={blockedReason} />
          <div className="small text-secondary">
            Khi đủ điều kiện, xóa tòa sẽ xóa mềm luôn các phòng thuộc tòa.
          </div>
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

export default BuildingDetailPage;
