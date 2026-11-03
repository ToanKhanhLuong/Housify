// UC-20: quản lý loại phòng (Admin) theo mockup docs/mock/RoomTypes.dc.html, cùng khuôn danh sách tòa / Manager
// ControlBar: thêm, tìm theo tên, lọc đang dùng / chưa dùng, đổi Thẻ / Bảng. Danh sách ít, không phân trang → lọc ngay ở FE
// Bấm thẻ / dòng mở form sửa; nút "Xóa" trong form sửa. Còn phòng dùng thì bị chặn, hiện lý do (câu giống BE)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { BiPlus, BiReset } from 'react-icons/bi';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import ItemCard from '../../components/ItemCard';
import ConfirmModal from '../../components/ConfirmModal';
import BlockedBox from '../../components/BlockedBox';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import { formatDate } from '../../utils/format';
import roomTypeApi from './roomType.api';
import RoomTypeFormModal from './components/RoomTypeFormModal';

const FILTER_GROUPS = [
  {
    id: 'usage',
    label: 'Tình trạng sử dụng',
    type: 'checkbox',
    options: [
      { value: 'used', label: 'Đang có phòng dùng' },
      { value: 'unused', label: 'Chưa có phòng dùng' },
    ],
  },
];

const usageText = (roomCount) =>
  roomCount > 0 ? `Đang dùng ở ${roomCount} phòng` : 'Chưa có phòng nào dùng';

// câu chặn xóa giống BE (roomType.service deleteRoomType)
const blockedText = (roomCount) => `Không thể xóa loại phòng đang được dùng bởi ${roomCount} phòng`;

// ô tròn ghi sức chứa (giống mockup), màu nhạt theo tông chính
const CapacityAvatar = ({ capacity }) => (
  <span
    className="inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-circle bg-primary-subtle text-primary-emphasis fw-bold"
    title={`Tối đa ${capacity} người`}
  >
    {capacity}
  </span>
);

