// UC-21: quản lý dịch vụ (Admin) theo mockup docs/mock/Services.dc.html, cùng khuôn danh sách loại phòng
// ControlBar: thêm, tìm theo tên, lọc và nhóm theo cách tính. Danh sách ít, không phân trang → lọc ngay ở FE
// Bấm thẻ mở form sửa; xóa (xóa mềm) nằm trong form sửa
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BiPlus, BiReset } from 'react-icons/bi';
import { toast } from 'react-toastify';
import ControlBar from '../../components/ControlBar';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ItemCard from '../../components/ItemCard';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import serviceApi from './service.api';
import ServiceFormModal from './components/ServiceFormModal';

const MODE = { METERED: 'metered', FIXED: 'fixed' };
const modeOf = (service) => (service.isFixed ? MODE.FIXED : MODE.METERED);

// isFixed là Boolean, không phải enum nên bảng nhãn đặt ở đây
const MODE_LABEL = {
  [MODE.METERED]: { label: 'Theo chỉ số', variant: 'primary' },
  [MODE.FIXED]: { label: 'Cố định', variant: 'secondary' },
};

const FILTER_GROUPS = [
  {
    id: 'mode',
    label: 'Cách tính',
    type: 'checkbox',
    options: [
      { value: MODE.METERED, label: 'Theo chỉ số' },
      { value: MODE.FIXED, label: 'Cố định' },
    ],
  },
];
const GROUP_BY_OPTIONS = [{ value: 'mode', label: 'Cách tính' }];

const GROUPS = [
  { mode: MODE.METERED, hint: 'Hóa đơn ghi chỉ số cũ / mới' },
  { mode: MODE.FIXED, hint: 'Hóa đơn tính số lượng × đơn giá' },
];

const ServiceListPage = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ mode: [] });
  const [groupBy, setGroupBy] = useState('mode');
  const [editing, setEditing] = useState(null); // null: đóng form · {}: thêm mới · dịch vụ: sửa
  const [deleting, setDeleting] = useState(null); // dịch vụ đang chờ xác nhận xóa
  const [submitting, setSubmitting] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadServices = useCallback(
    () =>
      serviceApi
        .list()
        .then((response) => {
          setServices(Array.isArray(response.data) ? response.data : []);
          setLoadError('');
        })
        .catch((error) => setLoadError(error.message))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleRetry = () => {
    setLoading(true);
    loadServices();
  };

  const handleResetFilters = () => {
    setQuery('');
    setFilters({ mode: [] });
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await serviceApi.remove(deleting._id);
      toast.success('Xóa dịch vụ thành công');
      setDeleting(null);
      loadServices();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // lọc ở FE: tên chứa từ khóa, đúng cách tính (chọn cả hai = không lọc)
  const keyword = query.trim().toLowerCase();
  const shown = services.filter(
    (service) =>
      (!keyword || service.name.toLowerCase().includes(keyword)) &&
      (filters.mode.length === 0 || filters.mode.includes(modeOf(service))),
  );
  const isFiltering = Boolean(keyword || filters.mode.length);

  const renderCards = (items) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((service) => (
        <ItemCard
          key={service._id}
          onClick={() => setEditing(service)}
          title={service.name}
          badge={<StatusBadge map={MODE_LABEL} value={modeOf(service)} />}
          subtitle={`Đơn vị: ${service.unit}`}
        />
      ))}
    </div>
  );

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
          message="Không tải được danh sách dịch vụ"
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
              <EmptyState message="Không có dịch vụ nào phù hợp. Thử đổi từ khóa hoặc bỏ bớt bộ lọc.">
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
              <EmptyState message="Chưa có dịch vụ nào. Bấm Thêm dịch vụ để bắt đầu.">
                <Button variant="secondary" onClick={() => setEditing({})}>
                  Thêm dịch vụ
                </Button>
              </EmptyState>
            )}
          </Card.Body>
        </Card>
      );
    }

    if (!groupBy) return renderCards(shown);

    return GROUPS.map(({ mode, hint }) => {
      const items = shown.filter((service) => modeOf(service) === mode);
      if (items.length === 0) return null;
      return (
        <section key={mode} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="fw-semibold">{MODE_LABEL[mode].label}</span>
            <Badge pill bg="secondary-subtle" text="secondary-emphasis">
              {items.length}
            </Badge>
            <span className="small text-secondary">{hint}</span>
          </div>
          {renderCards(items)}
        </section>
      );
    });
  };

  return (
    <>
      {/* không dùng overflow-hidden: bảng Bộ lọc xổ ra ngoài thẻ sẽ bị cắt */}
      <Card className="mb-3">
        <ControlBar
          actions={
            <>
              <Button
                variant="primary"
                className="flex items-center gap-1"
                onClick={() => setEditing({})}
              >
                <BiPlus />
                Thêm dịch vụ
              </Button>
              {/* UC-22 */}
              <Button variant="secondary" onClick={() => navigate('/services/prices')}>
                Giá dịch vụ
              </Button>
            </>
          }
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Tìm dịch vụ..."
          filterGroups={FILTER_GROUPS}
          selectedFilters={filters}
          onFilterChange={(next) => setFilters({ mode: next.mode ?? [] })}
          groupByOptions={GROUP_BY_OPTIONS}
          selectedGroupBy={groupBy}
          onGroupByChange={setGroupBy}
          count={loading || loadError ? null : `${shown.length} dịch vụ`}
        />
      </Card>

      {renderContent()}

      {editing && (
        <ServiceFormModal
          service={editing}
          onHide={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadServices();
          }}
          onDelete={() => {
            setDeleting(editing); // đóng form rồi mới mở hộp xác nhận, không chồng 2 modal
            setEditing(null);
          }}
        />
      )}

      <ConfirmModal
        show={Boolean(deleting)}
        title="Xóa dịch vụ"
        message={`Bạn chắc chắn muốn xóa dịch vụ "${deleting?.name}"? Dịch vụ sẽ không còn trên hóa đơn mới, hóa đơn đã lập vẫn giữ nguyên.`}
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
};

export default ServiceListPage;
