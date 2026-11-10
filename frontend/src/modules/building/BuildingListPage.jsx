// UC-13: danh sách tòa nhà (Admin) theo mockup docs/mock/Main.dc.html và chốt 30/10. UC-12: nút "Thêm tòa nhà"
// Thanh ControlBar: tìm theo tên / địa chỉ, bộ lọc Manager phụ trách, đổi Thẻ / Bảng (mặc định thẻ)
// Thẻ: ảnh đại diện = ảnh đầu tiên, số tầng, số phòng theo trạng thái, Manager. BE trả mảng, không phân trang
import { useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiBuildings, BiChevronRight, BiMap, BiPlus, BiReset } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import ControlBar from '../../components/ControlBar';
import DataTable from '../../components/DataTable';
import ItemCard from '../../components/ItemCard';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import { ROOM_STATUS } from '../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../constants/statusLabels';
import { formatFilterQuery, useSavedState } from '../../utils/filter';
import buildingApi from './building.api';
import BuildingFormModal from './components/BuildingFormModal';

const FILTER_GROUPS = [
  {
    id: 'hasManager',
    label: 'Manager phụ trách',
    type: 'checkbox',
    options: [
      { value: 'true', label: 'Đã có Manager' },
      { value: 'false', label: 'Chưa có Manager' },
    ],
  },
];

// số phòng theo trạng thái: chấm màu theo nhãn trạng thái phòng (Trống / Đang thuê / Bảo trì)
const STAT_ITEMS = [
  { key: 'available', status: ROOM_STATUS.AVAILABLE },
  { key: 'occupied', status: ROOM_STATUS.OCCUPIED },
  { key: 'maintenance', status: ROOM_STATUS.MAINTENANCE },
];

const RoomStats = ({ stats = {} }) => (
  <>
    {STAT_ITEMS.map((item) => (
      <span key={item.key} className="inline-flex items-center gap-1">
        <span
          className={`inline-block w-2 h-2 rounded-circle bg-${ROOM_STATUS_LABEL[item.status].variant}`}
        />
        {stats[item.key] ?? 0} {ROOM_STATUS_LABEL[item.status].label.toLowerCase()}
      </span>
    ))}
    <span className="text-secondary">· {stats.total ?? 0} phòng</span>
  </>
);

// chữ cái đầu của 2 tiếng cuối: "Trần Văn Quản" → "VQ" (giống avatar ở trang Quản lý Manager)
// tự viết trong module vì luật 7 không cho import ManagerAvatar từ module manager
const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?';

// Manager phụ trách: avatar tròn chữ cái đầu + tên, chưa có thì nhãn vàng
const ManagerLabel = ({ manager }) =>
  manager ? (
    <span className="flex items-center gap-2 text-body">
      <span className="flex items-center justify-center w-7 h-7 shrink-0 rounded-circle bg-primary-subtle text-primary-emphasis small fw-semibold">
        {initialsOf(manager.name)}
      </span>
      <span className="fw-medium text-body-emphasis">{manager.name}</span>
    </span>
  ) : (
    <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis fw-medium px-2.5 py-1">
      Chưa có Manager
    </span>
  );

