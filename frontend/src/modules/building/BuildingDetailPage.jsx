// UC-13: chi tiết tòa nhà (Admin). Nút: "Chỉnh sửa" (UC-13), "Xóa" (UC-14)
// Tab "Tầng" (UC-15) và "Nội quy" (UC-23). Phân công Manager làm ở module manager (UC-11)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Image, Tab, Tabs } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import FieldRow from '../../components/FieldRow';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import ConfirmModal from '../../components/ConfirmModal';
import { formatDate } from '../../utils/format';
import buildingApi from './building.api';
import BuildingFormModal from './components/BuildingFormModal';
import BuildingFloorsTab from './components/BuildingFloorsTab';
import BuildingRulesTab from './components/BuildingRulesTab';

const BuildingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadBuilding = useCallback(
    () =>
      buildingApi
        .detail(id)
        .then((response) => setBuilding(response.data))
        .catch((error) => toast.error(error.message))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    loadBuilding();
  }, [loadBuilding]);

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

  if (loading) return <Loading />;
  if (!building) return <EmptyState message="Không tìm thấy tòa nhà" />;

  return (
    <>
      <PageHeader
        backTo="/buildings"
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

      <Card>
        <Card.Body className="p-4">
          <div className="small text-secondary">Tòa nhà</div>
          <h2 className="h3 fw-semibold mb-4">{building.name}</h2>

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
                ) : null}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Số tầng" required>
                {building.floorCount}
              </FieldRow>
              <FieldRow label="Số phòng">{building.roomCount ?? 0}</FieldRow>
              <FieldRow label="Manager phụ trách">
                {building.manager?.name ?? <span className="text-secondary">Chưa có Manager</span>}
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
            <Tab eventKey="floors" title={`Tầng (${building.floorCount})`}>
              <BuildingFloorsTab
                building={building}
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
