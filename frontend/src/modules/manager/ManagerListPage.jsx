// UC-09: danh sách Manager (Admin): lọc theo trạng thái, tìm theo tên; bấm dòng mở chi tiết. UC-08: nút "Thêm Manager"
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiBuildings, BiChevronRight, BiPlus } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pager from '../../components/Pager';
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

// BE mặc định 10 dòng / trang (tối đa 50)
const LIMIT = 10;

const ManagerListPage = () => {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [creating, setCreating] = useState(false);

  // GET /managers trả { items, total, page, limit }
  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadManagers = useCallback(
    () =>
      managerApi
        .list({
          status: filters.status || undefined,
          q: filters.q.trim() || undefined,
          page,
          limit: LIMIT,
        })
        .then((response) => {
          setManagers(response.data.items);
          setTotal(response.data.total);
        })
        .catch((error) => toast.error(error.message))
        .finally(() => setLoading(false)),
    [filters, page],
  );

  // gõ tìm kiếm thì đợi 300ms mới gọi API, tránh gọi theo từng chữ
  useEffect(() => {
    const timer = setTimeout(loadManagers, 300);
    return () => clearTimeout(timer);
  }, [loadManagers]);

  // đổi bộ lọc / từ khóa thì quay về trang 1
  const handleFilterChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
    setPage(1);
  };

  const isFiltering = Boolean(filters.status || filters.q.trim());

  // bố cục cột theo thiết kế Figma: avatar + tên, email/SĐT gộp 1 cột, mũi tên cuối dòng báo bấm được
  const columns = [
    {
      key: 'name',
      title: 'Manager',
      className: 'ps-4', // lề trái ~20px như Figma (DataTable mặc định ps-3)
      // dòng cao ~64px, avatar ~36px như Figma: py-2 ở ô này đẩy cả dòng cao lên (các ô khác tự căn giữa),
      // không đặt py ở className của cột vì sẽ dính cả hàng tiêu đề
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
      {/* nút "Thêm Manager" đặt bên phải theo thiết kế Figma (lệch luật nút bên trái, nhóm đã cân nhắc) */}
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

      {/* một khung chung: thanh lọc ở đầu, bảng ở giữa, dòng tổng ở chân (theo Figma).
          DataTable chung tự bọc Card riêng nên bỏ viền + bo góc của Card con để không thành 2 lớp viền */}
      <Card className="[&_.card]:border-0 [&_.card]:rounded-none">
        <Card.Header className="bg-transparent flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="h6 fw-semibold mb-0">Tất cả Manager</h2>
            <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
              {total}
            </span>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-3">
            <FilterSelect
              name="status"
              options={STATUS_OPTIONS}
              placeholder="Tất cả trạng thái"
              value={filters.status}
              onChange={handleFilterChange}
            />
            <SearchInput
              name="q"
              placeholder="Tìm theo tên Manager..."
              value={filters.q}
              onChange={handleFilterChange}
            />
            <Pager page={page} limit={LIMIT} total={total} onChange={setPage} />
          </div>
        </Card.Header>

        <DataTable
          columns={columns}
          data={managers}
          loading={loading}
          emptyMessage={isFiltering ? 'Không tìm thấy Manager phù hợp' : 'Chưa có Manager nào'}
          onRowClick={(row) => navigate(`/managers/${row._id}`)}
        />

        {!loading && total > 0 && (
          <Card.Footer className="bg-transparent flex flex-wrap justify-between gap-2 px-4 small text-secondary">
            <span>
              Hiển thị {managers.length} trên tổng số {total} Manager
            </span>
            <span>Chọn một Manager để xem chi tiết</span>
          </Card.Footer>
        )}
      </Card>

      {/* render có điều kiện: mỗi lần mở là một form mới */}
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
