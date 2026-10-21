// Chi tiết phòng – Admin (UC-19), có nút Chỉnh sửa (UC-17) và Xóa (UC-18, bị chặn thì hiện lý do)
import { useState } from 'react';
import { Alert, Breadcrumb, Button } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPen, FaTrash } from 'react-icons/fa';
import { roomApi } from '../../../api/room.api.js';
import useFetch from '../../../hooks/useFetch.js';
import PageHeader from '../../../components/common/PageHeader.jsx';
import Loading from '../../../components/common/Loading.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import ConfirmModal from '../../../components/common/ConfirmModal.jsx';
import RoomInfo from '../../../components/room/RoomInfo.jsx';

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: room, loading, error } = useFetch(() => roomApi.get(id), [id]);

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (loading) return <Loading />;
  if (error || !room) return <EmptyState message={error?.message || 'Phòng không tồn tại hoặc đã bị xóa.'} />;

  const building = room.buildingId;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await roomApi.remove(id);
      toast.success(res.message);
      navigate(`/admin/buildings/${building._id}?tab=rooms`, { replace: true });
    } catch (err) {
      // 409: đang có khách / có hợp đồng nháp → hiện lý do trong hộp
      if (err.status === 409) setDeleteError(err.message);
      else toast.error(err.message);
      setDeleting(false);
    }
  };

  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/admin/buildings' }}>
          Tòa nhà
        </Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/admin/buildings/${building._id}?tab=rooms` }}>
          {building.name}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Phòng {room.roomNumber}</Breadcrumb.Item>
      </Breadcrumb>
      <PageHeader
        title={`Phòng ${room.roomNumber}`}
        subtitle={`${room.roomTypeId?.name} | Tầng ${room.floorNumber} | ${building.name}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/admin/rooms/${id}/edit`)} className="flex items-center gap-2">
              <FaPen /> Chỉnh sửa
            </Button>
            <Button variant="danger" onClick={() => setShowDelete(true)} className="flex items-center gap-2">
              <FaTrash /> Xóa
            </Button>
          </>
        }
      />

      <RoomInfo room={room} />

      <ConfirmModal
        show={showDelete}
        title={`Xóa phòng ${room.roomNumber}?`}
        message={deleteError ? null : 'Phòng sẽ bị ẩn khỏi mọi danh sách. Lịch sử hợp đồng và hóa đơn vẫn được giữ lại.'}
        confirmText="Xóa phòng"
        variant="danger"
        loading={deleting}
        disabled={Boolean(deleteError)}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDelete(false);
          setDeleteError('');
        }}
      >
        {deleteError && (
          <Alert variant="danger" className="mb-0">
            {deleteError}
          </Alert>
        )}
      </ConfirmModal>
    </div>
  );
}
