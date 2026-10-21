// Quản lý loại phòng (UC-20) – Admin: bảng + thêm / sửa / xóa (xóa bị chặn khi loại đang được phòng dùng)
import { useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPen, FaPlus, FaTrash } from 'react-icons/fa';
import { roomTypeApi } from '../../../api/roomType.api.js';
import useFetch from '../../../hooks/useFetch.js';
import { formatDate } from '../../../utils/format.js';
import PageHeader from '../../../components/common/PageHeader.jsx';
import DataTable from '../../../components/common/DataTable.jsx';
import ConfirmModal from '../../../components/common/ConfirmModal.jsx';
import RoomTypeFormModal from './RoomTypeFormModal.jsx';

export default function RoomTypePage() {
  const { data: roomTypes, loading, reload } = useFetch(() => roomTypeApi.list(), []);

  // editing: undefined = đóng, null = thêm mới, object = đang sửa
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const closeDelete = () => {
    setDeleting(null);
    setDeleteError('');
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await roomTypeApi.remove(deleting._id);
      toast.success(res.message);
      closeDelete();
      reload();
    } catch (err) {
      // 409: loại phòng đang được dùng → hiện lý do ngay trong hộp
      if (err.status === 409) setDeleteError(err.message);
      else toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    { key: 'name', title: 'Tên loại phòng', render: (t) => <span className="fw-semibold">{t.name}</span> },
    {
      key: 'roomCount',
      title: 'Số phòng đang dùng',
      render: (t) => (t.roomCount > 0 ? `${t.roomCount} phòng` : <span className="text-muted">Chưa dùng</span>),
    },
    { key: 'createdAt', title: 'Ngày tạo', render: (t) => formatDate(t.createdAt) },
    {
      key: 'actions',
      title: '',
      className: 'text-end',
      render: (t) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="light" onClick={() => setEditing(t)} aria-label={`Sửa ${t.name}`}>
            <FaPen />
          </Button>
          <Button size="sm" variant="light" className="text-danger" onClick={() => setDeleting(t)} aria-label={`Xóa ${t.name}`}>
            <FaTrash />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Loại phòng"
        subtitle="Danh mục dùng chung cho mọi tòa, để phân loại và lọc phòng. Giá và sức chứa đặt ở từng phòng."
        actions={
          <Button onClick={() => setEditing(null)} className="flex items-center gap-2">
            <FaPlus /> Thêm loại phòng
          </Button>
        }
      />

      <Card>
        <Card.Body className="p-0">
          <DataTable
            columns={columns}
            data={roomTypes ?? []}
            loading={loading}
            emptyMessage="Chưa có loại phòng nào. Cần ít nhất một loại phòng trước khi tạo phòng."
          />
        </Card.Body>
      </Card>

      {editing !== undefined && (
        <RoomTypeFormModal
          roomType={editing}
          onHide={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}

      <ConfirmModal
        show={Boolean(deleting)}
        title={`Xóa loại phòng "${deleting?.name}"?`}
        message={deleteError ? null : 'Loại phòng sẽ không còn hiện trong form tạo phòng.'}
        confirmText="Xóa"
        variant="danger"
        loading={deleteLoading}
        disabled={Boolean(deleteError)}
        onConfirm={handleDelete}
        onCancel={closeDelete}
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
