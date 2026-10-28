// UC-09: danh sách Manager (Admin): lọc theo trạng thái, tìm theo tên; bấm dòng mở chi tiết. UC-08: nút "Thêm Manager"
import { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Input from '../../components/Input';
import Select from '../../components/Select';
import { USER_STATUS } from '../../constants/enums';
import { USER_STATUS_LABEL } from '../../constants/statusLabels';
import managerApi from './manager.api';
import ManagerCreateModal from './components/ManagerCreateModal';

// Manager chỉ có 3 trạng thái (INACTIVE là của Customer)
const STATUS_OPTIONS = [USER_STATUS.PENDING, USER_STATUS.ACTIVE, USER_STATUS.LOCKED].map(
  (status) => ({ value: status, label: USER_STATUS_LABEL[status].label }),
);

const ManagerListPage = () => {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [creating, setCreating] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadManagers = useCallback(
    (params) =>
      managerApi
        .list(params)
        // api.md chưa ghi có phân trang không: đọc được cả mảng thẳng lẫn { items, total… }
        .then((response) => setManagers(response.data?.items ?? response.data ?? []))
        .catch((error) => toast.error(error.message))
        .finally(() => setLoading(false)),
    [],
  );

  // gõ tìm kiếm thì đợi 300ms mới gọi API, tránh gọi theo từng chữ
  useEffect(() => {
    const timer = setTimeout(
      () => loadManagers({ status: filters.status || undefined, q: filters.q.trim() || undefined }),
      300,
    );
    return () => clearTimeout(timer);
  }, [filters, loadManagers]);

  const handleFilterChange = (event) =>
    setFilters({ ...filters, [event.target.name]: event.target.value });

  const isFiltering = Boolean(filters.status || filters.q.trim());

  const columns = [
    { key: 'name', title: 'Họ tên', className: 'fw-semibold' },
    { key: 'email', title: 'Email' },
    { key: 'phone', title: 'Số điện thoại' },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge map={USER_STATUS_LABEL} value={row.status} />,
    },
    {
      key: 'building',
      title: 'Tòa phụ trách',
      render: (row) => row.building?.name ?? <span className="text-secondary">Chưa phân công</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Quản lý Manager"
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            Thêm Manager
          </Button>
        }
      >
        <Select
          name="status"
          options={STATUS_OPTIONS}
          placeholder="Tất cả trạng thái"
          value={filters.status}
          onChange={handleFilterChange}
          className="mb-0"
          aria-label="Lọc theo trạng thái"
        />
        <Input
          name="q"
          placeholder="Tìm theo tên"
          value={filters.q}
          onChange={handleFilterChange}
          className="mb-0"
          aria-label="Tìm theo tên"
        />
      </PageHeader>

      <DataTable
        columns={columns}
        data={managers}
        loading={loading}
        emptyMessage={isFiltering ? 'Không tìm thấy Manager phù hợp' : 'Chưa có Manager nào'}
        onRowClick={(row) => navigate(`/managers/${row._id}`)}
      />

      {/* render có điều kiện: mỗi lần mở là một form mới */}
      {creating && (
        <ManagerCreateModal
          onHide={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            loadManagers({ status: filters.status || undefined, q: filters.q.trim() || undefined });
          }}
        />
      )}
    </>
  );
};

export default ManagerListPage;
