// UC-20: quản lý loại phòng (Admin). Bấm dòng mở form sửa, nút "Xóa" nằm trong form sửa
// Danh sách hiển thị: tên, sức chứa, số phòng đang dùng (roomCount)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { BiSearch } from 'react-icons/bi';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import { formatDate } from '../../utils/format';
import roomTypeApi from './roomType.api';
import RoomTypeFormModal from './components/RoomTypeFormModal';

const RoomTypeListPage = () => {
  const [roomTypes, setRoomTypes] = useState(null); // null: đang tải
  const [loadError, setLoadError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState(null); // null: đóng form · {}: thêm mới · loại phòng: sửa
  const [deleting, setDeleting] = useState(null); // loại phòng đang chờ xác nhận xóa
  const [submitting, setSubmitting] = useState(false);

  const loadRoomTypes = useCallback(
    () =>
      roomTypeApi
        .list()
        .then((response) => {
          setRoomTypes(Array.isArray(response.data) ? response.data : []);
          setLoadError('');
        })
        .catch((error) => {
          setRoomTypes([]);
          setLoadError(error.message);
        }),
    [],
  );

  useEffect(() => {
    loadRoomTypes();
  }, [loadRoomTypes]);

  const handleRetry = () => {
    setRoomTypes(null);
    loadRoomTypes();
  };

  // UC-20: Xóa loại phòng. Bị chặn khi còn phòng sử dụng → hiện đúng message BE trả về
  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await roomTypeApi.remove(deleting._id);
      toast.success('Xóa loại phòng thành công');
      setDeleting(null);
      loadRoomTypes();
    } catch (error) {
      toast.error(error.message); // vd: "Không thể xóa loại phòng đang được dùng bởi 3 phòng"
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  const search = keyword.trim().toLowerCase();
  const shown = (roomTypes ?? []).filter(
    (type) => !search || type.name.toLowerCase().includes(search),
  );

  const columns = [
    { key: 'name', title: 'Tên loại phòng', className: 'fw-semibold' },
    {
      key: 'capacity',
      title: 'Sức chứa',
      render: (row) => `Tối đa ${row.capacity} người`,
    },
    {
      key: 'roomCount',
      title: 'Số phòng đang dùng',
      align: 'center',
      render: (row) => `${row.roomCount ?? 0} phòng`,
    },
    {
      key: 'createdAt',
      title: 'Ngày tạo',
      align: 'end',
      render: (row) => formatDate(row.createdAt),
    },
  ];

  const renderBody = () => {
    if (roomTypes === null) {
      return (
        <Card>
          <SkeletonRows rows={3} columns={4} />
        </Card>
      );
    }
    if (loadError) {
      return (
        <Card>
          <ErrorState
            message="Không tải được danh sách loại phòng."
            detail={loadError}
            onRetry={handleRetry}
          />
        </Card>
      );
    }
    if (roomTypes.length === 0) {
      return (
        <Card>
          <EmptyState message="Chưa có loại phòng nào. Bấm Thêm loại phòng để bắt đầu.">
            <Button variant="secondary" onClick={() => setEditing({})}>
              Thêm loại phòng
            </Button>
          </EmptyState>
        </Card>
      );
    }
    if (shown.length === 0) {
      return (
        <Card>
          <EmptyState message={`Không có loại phòng nào tên "${keyword.trim()}".`}>
            <Button variant="secondary" onClick={() => setKeyword('')}>
              Xóa tìm kiếm
            </Button>
          </EmptyState>
        </Card>
      );
    }
    return <DataTable columns={columns} data={shown} onRowClick={(row) => setEditing(row)} />;
  };

  return (
    <>
      <PageHeader
        title="Loại phòng"
        subtitle={
          roomTypes && !loadError
            ? `${roomTypes.length} loại · dùng để phân loại và quy định sức chứa phòng`
            : undefined
        }
        actions={
          <Button variant="primary" onClick={() => setEditing({})}>
            Thêm loại phòng
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <InputGroup className="w-full md:w-80">
          <InputGroup.Text className="text-secondary">
            <BiSearch size={16} aria-hidden="true" />
          </InputGroup.Text>
          <Form.Control
            name="keyword"
            type="search"
            placeholder="Tìm tên loại phòng"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Tìm tên loại phòng"
          />
        </InputGroup>
        {roomTypes && !loadError && (
          <span className="ms-auto text-secondary tabular-nums">{shown.length} loại</span>
        )}
      </div>

      {renderBody()}

      {editing && (
        <RoomTypeFormModal
          roomType={editing}
          onHide={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadRoomTypes();
          }}
          onDelete={() => {
            setDeleting(editing);
            setEditing(null);
          }}
        />
      )}

      <ConfirmModal
        show={Boolean(deleting)}
        title="Xóa loại phòng"
        message={`Bạn chắc chắn muốn xóa loại phòng "${deleting?.name}"?`}
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
};

export default RoomTypeListPage;
