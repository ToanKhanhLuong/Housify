// UC-09: danh sách Manager (Admin) theo mockup docs/mock/Managers.dc.html. UC-08: nút "Thêm Manager"
// Thanh ControlBar: tìm theo họ tên / email / SĐT, bộ lọc Trạng thái (chọn nhiều) + Phân công, nhóm theo Trạng thái,
// đổi Thẻ / Bảng. Dạng thẻ nhóm theo trạng thái thành 3 cột (Đang hoạt động, Chưa kích hoạt, Bị khóa)
// BE trả mảng trực tiếp, không phân trang (quy ước api.md 30/10)
import { useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiBuildings, BiChevronRight, BiPlus } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import ItemCard from '../../components/ItemCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import { USER_STATUS } from '../../constants/enums';
import { USER_STATUS_LABEL } from '../../constants/statusLabels';
import { formatFilterQuery } from '../../utils/filter';
import managerApi from './manager.api';
import ManagerCreateModal from './components/ManagerCreateModal';
import ManagerAvatar from './components/ManagerAvatar';

// thứ tự cột khi nhóm theo trạng thái (theo mockup)
const STATUS_ORDER = [USER_STATUS.ACTIVE, USER_STATUS.PENDING, USER_STATUS.LOCKED];

const FILTER_GROUPS = [
  {
    id: 'status',
    label: 'Trạng thái',
    type: 'checkbox',
    options: STATUS_ORDER.map((status) => ({
      value: status,
      label: USER_STATUS_LABEL[status].label,
    })),
  },
  {
    id: 'assigned',
    label: 'Phân công',
    type: 'checkbox',
    options: [
      { value: 'true', label: 'Đã phân công tòa' },
      { value: 'false', label: 'Chưa phân công tòa' },
    ],
  },
];

const GROUP_BY_OPTIONS = [{ value: 'status', label: 'Trạng thái' }];

// tòa phụ trách dạng nhãn nhỏ ở chân thẻ
const BuildingBadge = ({ building }) =>
  building ? (
    <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis flex items-center gap-1">
      <BiBuildings />
      {building.name}
    </span>
  ) : (
    <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">
      Chưa phân công
    </span>
  );

// thẻ một Manager: avatar + tên + email, chân thẻ là SĐT + tòa; không nhóm theo trạng thái thì hiện thêm badge trạng thái
const ManagerCard = ({ manager, showStatus }) => (
  <ItemCard
    to={`/managers/${manager._id}`}
    // ItemCard là link: index.css gạch chân mọi link khi rê chuột → tắt riêng cho thẻ (viền tím đã báo bấm được)
    className="no-underline"
    footer={
      <>
        <span>{manager.phone}</span>
        <BuildingBadge building={manager.building} />
      </>
    }
  >
    <div className="flex items-center gap-2 min-w-0">
      <ManagerAvatar name={manager.name} />
      <div className="min-w-0 flex-1">
        <div className="fw-semibold text-truncate">{manager.name}</div>
        <div className="small text-secondary text-truncate">{manager.email}</div>
      </div>
      {showStatus && <StatusBadge map={USER_STATUS_LABEL} value={manager.status} />}
    </div>
  </ItemCard>
);