const RoomTypeListPage = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ usage: [] });
  const [view, setView] = useState('cards');
  const [editing, setEditing] = useState(null); // null: đóng form · {}: thêm mới · loại phòng: sửa
  const [deleting, setDeleting] = useState(null); // loại phòng đang chờ xác nhận xóa
  const [submitting, setSubmitting] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadRoomTypes = useCallback(
    () =>
      roomTypeApi
        .list()
        .then((response) => {
          setRoomTypes(Array.isArray(response.data) ? response.data : []);
          setLoadError('');
        })
        .catch((error) => setLoadError(error.message))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    loadRoomTypes();
  }, [loadRoomTypes]);

  const handleRetry = () => {
    setLoading(true);
    loadRoomTypes();
  };

  const handleResetFilters = () => {
    setQuery('');
    setFilters({ usage: [] });
  };

  // bấm "Xóa" trong form: còn phòng dùng thì báo chặn ngay, không cần hỏi xác nhận
  const handleAskDelete = (roomType) => {
    setEditing(null);
    if (roomType.roomCount > 0) setBlockedReason(blockedText(roomType.roomCount));
    else setDeleting(roomType);
  };

  // UC-20: xóa mềm loại phòng. BE chặn (vừa có phòng dùng) → hiện đúng câu BE trả
  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await roomTypeApi.remove(deleting._id);
      toast.success('Xóa loại phòng thành công');
      loadRoomTypes();
    } catch (error) {
      if (error.status === 400) setBlockedReason(error.message);
      else toast.error(error.message);
    } finally {
      setDeleting(null);
      setSubmitting(false);
    }
  };

  // lọc ở FE: tên chứa từ khóa, đang dùng / chưa dùng (chọn cả hai = không lọc)
  const keyword = query.trim().toLowerCase();
  const usage = filters.usage.length === 1 ? filters.usage[0] : '';
  const shown = roomTypes.filter((type) => {
    if (keyword && !type.name.toLowerCase().includes(keyword)) return false;
    if (usage === 'used') return type.roomCount > 0;
    if (usage === 'unused') return !type.roomCount;
    return true;
  });
  const isFiltering = Boolean(keyword || filters.usage.length);

  const columns = [
    {
      key: 'name',
      title: 'Tên loại phòng',
      render: (row) => (
        <span className="flex items-center gap-2 fw-semibold">
          <CapacityAvatar capacity={row.capacity} />
          {row.name}
        </span>
      ),
    },
    { key: 'capacity', title: 'Sức chứa', render: (row) => `Tối đa ${row.capacity} người` },
    {
      key: 'roomCount',
      title: 'Số phòng đang dùng',
      align: 'end',
      render: (row) => `${row.roomCount ?? 0} phòng`,
    },
    {
      key: 'createdAt',
      title: 'Ngày tạo',
      align: 'end',
      render: (row) => formatDate(row.createdAt),
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <Card.Body>
            <SkeletonRows rows={3} columns={3} />
          </Card.Body>
        </Card>
      );
    }
    if (loadError) {
      return (
        <ErrorState
          message="Không tải được danh sách loại phòng"
          detail={loadError}
          onRetry={handleRetry}
        />
      );
    }
    if (shown.length === 0) {
      return (
        <Card>
          <Card.Body>
            {isFiltering ? (
              <EmptyState message="Không có loại phòng nào phù hợp. Thử đổi từ khóa hoặc bỏ bớt bộ lọc.">
                <Button
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={handleResetFilters}
                >
                  <BiReset />
                  Xóa bộ lọc
                </Button>
              </EmptyState>
            ) : (
              <EmptyState message="Chưa có loại phòng nào. Bấm Thêm loại phòng để bắt đầu.">
                <Button variant="secondary" onClick={() => setEditing({})}>
                  Thêm loại phòng
                </Button>
              </EmptyState>
            )}
          </Card.Body>
        </Card>
      );
    }

    if (view === 'table') {
      return <DataTable columns={columns} data={shown} onRowClick={(row) => setEditing(row)} />;
    }

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {shown.map((type) => (
          <ItemCard
            key={type._id}
            onClick={() => setEditing(type)}
            title={
              <span className="flex items-center gap-3">
                <CapacityAvatar capacity={type.capacity} />
                {type.name}
              </span>
            }
            subtitle={`Tối đa ${type.capacity} người · ${usageText(type.roomCount)}`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* không dùng overflow-hidden: bảng Bộ lọc xổ ra ngoài thẻ sẽ bị cắt */}
      <Card className="mb-3">
        <ControlBar
          actions={
            <Button
              variant="primary"
              className="flex items-center gap-1"
              onClick={() => setEditing({})}
            >
              <BiPlus />
              Thêm loại phòng
            </Button>
          }
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Tìm theo tên loại phòng..."
          filterGroups={FILTER_GROUPS}
          selectedFilters={filters}
          onFilterChange={(next) => setFilters({ usage: next.usage ?? [] })}
          count={loading || loadError ? null : `${shown.length} loại phòng`}
          view={view}
          onViewChange={setView}
        />
      </Card>

      <p className="small text-secondary mb-3">
        Loại phòng dùng chung cho mọi tòa nhà. Sức chứa của phòng lấy theo loại phòng.
      </p>

      {renderContent()}

      {editing && (
        <RoomTypeFormModal
          roomType={editing}
          onHide={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadRoomTypes();
          }}
          onDelete={() => handleAskDelete(editing)}
        />
      )}

      <ConfirmModal
        show={Boolean(deleting)}
        title={`Xóa loại phòng "${deleting?.name}"?`}
        message="Loại phòng sẽ bị ẩn khỏi danh sách. Tên này có thể dùng lại cho loại phòng mới."
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      {/* bị chặn: còn phòng dùng loại này → hiện lý do trong khung đỏ */}
      <Modal show={Boolean(blockedReason)} onHide={() => setBlockedReason('')} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5">Không thể xóa loại phòng</Modal.Title>
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-2">
          <BlockedBox message={blockedReason} />
          <div className="small text-secondary">
            Đổi các phòng đó sang loại khác rồi mới xóa được loại phòng này.
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

export default RoomTypeListPage;
