// UC-07, 47: trang tổng quan /dashboard cho cả Admin và Manager theo bố cục 2 cột (Hiệu suất linh hoạt + Hồ sơ tòa nhà)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
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

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [reportData, setReportData] = useState(null);

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

  // Chỉ hiển thị Không gian Phòng theo tầng khi đã chọn 1 tòa nhà cụ thể (hoặc là tài khoản Manager)
  const showRoomsSection = !isAdmin || Boolean(buildingId);

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

  const overdueInvoicesCount = isAdmin
    ? (reportData?.latePayments?.length ?? 0)
    : (data.pendingInvoices?.overdueCount ?? 0);

  const totalBuildings = buildings.length || data.buildings || 0;
  const scopeLabel = selectedBuilding
    ? selectedBuilding.name
    : isAdmin
      ? `Chuỗi nhà trọ Housify · ${totalBuildings} cơ sở`
      : data.buildingOverview?.name || 'Cơ sở đang phụ trách';

  return (
    <div className="flex flex-col gap-4">
      {/* Tiêu đề phạm vi đang xem (chọn tòa trực tiếp ở Danh bạ Tòa nhà & Manager bên phải) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="small text-secondary text-uppercase fw-semibold">
            {isAdmin ? 'Tổng quan vận hành' : 'Tổng quan cơ sở'}
          </span>
          <h2 className="h5 fw-bold mb-0 mt-1">{scopeLabel}</h2>
        </div>

        {isAdmin && buildingId && (
          <Button variant="secondary" size="sm" onClick={() => setBuildingId('')}>
            Xem tất cả cơ sở
          </Button>
        )}
      </div>

      {status === 'error' && (
        <Alert variant="warning" className="mb-0 small">
          Dữ liệu có thể chưa cập nhật: {error}
        </Alert>
      )}

      {/* Bố cục 2 cột: Trái 8 cột (Hiệu suất theo kỳ + Hoạt động + Phòng theo tầng) | Phải 4 cột (Tổng quan & Danh bạ Tòa) */}
      <div className="grid lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <HorizontalFlowDiagram
            isAdmin={isAdmin}
            data={data}
            overdueInvoicesCount={overdueInvoicesCount}
          />

          <RecentActivitiesSection
            data={data}
            reportData={reportData}
            showRooms={showRoomsSection}
          />
        </div>

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