const ManagerListPage = () => {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true); // lần tải đầu (và Thử lại): hiện khung xương
  // tìm / lọc lại: giữ nguyên danh sách cũ, chỉ làm mờ cho tới khi có kết quả mới (không nháy khung xương)
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ status: [], assigned: [] });
  const [groupBy, setGroupBy] = useState('status'); // mặc định nhóm theo trạng thái như mockup
  const [view, setView] = useState('cards');
  const [reloadKey, setReloadKey] = useState(0); // tăng lên để tải lại (Thử lại, sau khi thêm)
  const [creating, setCreating] = useState(false);

  // khóa chuỗi để effect chỉ chạy khi bộ lọc thật sự đổi
  const statusKey = filters.status.join(',');
  // chọn cả 2 "Đã / Chưa phân công" = không lọc theo phân công
  const assigned = filters.assigned.length === 1 ? filters.assigned[0] : '';

  // ô tìm đã tự đợi 300ms trong ControlBar nên ở đây gọi ngay khi bộ lọc đổi
  // ignore: bỏ kết quả của lần gọi cũ nếu bộ lọc đã đổi tiếp (tránh hiện sai kết quả khi gõ nhanh)
  useEffect(() => {
    let ignore = false;
    managerApi
      .list(formatFilterQuery({ q: query.trim(), status: statusKey, assigned }))
      .then((response) => {
        if (ignore) return;
        setManagers(Array.isArray(response.data) ? response.data : []);
        setLoadError('');
      })
      .catch((error) => !ignore && setLoadError(error.message))
      .finally(() => {
        if (ignore) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      ignore = true;
    };
  }, [query, statusKey, assigned, reloadKey]);

  // đổi bộ lọc / từ khóa: làm mờ danh sách đang có để người dùng biết đang lọc
  const handleSearchChange = (value) => {
    setQuery(value);
    setRefreshing(true);
  };

  const handleFilterChange = (next) => {
    setFilters({ status: next.status ?? [], assigned: next.assigned ?? [] });
    setRefreshing(true);
  };

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const isFiltering = Boolean(query.trim() || filters.status.length || filters.assigned.length);
  const emptyMessage = isFiltering ? 'Không tìm thấy Manager phù hợp' : 'Chưa có Manager nào';

  const columns = [
    {
      key: 'name',
      title: 'Manager',
      className: 'ps-4',
      render: (row) => (
        <div className="flex items-center gap-2 py-2">
          <ManagerAvatar name={row.name} />
          <span className="fw-semibold">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      title: 'Liên hệ',
      render: (row) => (
        <>
          <div>{row.email}</div>
          <div className="small text-secondary">{row.phone}</div>
        </>
      ),
    },
    {
      key: 'building',
      title: 'Tòa phụ trách',
      render: (row) =>
        row.building ? (
          <span className="flex items-center gap-1">
            <BiBuildings className="text-secondary" />
            {row.building.name}
          </span>
        ) : (
          <span className="text-secondary">Chưa phân công</span>
        ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={USER_STATUS_LABEL} value={row.status} />,
    },
    {
      key: 'open',
      title: '',
      align: 'end',
      className: 'pe-4',
      render: () => <BiChevronRight className="text-secondary" aria-hidden />,
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <Card.Body>
            <SkeletonRows rows={5} columns={3} media />
          </Card.Body>
        </Card>
      );
    }
    if (loadError) {
      return (
        <ErrorState
          message="Không tải được danh sách Manager"
          detail={loadError}
          onRetry={reload}
        />
      );
    }
    if (managers.length === 0) {
      return (
        <Card>
          <Card.Body>
            <EmptyState message={emptyMessage} />
          </Card.Body>
        </Card>
      );
    }

    if (view === 'table') {
      return (
        <DataTable
          columns={columns}
          data={managers}
          emptyMessage={emptyMessage}
          onRowClick={(row) => navigate(`/managers/${row._id}`)}
        />
      );
    }

    // dạng thẻ, nhóm theo trạng thái: 3 cột kiểu Kanban, cuộn ngang khi màn hình hẹp
    if (groupBy === 'status') {
      return (
        <div className="overflow-x-auto">
          <div className="flex items-start gap-3 min-w-min">
            {STATUS_ORDER.map((status) => {
              const items = managers.filter((manager) => manager.status === status);
              return (
                <section key={status} className="flex-1 min-w-72 max-w-md flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <StatusBadge map={USER_STATUS_LABEL} value={status} />
                    <span className="small text-secondary">{items.length}</span>
                  </div>
                  {items.map((manager) => (
                    <ManagerCard key={manager._id} manager={manager} />
                  ))}
                  {items.length === 0 && (
                    <div className="rounded border border-dashed bg-body-tertiary text-secondary small text-center p-3">
                      Không có Manager
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      );
    }

    // dạng thẻ, không nhóm: lưới thẻ, mỗi thẻ có badge trạng thái
    return (
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {managers.map((manager) => (
          <ManagerCard key={manager._id} manager={manager} showStatus />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* không dùng overflow-hidden: bảng Bộ lọc / Nhóm theo xổ ra ngoài thẻ sẽ bị cắt */}
      <Card className="mb-3">
        <ControlBar
          actions={
            <Button
              variant="primary"
              className="flex items-center gap-1"
              onClick={() => setCreating(true)}
            >
              <BiPlus />
              Thêm Manager
            </Button>
          }
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Tìm theo họ tên, email, số điện thoại..."
          filterGroups={FILTER_GROUPS}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          groupByOptions={GROUP_BY_OPTIONS}
          selectedGroupBy={groupBy}
          onGroupByChange={setGroupBy}
          count={loading || loadError ? null : `${managers.length} Manager`}
          view={view}
          onViewChange={setView}
        />
      </Card>

      <div
        className={`transition-opacity ${refreshing ? 'opacity-50' : ''}`}
        aria-busy={refreshing}
      >
        {renderContent()}
      </div>

      {creating && (
        <ManagerCreateModal
          onHide={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
    </>
  );
};

export default ManagerListPage;
