// UC-48: Trang Báo cáo phân tích chuyên sâu /reports cho cả Admin và Manager
// Kế thừa toàn bộ giao diện phân tích hiệu suất đa chiều (biểu đồ chuỗi thời gian, hồ sơ tòa nhà, hoạt động) và bảng đối soát công nợ
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import MoneyText from '../../components/MoneyText';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { useSavedState } from '../../utils/filter';
import { formatDate } from '../../utils/format';
import dashboardApi from './dashboard.api';
import BuildingSidePanel from './components/BuildingSidePanel';
import HorizontalFlowDiagram from './components/HorizontalFlowDiagram';
import RecentActivitiesSection from './components/RecentActivitiesSection';
import { monthLabel } from './reportPeriod';

const getSixMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  };
};

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useSavedState('reports:buildingId', '');
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


  const latePayments = useMemo(
    () => (Array.isArray(reportData?.latePayments) ? reportData.latePayments : []),
    [reportData],
  );

  const latePaymentColumns = [
    ...(isAdmin && !buildingId
      ? [{ key: 'buildingName', title: 'Tòa nhà', render: (row) => row.buildingName || '—' }]
      : []),
    { key: 'roomNumber', title: 'Phòng', className: 'fw-semibold' },
    { key: 'invoiceCode', title: 'Hóa đơn' },
    { key: 'month', title: 'Kỳ', render: (row) => monthLabel(row.month) },
    { key: 'dueDate', title: 'Hạn thanh toán', render: (row) => formatDate(row.dueDate) },
    {
      key: 'overdueDays',
      title: 'Quá hạn',
      render: (row) => <span className="hf-badge hf-b-red">{row.overdueDays} ngày</span>,
    },
    {
      key: 'amount',
      title: 'Số tiền còn nợ',
      align: 'end',
      render: (row) => <MoneyText value={row.amount} className="fw-semibold" />,
    },
  ];

  if (status === 'noBuilding') {
    return <EmptyState message={error || 'Bạn chưa được cấp quyền quản lý tòa nhà'} />;
  }
  if (status === 'loading' && !data) {
    return (
      <Card>
        <Card.Body>
          <SkeletonRows rows={6} columns={4} />
        </Card.Body>
      </Card>
    );
  }
  if (status === 'error' && !data) {
    return <ErrorState message="Không tải được dữ liệu báo cáo" detail={error} onRetry={loadData} />;
  }

  const overdueInvoicesCount = isAdmin
    ? (reportData?.latePayments?.length ?? 0)
    : (data?.pendingInvoices?.overdueCount ?? 0);

  const totalBuildings = buildings.length || data?.buildings || 0;
  const scopeLabel = selectedBuilding
    ? selectedBuilding.name
    : isAdmin
      ? `Chuỗi nhà trọ Housify · ${totalBuildings} cơ sở`
      : data?.buildingOverview?.name || 'Cơ sở đang phụ trách';

  return (
    <div className="flex flex-col gap-4">
      {/* Tiêu đề & phạm vi báo cáo phân tích */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="small text-secondary text-uppercase fw-semibold">
            {isAdmin ? 'Báo cáo phân tích toàn hệ thống' : 'Báo cáo chi tiết cơ sở'}
          </span>
          <h1 className="h5 fw-bold mb-0 mt-1">{scopeLabel}</h1>
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

      {/* Bố cục 2 cột nguyên bản: Trái 8 cột (Hiệu suất luồng + Hoạt động + Bảng nợ) | Phải 4 cột (Hồ sơ tòa & Danh bạ) */}
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
          />

          {/* Bảng đối soát phòng chậm thanh toán chi tiết */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="h6 fw-bold mb-0">
                Phòng chậm thanh toán & Thu hồi nợ{' '}
                <span className="fw-normal text-secondary">({latePayments.length})</span>
              </h2>
              <span className="small text-secondary">Danh sách hóa đơn quá hạn cần thu tiền</span>
            </div>
            <DataTable
              columns={latePaymentColumns}
              data={latePayments}
              emptyMessage="Không có phòng nào chậm thanh toán."
              onRowClick={isAdmin ? undefined : (row) => navigate(`/invoices/${row._id}`)}
            />
          </section>
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

export default ReportPage;
