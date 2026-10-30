// UC-09: danh sách Manager (Admin): lọc theo trạng thái, tình trạng phân công, tìm kiếm; bấm dòng mở chi tiết
// UC-08: nút "Thêm Manager". Danh sách không phân trang, BE trả data là mảng trực tiếp
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiBuildings, BiChevronRight, BiPlus } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { USER_STATUS } from '../../constants/enums';
import { USER_STATUS_LABEL } from '../../constants/statusLabels';
import managerApi from './manager.api';
import ManagerCreateModal from './components/ManagerCreateModal';
import FilterSelect from './components/FilterSelect';
import ManagerAvatar from './components/ManagerAvatar';
import SearchInput from './components/SearchInput';

// Manager chỉ có 3 trạng thái (INACTIVE là của Customer)
const STATUS_OPTIONS = [USER_STATUS.PENDING, USER_STATUS.ACTIVE, USER_STATUS.LOCKED].map(
  (status) => ({ value: status, label: USER_STATUS_LABEL[status].label }),
);

const ASSIGNED_OPTIONS = [
  { value: 'true', label: 'Đã phân công' },
  { value: 'false', label: 'Chưa phân công' },
];

const ManagerListPage = () => {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', q: '', assigned: '' });
  const [creating, setCreating] = useState(false);

  const loadManagers = useCallback(() => {
    managerApi
      .list({
        status: filters.status || undefined,
        q: filters.q.trim() || undefined,
        assigned: filters.assigned || undefined,
      })
      .then((response) => {
        setManagers(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [filters]);

  // gõ tìm kiếm thì đợi 300ms mới gọi API, tránh gọi theo từng chữ
  useEffect(() => {
    const timer = setTimeout(loadManagers, 300);
    return () => clearTimeout(timer);
  }, [loadManagers]);

  const handleFilterChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const isFiltering = Boolean(filters.status || filters.q.trim() || filters.assigned);

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

  return (
    <>
      <PageHeader
        title="Quản lý Manager"
        subtitle="Quản lý danh sách nhân viên vận hành và phân công tòa nhà"
      >
        <Button
          variant="primary"
          className="flex items-center gap-1"
          onClick={() => setCreating(true)}
        >
          <BiPlus />
          Thêm Manager
        </Button>
      </PageHeader>

      <Card className="[&_.card]:border-0 [&_.card]:rounded-none">
        <Card.Header className="bg-transparent flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="h6 fw-semibold mb-0">Tất cả Manager</h2>
            <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
              {managers.length}
            </span>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <FilterSelect
              name="status"
              options={STATUS_OPTIONS}
              placeholder="Tất cả trạng thái"
              value={filters.status}
              onChange={handleFilterChange}
            />
            <FilterSelect
              name="assigned"
              options={ASSIGNED_OPTIONS}
              placeholder="Tất cả phân công"
              value={filters.assigned}
              onChange={handleFilterChange}
            />
            <SearchInput
              name="q"
              placeholder="Tìm theo tên, email, SĐT..."
              value={filters.q}
              onChange={handleFilterChange}
            />
          </div>
        </Card.Header>

        <DataTable
          columns={columns}
          data={managers}
          loading={loading}
          emptyMessage={isFiltering ? 'Không tìm thấy Manager phù hợp' : 'Chưa có Manager nào'}
          onRowClick={(row) => navigate(`/managers/${row._id}`)}
        />

        {!loading && managers.length > 0 && (
          <Card.Footer className="bg-transparent flex flex-wrap justify-between gap-2 px-4 small text-secondary">
            <span>Hiển thị {managers.length} Manager</span>
            <span>Chọn một Manager để xem chi tiết</span>
          </Card.Footer>
        )}
      </Card>

      {creating && (
        <ManagerCreateModal
          onHide={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            loadManagers();
          }}
        />
      )}
    </>
  );
};

export default ManagerListPage;