const BuildingListPage = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true); // lần tải đầu (và Thử lại): khung xương
  const [refreshing, setRefreshing] = useState(false); // tìm / lọc lại: làm mờ danh sách cũ
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useSavedState('buildings:query', '');
  const [filters, setFilters] = useSavedState('buildings:filters', { hasManager: [] });
  const [view, setView] = useSavedState('buildings:view', 'cards');
  const [reloadKey, setReloadKey] = useState(0); // tăng lên để tải lại (Thử lại, sau khi thêm)
  const [showForm, setShowForm] = useState(false);

  // chọn cả "Đã có" và "Chưa có" Manager = không lọc
  const hasManager = filters.hasManager.length === 1 ? filters.hasManager[0] : '';

  // ô tìm đã tự đợi 300ms trong ControlBar nên ở đây gọi ngay
  // ignore: bỏ kết quả lần gọi cũ khi bộ lọc đã đổi tiếp (tránh hiện sai kết quả khi gõ nhanh)
  useEffect(() => {
    let ignore = false;
    buildingApi
      .list(formatFilterQuery({ q: query.trim(), hasManager }))
      .then((response) => {
        if (ignore) return;
        setBuildings(Array.isArray(response.data) ? response.data : []);
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
  }, [query, hasManager, reloadKey]);

  const handleSearchChange = (value) => {
    setQuery(value);
    setRefreshing(true);
  };

  const handleFilterChange = (next) => {
    setFilters({ hasManager: next.hasManager ?? [] });
    setRefreshing(true);
  };

  const handleResetFilters = () => {
    setQuery('');
    setFilters({ hasManager: [] });
    setRefreshing(true);
  };

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const isFiltering = Boolean(query.trim() || filters.hasManager.length);

  const columns = [
    {
      key: 'name',
      title: 'Tòa nhà',
      render: (row) => {
        const image = row.images?.[0];
        return (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-2 overflow-hidden border bg-body-secondary flex items-center justify-center">
              {image ? (
                <img src={image} alt={row.name} className="w-full h-full object-cover" />
              ) : (
                <BiBuildings className="text-secondary" size={22} />
              )}
            </div>
            <div className="flex flex-col">
              <span className="fw-semibold text-body-emphasis group-hover:text-primary transition-colors">
                {row.name}
              </span>
              <span className="small text-secondary">{row.floorCount} tầng</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'address',
      title: 'Địa chỉ',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-secondary">
          <BiMap className="shrink-0 text-muted" size={15} />
          <span className="truncate max-w-xs md:max-w-sm" title={row.address}>
            {row.address}
          </span>
        </span>
      ),
    },
    {
      key: 'total',
      title: 'Số phòng',
      align: 'end',
      render: (row) => (
        <span className="tabular-nums fw-medium text-body">
          {row.roomStats?.total ?? 0}{' '}
          <span className="text-secondary small fw-normal">phòng</span>
        </span>
      ),
    },
    {
      key: 'available',
      title: 'Tình trạng phòng',
      render: (row) => {
        const stats = row.roomStats ?? {};
        const total = stats.total ?? 0;
        const available = stats.available ?? 0;
        const occupied = stats.occupied ?? 0;
        const maintenance = stats.maintenance ?? 0;

        return (
          <div className="flex flex-col gap-0.5">
            <div>
              <span
                className={`badge rounded-pill ${
                  available > 0
                    ? 'bg-success-subtle text-success-emphasis'
                    : 'bg-secondary-subtle text-secondary-emphasis'
                } px-2.5 py-1 fw-medium`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-circle ${
                    available > 0 ? 'bg-success' : 'bg-secondary'
                  } me-1.5 align-middle`}
                />
                {available > 0 ? `${available} phòng trống` : 'Hết phòng trống'}
              </span>
            </div>
            {total > 0 && (
              <span className="small text-secondary">
                {occupied} đang thuê · {maintenance} bảo trì
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'manager',
      title: 'Manager phụ trách',
      render: (row) => <ManagerLabel manager={row.manager} />,
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
            <SkeletonRows rows={4} columns={4} media />
          </Card.Body>
        </Card>
      );
    }
    if (loadError) {
      return (
        <ErrorState
          message="Không tải được danh sách tòa nhà"
          detail={loadError}
          onRetry={reload}
        />
      );
    }
    if (buildings.length === 0) {
      return (
        <Card>
          <Card.Body>
            {isFiltering ? (
              <EmptyState message="Không có tòa nhà nào phù hợp. Thử đổi từ khóa hoặc bỏ bớt bộ lọc.">
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
              <EmptyState message="Chưa có tòa nhà nào. Bấm Thêm tòa nhà để bắt đầu.">
                <Button variant="secondary" onClick={() => setShowForm(true)}>
                  Thêm tòa nhà
                </Button>
              </EmptyState>
            )}
          </Card.Body>
        </Card>
      );
    }

    if (view === 'table') {
      return (
        <DataTable
          columns={columns}
          data={buildings}
          onRowClick={(row) => navigate(`/buildings/${row._id}`)}
        />
      );
    }

    // dạng thẻ: ảnh đại diện = ảnh đầu tiên ('' → khung "Chưa có ảnh")
    return (
      // màn rộng 4 tòa một hàng; hẹp dần còn 3, 2, 1
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {buildings.map((building) => (
          <ItemCard
            key={building._id}
            to={`/buildings/${building._id}`}
            // no-underline: ItemCard là link, index.css gạch chân mọi link khi rê chuột → tắt riêng cho thẻ
            // khung ảnh (khối đầu của ItemCard) theo tỉ lệ 16:9 thay cho cao cố định ~112px: ảnh phủ kín khung,
            // không còn dải trắng hai bên, và vì khung cao hơn nên ảnh ít bị cắt
            className="no-underline [&>div:first-child]:h-auto [&>div:first-child]:aspect-video"
            image={building.images?.[0] ?? ''}
            title={building.name}
            badge={
              <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">
                {building.floorCount} tầng
              </span>
            }
            subtitle={building.address}
            stats={<RoomStats stats={building.roomStats} />}
            footer={<ManagerLabel manager={building.manager} />}
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
              onClick={() => setShowForm(true)}
            >
              <BiPlus />
              Thêm tòa nhà
            </Button>
          }
          searchValue={query}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Tìm theo tên hoặc địa chỉ..."
          filterGroups={FILTER_GROUPS}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          count={loading || loadError ? null : `${buildings.length} tòa nhà`}
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

      {showForm && (
        <BuildingFormModal
          onHide={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}
    </>
  );
};

export default BuildingListPage;
