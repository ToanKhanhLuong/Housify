// UC-07, 47: trang tổng quan /dashboard cho cả Admin và Manager theo bố cục 2 cột (Home Desk + Nova Residence)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import MoneyText from '../../components/MoneyText';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import dashboardApi from './dashboard.api';
import BuildingSidePanel from './components/BuildingSidePanel';
import HorizontalFlowDiagram from './components/HorizontalFlowDiagram';
import RecentActivitiesSection from './components/RecentActivitiesSection';

const getSixMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  };
};

const shortBuildingName = (name = '') => name.replace(/^Tòa\s+/i, '').trim() || name;

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [chartMode, setChartMode] = useState('scale');

  useEffect(() => {
    if (!isAdmin) return;
    dashboardApi
      .buildings()
      .then((response) => {
        const raw = response.data;
        setBuildings(Array.isArray(raw) ? raw : (raw?.items ?? []));
      })
      .catch(() => setBuildings([]));
  }, [isAdmin]);

  const loadData = useCallback(() => {
    const query = isAdmin && buildingId ? { buildingId } : {};
    const mainRequest = isAdmin ? dashboardApi.admin(query) : dashboardApi.manager();
    const { from, to } = getSixMonthRange();

    dashboardApi
      .report({ ...query, from, to })
      .then((response) => setReportData(response.data))
      .catch(() => setReportData(null));

    return mainRequest
      .then((response) => setState({ status: 'ok', data: response.data, error: '' }))
      .catch((error) =>
        setState((prev) => ({
          status: error.status === 403 && !isAdmin ? 'noBuilding' : 'error',
          data: prev.data,
          error: error.message,
        })),
      );
  }, [isAdmin, buildingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { status, data, error } = state;

  const selectedBuilding = useMemo(
    () => buildings.find((item) => item._id === buildingId) ?? null,
    [buildings, buildingId],
  );

  // Dữ liệu cho đường sóng mượt AreaChart
  const chartData = useMemo(() => {
    if (!data) return [];

    if (chartMode === 'revenue') {
      const months = reportData?.revenueByMonth ?? [];
      return months.map((item) => ({
        name: item.month.slice(5) ? `T${item.month.slice(5)}` : item.month,
        primaryValue: item.revenue ?? 0,
        secondaryValue: 0,
      }));
    }

    if (isAdmin && !buildingId && buildings.length > 0) {
      return buildings.map((building) => {
        const bRooms = building.roomStats ?? { total: building.totalRooms ?? 0, occupied: 0 };
        return {
          name: shortBuildingName(building.name),
          primaryValue: bRooms.total ?? 0,
          secondaryValue: bRooms.occupied ?? 0,
        };
      });
    }

    const rooms = data.rooms ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
    return [
      { name: 'Tổng phòng', primaryValue: rooms.total, secondaryValue: rooms.occupied },
      { name: 'Phòng trống', primaryValue: rooms.available, secondaryValue: rooms.occupied },
      { name: 'Đang thuê', primaryValue: rooms.occupied, secondaryValue: data.activeContracts ?? rooms.occupied },
      { name: 'Hợp đồng', primaryValue: data.activeContracts ?? rooms.occupied, secondaryValue: data.residents ?? rooms.occupied },
      { name: 'Cư dân', primaryValue: data.residents ?? rooms.occupied, secondaryValue: data.movedIn ?? 0 },
    ];
  }, [data, chartMode, reportData, isAdmin, buildingId, buildings]);

  if (status === 'noBuilding') {
    return <EmptyState message={error || 'Bạn chưa được cấp quyền quản lý tòa nhà'} />;
  }
  if (status === 'loading' && !data) {
    return (
      <Card>
        <Card.Body>
          <SkeletonRows rows={5} columns={4} />
        </Card.Body>
      </Card>
    );
  }
  if (status === 'error' && !data) {
    return <ErrorState message="Không tải được số liệu tổng quan" detail={error} onRetry={loadData} />;
  }

  const rooms = data.rooms ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const overdueInvoicesCount = isAdmin
    ? (reportData?.latePayments?.length ?? 0)
    : (data.pendingInvoices?.overdueCount ?? 0);

  const scopeLabel = selectedBuilding
    ? selectedBuilding.name
    : isAdmin
      ? `Toàn hệ thống (${buildings.length || data.buildings} tòa nhà)`
      : data.buildingOverview?.name || 'Tòa nhà đang phụ trách';

  return (
    <div className="flex flex-col gap-4">
      {/* Thanh lọc phạm vi gọn nhẹ trên cùng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="small text-secondary text-uppercase fw-semibold">
            {isAdmin ? 'Bảng điều khiển quản lý tổng' : 'Bảng điều khiển tòa nhà'}
          </span>
          <h2 className="h5 fw-bold mb-0 mt-0.5">{scopeLabel}</h2>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Form.Select
              id="dashboard-building"
              aria-label="Chọn tòa nhà"
              className="w-auto min-w-60"
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
            >
              <option value="">Toàn hệ thống ({buildings.length} tòa)</option>
              {buildings.map((building) => (
                <option key={building._id} value={building._id}>
                  {building.name}
                  {building.manager?.name ? ` — QL: ${building.manager.name}` : ''}
                </option>
              ))}
            </Form.Select>
            {buildingId && (
              <Button variant="secondary" onClick={() => setBuildingId('')}>
                Toàn hệ thống
              </Button>
            )}
          </div>
        )}
      </div>

      {status === 'error' && (
        <Alert variant="warning" className="mb-0 small">
          Dữ liệu có thể chưa cập nhật: {error}
        </Alert>
      )}

      {/* Bố cục 2 cột giống Home Desk (Ảnh 2) + Nova Residence (Ảnh 1) */}
      <div className="grid lg:grid-cols-12 gap-4 items-start">
        {/* CỘT TRÁI (8 cột): Dải số liệu chung + Sơ đồ sóng/mũi tên + Hoạt động gần đây + Thẻ ảnh phòng */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Dải 4 con số lớn nằm chung trong 1 thẻ trắng giống hệt mục Payments ở Ảnh 2 */}
          <Card>
            <Card.Body className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="fw-semibold text-body">Chỉ số tổng hợp</span>
                <span className="hf-badge hf-b-gray">Tháng này</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="fs-4 fw-bold tabular-nums text-body">
                    <MoneyText value={data.monthlyRevenue} />
                  </div>
                  <div className="small text-secondary mt-0.5">Doanh thu tháng</div>
                </div>

                {isAdmin ? (
                  <>
                    <div>
                      <div className="fs-4 fw-bold tabular-nums text-body">
                        {data.activeContracts}
                      </div>
                      <div className="small text-secondary mt-0.5">Hợp đồng hiệu lực</div>
                    </div>
                    <div>
                      <div className="fs-4 fw-bold tabular-nums text-body">{data.residents}</div>
                      <div className="small text-secondary mt-0.5">
                        Cư dân (+{data.movedIn} vào)
                      </div>
                    </div>
                    <div>
                      <div className="fs-4 fw-bold tabular-nums text-body">
                        {overdueInvoicesCount} / {data.openIncidents}
                      </div>
                      <div className="small text-secondary mt-0.5">Quá hạn / Sự cố mở</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="fs-4 fw-bold tabular-nums text-body">
                        <MoneyText value={data.pendingInvoices?.totalAmount ?? 0} />
                      </div>
                      <div className="small text-secondary mt-0.5">
                        Chờ thu ({data.pendingInvoices?.count ?? 0} HĐ)
                      </div>
                    </div>
                    <div>
                      <div className="fs-4 fw-bold tabular-nums text-body">
                        {data.expiringContracts}
                      </div>
                      <div className="small text-secondary mt-0.5">Sắp hết hạn (30 ngày)</div>
                    </div>
                    <div>
                      <div className="fs-4 fw-bold tabular-nums text-body">
                        {overdueInvoicesCount} / {data.openIncidents}
                      </div>
                      <div className="small text-secondary mt-0.5">Quá hạn / Sự cố mở</div>
                    </div>
                  </>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Khối biểu đồ sóng mượt + Sơ đồ ngang có mũi tên giống Apartment 52 ở Ảnh 1 */}
          <HorizontalFlowDiagram
            isAdmin={isAdmin}
            data={data}
            reportData={reportData}
            chartData={chartData}
            chartMode={chartMode}
            onChartModeChange={setChartMode}
            scopeLabel={
              chartMode === 'revenue'
                ? 'Biến động doanh thu 6 tháng'
                : `Chu trình khai thác — ${scopeLabel} (${rooms.occupied}/${rooms.total} phòng)`
            }
          />

          {/* Khối Hoạt động gần đây (Audit log / Ký HĐ / Quá hạn) + Thẻ ảnh Phòng theo tầng */}
          <RecentActivitiesSection data={data} reportData={reportData} />
        </div>

        {/* CỘT PHẢI (4 cột): Ảnh lớn Tòa nhà + 4 chỉ số ngang + Thanh lấp đầy + Donut + Danh bạ Tòa/Manager */}
        <div className="lg:col-span-4">
          <BuildingSidePanel
            isAdmin={isAdmin}
            data={data}
            buildings={buildings}
            buildingId={buildingId}
            onSelectBuilding={setBuildingId}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
