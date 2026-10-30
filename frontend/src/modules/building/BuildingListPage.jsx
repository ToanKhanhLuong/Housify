// UC-13: danh sách tòa nhà đang hoạt động (Admin). Tab theo việc phân công Manager, ô tìm tên / địa chỉ
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

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'assigned', label: 'Có Manager' },
  { key: 'unassigned', label: 'Chưa có Manager' },
];

const BuildingListPage = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState(null); // null: đang tải
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadBuildings = useCallback(() => {
    const params = {};
    if (keyword.trim()) params.q = keyword.trim();
    if (tab === 'assigned') params.hasManager = 'true';
    if (tab === 'unassigned') params.hasManager = 'false';

    buildingApi
      .list(params)
      .then((response) => {
        setBuildings(Array.isArray(response.data) ? response.data : []);
        setLoadError('');
      })
      .catch((error) => {
        setBuildings([]);
        setLoadError(error.message);
      });
  }, [keyword, tab]);

  useEffect(() => {
    const timer = setTimeout(loadBuildings, 300);
    return () => clearTimeout(timer);
  }, [loadBuildings]);

  const handleRetry = () => {
    setBuildings(null);
    loadBuildings();
  };

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
    {
      key: 'roomStats',
      title: 'Số phòng',
      align: 'end',
      render: (row) => (
        <span>
          {row.roomStats?.total ?? 0} phòng{' '}
          <span className="small text-secondary">
            ({row.roomStats?.available ?? 0} trống)
          </span>
        </span>
      ),
    },
    { key: 'manager', title: 'Manager phụ trách', render: managerOf },
  ];

  const loading = buildings === null;
  const isFiltered = Boolean(keyword.trim()) || tab !== 'all';
  const shown = buildings ?? [];

  const renderEmpty = () =>
    !isFiltered ? (
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
                    {building.floorCount} tầng · {building.roomStats?.total ?? 0} phòng ({building.roomStats?.available ?? 0} trống)
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
            : `${shown.length} tòa nhà`
        }
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Thêm tòa nhà
          </Button>
        }
      />

      {/* hàng trên: tab lọc theo trạng thái phân công Manager */}
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
              onClick={handleReset}
              className="flex items-center gap-1"
            >
              <BiReset />
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </div>

      {renderBody()}

      {showForm && (
        <BuildingFormModal
          onHide={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadBuildings();
          }}
        />
      )}
    </>
  );
};

export default BuildingListPage;
