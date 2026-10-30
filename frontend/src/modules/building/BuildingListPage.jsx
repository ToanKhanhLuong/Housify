// UC-13: danh sách tòa nhà đang hoạt động (Admin). Tab theo việc phân công Manager có số đếm, ô tìm tên / địa chỉ
// Bấm dòng mở chi tiết; "Thêm tòa nhà" mở form UC-12
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, InputGroup, ListGroup, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BiReset, BiSearch } from 'react-icons/bi';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import buildingApi from './building.api';
import BuildingFormModal from './components/BuildingFormModal';

// tab theo việc phân công: Admin cần thấy ngay tòa nào chưa có người phụ trách (UC-11)
const TABS = [
  { key: 'all', label: 'Tất cả', match: () => true },
  { key: 'assigned', label: 'Có Manager', match: (building) => Boolean(building.manager) },
  { key: 'unassigned', label: 'Chưa có Manager', match: (building) => !building.manager },
];

const BuildingListPage = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState(null); // null: đang tải
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadBuildings = useCallback(
    () =>
      buildingApi
        .list()
        .then((response) => {
          setBuildings(response.data?.items ?? response.data ?? []);
          setLoadError('');
        })
        .catch((error) => {
          setBuildings([]);
          setLoadError(error.message);
        }),
    [],
  );

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  const handleRetry = () => {
    setBuildings(null);
    loadBuildings();
  };

  // tìm theo tên hoặc địa chỉ → đếm theo tab → lọc theo tab đang chọn
  const search = keyword.trim().toLowerCase();
  const inScope = (buildings ?? []).filter(
    (building) =>
      !search ||
      building.name.toLowerCase().includes(search) ||
      building.address.toLowerCase().includes(search),
  );
  const counts = Object.fromEntries(
    TABS.map((item) => [item.key, inScope.filter(item.match).length]),
  );
  const shown = inScope.filter(TABS.find((item) => item.key === tab).match);
  const isFiltered = Boolean(search) || tab !== 'all';
  const loading = buildings === null;

  const handleReset = () => {
    setKeyword('');
    setTab('all');
  };

  const managerOf = (building) =>
    building.manager?.name ?? <span className="text-secondary">Chưa có Manager</span>;

  const columns = [
    {
      key: 'name',
      title: 'Tòa nhà',
      render: (row) => (
        <div className="min-w-0">
          <div className="fw-semibold">{row.name}</div>
          <div className="text-secondary truncate">{row.address}</div>
        </div>
      ),
    },
    { key: 'floorCount', title: 'Số tầng', align: 'end' },
    { key: 'roomCount', title: 'Số phòng', align: 'end', render: (row) => row.roomCount ?? 0 },
    { key: 'manager', title: 'Manager phụ trách', render: managerOf },
  ];

  // trống: chưa có tòa nào thì gợi ý tạo; có tòa mà lọc không ra thì gợi ý xóa lọc
  const renderEmpty = () =>
    buildings.length === 0 ? (
      <EmptyState message="Chưa có tòa nhà nào. Bấm Thêm tòa nhà để bắt đầu.">
        <Button variant="secondary" onClick={() => setShowForm(true)}>
          Thêm tòa nhà
        </Button>
      </EmptyState>
    ) : (
      <EmptyState message="Không có tòa nhà nào khớp với bộ lọc.">
        <Button variant="secondary" onClick={handleReset}>
          Xóa bộ lọc
        </Button>
      </EmptyState>
    );

  const renderBody = () => {
    if (loading)
      return (
        <Card>
          <SkeletonRows rows={4} columns={4} />
        </Card>
      );
    if (loadError) {
      return (
        <Card>
          <ErrorState
            message="Không tải được danh sách tòa nhà."
            detail={loadError}
            onRetry={handleRetry}
          />
        </Card>
      );
    }
    if (shown.length === 0) return <Card>{renderEmpty()}</Card>;
    return (
      <>
        {/* máy tính, tablet: bảng */}
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            data={shown}
            onRowClick={(row) => navigate(`/buildings/${row._id}`)}
          />
        </div>
        {/* điện thoại: mỗi tòa một thẻ 2 dòng */}
        <Card className="md:hidden">
          <ListGroup variant="flush">
            {shown.map((building) => (
              <ListGroup.Item
                key={building._id}
                action
                onClick={() => navigate(`/buildings/${building._id}`)}
                className="py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="fw-semibold">{building.name}</span>
                  <span className="small text-secondary whitespace-nowrap tabular-nums">
                    {building.floorCount} tầng · {building.roomCount ?? 0} phòng
                  </span>
                </div>
                <div className="text-secondary truncate">{building.address}</div>
                <div className="small">{managerOf(building)}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Tòa nhà"
        subtitle={
          loading || loadError
            ? undefined
            : `${counts.all} tòa · ${counts.unassigned} tòa chưa có Manager`
        }
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Thêm tòa nhà
          </Button>
        }
      />

      {/* hàng trên: tab có số đếm; bên phải: số tòa + xóa bộ lọc khi đang lọc */}
      <div className="flex items-center gap-3 border-bottom mb-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <Nav variant="underline" className="flex-nowrap" activeKey={tab} onSelect={setTab}>
            {TABS.map((item) => (
              <Nav.Item key={item.key}>
                <Nav.Link
                  eventKey={item.key}
                  className={`flex items-center gap-2 whitespace-nowrap ${tab === item.key ? '' : 'text-secondary'}`}
                >
                  {item.label}
                  <span className="small text-secondary tabular-nums">
                    {loading ? '…' : counts[item.key]}
                  </span>
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
      </div>

      {/* hàng dưới: ô tìm; xóa bộ lọc chỉ hiện khi đang lọc */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <InputGroup className="w-full md:w-80">
          <InputGroup.Text className="text-secondary">
            <BiSearch size={16} aria-hidden="true" />
          </InputGroup.Text>
          <Form.Control
            name="keyword"
            type="search"
            placeholder="Tìm tên hoặc địa chỉ tòa"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Tìm tên hoặc địa chỉ tòa"
          />
        </InputGroup>
        <div className="flex items-center gap-2 ms-auto">
          {isFiltered && (
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-1 whitespace-nowrap"
              onClick={handleReset}
            >
              <BiReset size={16} />
              Xóa bộ lọc
            </Button>
          )}
          {!loading && !loadError && (
            <span className="text-secondary whitespace-nowrap tabular-nums">
              {shown.length} tòa
            </span>
          )}
        </div>
      </div>

      {renderBody()}

      {/* UC-12 bước 4: tạo xong chuyển sang trang chi tiết tòa */}
      {showForm && (
        <BuildingFormModal
          building={{}}
          onHide={() => setShowForm(false)}
          onSaved={(building) => navigate(`/buildings/${building._id}`)}
        />
      )}
    </>
  );
};

export default BuildingListPage;
