// UC-20: quản lý loại phòng (Admin) theo mockup docs/mock/RoomTypes.dc.html, cùng khuôn danh sách tòa / Manager
// ControlBar: thêm, tìm theo tên, lọc đang dùng / chưa dùng, đổi Thẻ / Bảng. Danh sách ít, không phân trang → lọc ngay ở FE
// Bấm thẻ / dòng mở form sửa; nút "Xóa" trong form sửa. Còn phòng dùng thì bị chặn, hiện lý do (câu giống BE)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { BiBed, BiChevronRight, BiGroup, BiPlus, BiReset, BiTime } from 'react-icons/bi';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import Pager from '../../components/Pager';
import ConfirmModal from '../../components/ConfirmModal';
import BlockedBox from '../../components/BlockedBox';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import { useSavedState } from '../../utils/filter';
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

// câu chặn xóa giống BE (roomType.service deleteRoomType)
const blockedText = (roomCount) => `Không thể xóa loại phòng đang được dùng bởi ${roomCount} phòng`;

const capacityTypeLabel = (capacity) => {
  if (capacity === 1) return 'Phòng đơn';
  if (capacity === 2) return 'Phòng đôi';
  return `Phòng ở ghép (${capacity} người)`;
};

// Biểu tượng đại diện loại phòng thay cho avatar số
const RoomTypeIcon = ({ size = 22, className = '' }) => (
  <div
    className={`shrink-0 bg-primary-subtle text-primary flex items-center justify-center ${className}`}
  >
    <BiBed size={size} />
  </div>
);

const PAGE_SIZE = 8;

const RoomTypeListPage = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useSavedState('roomTypes:query', '');
  const [filters, setFilters] = useSavedState('roomTypes:filters', { usage: [] });
  const [view, setView] = useSavedState('roomTypes:view', 'cards');
  const [page, setPage] = useSavedState('roomTypes:page', 1);
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
    setPage(1);
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

  const maxPage = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, maxPage);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return shown.slice(start, start + PAGE_SIZE);
  }, [shown, safePage]);

  const columns = [
    {
      key: 'name',
      title: 'Loại phòng',
      render: (row) => (
        <div className="flex items-center gap-3">
          <RoomTypeIcon size={20} className="w-10 h-10 rounded-2" />
          <div className="flex flex-col">
            <span className="fw-semibold text-body-emphasis group-hover:text-primary transition-colors">
              {row.name}
            </span>
            <span className="small text-secondary">{capacityTypeLabel(row.capacity)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      title: 'Sức chứa tối đa',
      render: (row) => (
        <span className="badge rounded-pill bg-light border text-body fw-medium px-2.5 py-1.5 inline-flex items-center gap-1.5">
          <BiGroup className="text-primary" size={15} />
          Tối đa {row.capacity} người
        </span>
      ),
    },
    {
      key: 'roomCount',
      title: 'Tình trạng sử dụng',
      render: (row) => {
        const hasRooms = row.roomCount > 0;
        return (
          <div className="flex flex-col gap-0.5">
            <div>
              <span
                className={`badge rounded-pill ${
                  hasRooms
                    ? 'bg-success-subtle text-success-emphasis'
                    : 'bg-secondary-subtle text-secondary-emphasis'
                } px-2.5 py-1 fw-medium inline-flex items-center`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-circle ${
                    hasRooms ? 'bg-success' : 'bg-secondary'
                  } me-1.5 align-middle`}
                />
                {hasRooms ? 'Đang sử dụng' : 'Chưa gán phòng'}
              </span>
            </div>
            {hasRooms && (
              <span className="small text-secondary">{row.roomCount} phòng áp dụng</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      title: 'Ngày tạo',
      align: 'end',
      render: (row) => (
        <span className="text-secondary small inline-flex items-center gap-1.5 tabular-nums">
          <BiTime size={14} className="text-muted" />
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: '_action',
      title: '',
      align: 'end',
      render: () => (
        <span className="inline-flex items-center text-secondary opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all pe-1">
          <BiChevronRight size={20} />
        </span>
      ),
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
      return (
        <div className="flex flex-col gap-3">
          <DataTable
            columns={columns}
            data={paginatedItems}
            onRowClick={(row) => setEditing(row)}
          />
          {shown.length > 0 && (
            <div className="flex justify-end mt-1">
              <Pager
                page={safePage}
                limit={PAGE_SIZE}
                total={shown.length}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {paginatedItems.map((type) => {
            const hasRooms = type.roomCount > 0;
            return (
              <Card
                key={type._id}
                onClick={() => setEditing(type)}
                className="shadow-sm hover:shadow-md border border-light-subtle rounded-3 cursor-pointer transition-all duration-200 group bg-white hover:border-primary-subtle"
              >
                <Card.Body className="p-3.5 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <RoomTypeIcon size={24} className="w-12 h-12 rounded-3 group-hover:scale-105 transition-transform" />
                      <span
                        className={`badge rounded-pill ${
                          hasRooms
                            ? 'bg-success-subtle text-success-emphasis'
                            : 'bg-secondary-subtle text-secondary-emphasis'
                        } px-2.5 py-1 fw-medium`}
                      >
                        {hasRooms ? `${type.roomCount} phòng dùng` : 'Chưa dùng'}
                      </span>
                    </div>

                    <h3 className="h6 fw-bold text-body-emphasis group-hover:text-primary transition-colors mb-2">
                      {type.name}
                    </h3>

                    <div className="flex items-center justify-between text-secondary small py-2 px-2.5 rounded-2 bg-body-tertiary mb-3">
                      <span className="inline-flex items-center gap-1.5 fw-medium text-body">
                        <BiGroup className="text-primary" size={16} />
                        Tối đa {type.capacity} người
                      </span>
                      <span className="text-secondary small">{capacityTypeLabel(type.capacity)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-top border-light-subtle text-secondary small">
                    <span className="flex items-center gap-1 text-muted">
                      <BiTime size={14} />
                      {formatDate(type.createdAt)}
                    </span>
                    <span className="text-primary fw-medium inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Chỉnh sửa
                      <BiChevronRight size={16} />
                    </span>
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </div>
        {shown.length > 0 && (
          <div className="flex justify-end mt-1">
            <Pager
              page={safePage}
              limit={PAGE_SIZE}
              total={shown.length}
              onChange={setPage}
            />
          </div>
        )}
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
          onSearchChange={(q) => {
            setQuery(q);
            setPage(1);
          }}
          searchPlaceholder="Tìm theo tên loại phòng..."
          filterGroups={FILTER_GROUPS}
          selectedFilters={filters}
          onFilterChange={(next) => {
            setFilters({ usage: next.usage ?? [] });
            setPage(1);
          }}
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
