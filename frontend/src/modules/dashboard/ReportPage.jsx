// UC-48: Báo cáo theo kỳ /reports (Admin, Manager) – trang PHÂN TÍCH, khác Tổng quan /dashboard là trang VẬN HÀNH
// Chọn kỳ Tháng / Quý / Năm (Admin chọn thêm tòa) → GET /reports cho kỳ đó, kỳ liền trước (để so sánh)
//   và 6 tháng gần nhất (biểu đồ xu hướng, cột thuộc kỳ đang xem tô đậm)
// Gồm: 5 số tổng của kỳ · doanh thu theo tháng + tình trạng phòng · hoạt động theo tháng (hợp đồng mới, cư dân vào ở,
//   sự cố) · hiệu quả từng tòa (Admin, toàn hệ thống) · công nợ quá hạn. Có nút In / Lưu PDF
// Mỗi con số chỉ hiện ở 1 chỗ: lấp đầy ở vòng tình trạng phòng, doanh thu từng tòa ở bảng, số ngày trễ ở bảng công nợ
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, ProgressBar } from 'react-bootstrap';
import { BiBuildings, BiCalendar, BiPrinter } from 'react-icons/bi';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FilterSelect from '../../components/FilterSelect';
import MoneyText from '../../components/MoneyText';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { useSavedState } from '../../utils/filter';
import { formatDate, formatMoney } from '../../utils/format';
import dashboardApi from './dashboard.api';
import ChangeText from './components/ChangeText';
import {
  PERIOD_TYPE,
  currentPeriod,
  monthLabel,
  periodLabel,
  periodRange,
  previousPeriod,
  TREND_MONTHS,
  trendRange,
} from './reportPeriod';

const PERIOD_OPTIONS = [
  { value: PERIOD_TYPE.MONTH, label: 'Tháng' },
  { value: PERIOD_TYPE.QUARTER, label: 'Quý' },
  { value: PERIOD_TYPE.YEAR, label: 'Năm' },
];
const QUARTER_OPTIONS = [1, 2, 3, 4].map((quarter) => ({
  value: String(quarter),
  label: `Quý ${quarter}`,
}));
const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => String(THIS_YEAR - index)).map(
  (year) => ({ value: year, label: year }),
);

const ROOM_PARTS = [
  { key: 'occupied', label: 'Đang thuê', variant: 'primary' },
  { key: 'available', label: 'Trống', variant: 'success' },
  { key: 'maintenance', label: 'Bảo trì', variant: 'warning' },
];

// 3 đường của biểu đồ hoạt động: cùng đơn vị (số lượng) nên chung 1 trục
const ACTIVITY_SERIES = [
  { key: 'contracts', label: 'Hợp đồng mới', color: 'var(--bs-primary)' },
  { key: 'residents', label: 'Cư dân vào ở', color: 'var(--bs-success)' },
  { key: 'incidents', label: 'Sự cố phát sinh', color: 'var(--bs-danger)' },
];

const CHART_TICK = { fill: 'var(--bs-secondary-color)', fontSize: 11 };
const CHART_GRID = 'var(--bs-border-color)';

// trục tiền của biểu đồ: 12500000 → "12,5tr", 800000 → "800k"
const shortMoney = (value) => {
  if (value >= 1e6) return `${Number((value / 1e6).toFixed(1)).toLocaleString('vi-VN')}tr`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}k`;
  return String(value);
};

// ô số tổng của kỳ: nhãn nhỏ, số to, dòng so sánh với kỳ trước
const SummaryCard = ({ label, children, sub }) => (
  <Card>
    <Card.Body className="flex flex-col gap-1">
      <span className="small text-secondary">{label}</span>
      <span className="fs-4 fw-bold leading-tight text-truncate">{children}</span>
      {sub}
    </Card.Body>
  </Card>
);

const SectionTitle = ({ children, note }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
    <h2 className="h6 fw-bold mb-0">{children}</h2>
    {note && <span className="small text-secondary">{note}</span>}
  </div>
);

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  const [period, setPeriod] = useSavedState('reports:period', currentPeriod);
  const [buildingId, setBuildingId] = useSavedState('reports:buildingId', '');
  const [buildings, setBuildings] = useState([]);
  // key: kỳ + tòa của lần tải gần nhất; khác kỳ đang chọn nghĩa là đang tải (giữ số cũ, không nhấp nháy)
  const [state, setState] = useState({
    key: '',
    current: null,
    previous: null,
    trend: null,
    error: '',
  });

  const range = periodRange(period);
  const trend = trendRange(period);
  const requestKey = `${range.from}|${range.to}|${buildingId}`;

  useEffect(() => {
    if (!isAdmin) return;
    dashboardApi
      .buildings()
      .then((response) => setBuildings(Array.isArray(response.data) ? response.data : []))
      .catch(() => setBuildings([]));
  }, [isAdmin]);

  const loadReport = useCallback(() => {
    const scope = isAdmin && buildingId ? { buildingId } : {};
    const [from, to] = requestKey.split('|');
    const trendQuery = trendRange(period);
    const sameAsPeriod = trendQuery.from === from;
    return Promise.all([
      dashboardApi.report({ ...scope, from, to }),
      // kỳ trước / xu hướng lỗi thì chỉ mất dòng so sánh / biểu đồ, báo cáo vẫn hiện
      dashboardApi.report({ ...scope, ...periodRange(previousPeriod(period)) }).catch(() => null),
      sameAsPeriod ? null : dashboardApi.report({ ...scope, ...trendQuery }).catch(() => null),
    ])
      .then(([current, previous, trendResponse]) =>
        setState({
          key: requestKey,
          current: current.data,
          previous: previous?.data ?? null,
          trend: sameAsPeriod ? current.data : (trendResponse?.data ?? current.data),
          error: '',
        }),
      )
      .catch((error) =>
        setState((prev) => ({
          ...prev,
          key: requestKey,
          error: error.message,
          noBuilding: error.status === 403 && !isAdmin,
        })),
      );
  }, [isAdmin, buildingId, period, requestKey]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const { current, previous, error } = state;
  const loading = state.key !== requestKey;

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building._id === buildingId) ?? null,
    [buildings, buildingId],
  );
  // Manager phụ trách từng tòa (GET /buildings trả manager: { _id, name } | null) – ai chịu trách nhiệm số liệu của tòa
  const managerByBuilding = useMemo(
    () => new Map(buildings.map((building) => [String(building._id), building.manager ?? null])),
    [buildings],
  );
  const selectedManager = selectedBuilding?.manager;
  const scopeName = isAdmin
    ? selectedBuilding
      ? `${selectedBuilding.name} · ${selectedManager ? `Manager: ${selectedManager.name}` : 'Chưa có Manager'}`
      : 'Toàn hệ thống'
    : (user.building?.name ?? 'Tòa của tôi');
  const previousLabel = periodLabel(previousPeriod(period));

  // tháng thuộc kỳ đang xem (YYYY-MM) để tô đậm trên biểu đồ xu hướng
  const firstMonth = range.from.slice(0, 7);
  const lastMonth = range.to.slice(0, 7);
  const inPeriod = (month) => month >= firstMonth && month <= lastMonth;
  // kỳ ngắn: hiện 6 tháng tính đến hết kỳ, cột thuộc kỳ tô đậm; kỳ năm: đúng 12 tháng của năm
  const trendNote =
    trend.from < range.from
      ? `${TREND_MONTHS} tháng gần nhất · cột đậm là ${periodLabel(period)}`
      : `Từng tháng trong ${periodLabel(period)}`;

  const revenueTrend = state.trend?.revenueByMonth ?? [];
  const activityTrend = (state.trend?.performance?.points ?? []).map((point) => ({
    ...point,
    month: point.date,
  }));

  const totals = current?.performance?.totals ?? {};
  const previousTotals = previous?.performance?.totals ?? {};
  const latePayments = current?.latePayments ?? [];
  const lateTotal = latePayments.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const rooms = current?.rooms ?? {
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
    occupancyRate: 0,
  };
  // tòa chưa có phòng thì vẽ vòng xám thay vì để trống
  const roomSlices =
    rooms.total > 0
      ? ROOM_PARTS.map((part) => ({
          ...part,
          value: rooms[part.key] ?? 0,
          color: `var(--bs-${part.variant})`,
        }))
      : [{ key: 'empty', value: 1, color: 'var(--bs-secondary-bg)' }];
  const byBuilding =
    isAdmin && !buildingId && Array.isArray(current?.byBuilding) ? current.byBuilding : null;

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

  const buildingColumns = [
    {
      key: 'name',
      title: 'Tòa nhà',
      render: (row) => (
        <span className="flex flex-col">
          <span className="fw-semibold">{row.name}</span>
          <span className="small text-secondary">{row.address}</span>
        </span>
      ),
    },
    {
      key: 'manager',
      title: 'Manager phụ trách',
      render: (row) => {
        const manager = managerByBuilding.get(String(row._id));
        // bấm tên mở hồ sơ Manager (số điện thoại, email); chặn nổi lên để không mở báo cáo riêng của tòa
        return manager ? (
          <Link
            to={`/managers/${manager._id}`}
            onClick={(event) => event.stopPropagation()}
            className="text-nowrap"
          >
            {manager.name}
          </Link>
        ) : (
          <span className="text-danger text-nowrap">Chưa có Manager</span>
        );
      },
    },
    {
      key: 'occupancyRate',
      title: 'Lấp đầy (hiện tại)',
      render: (row) => (
        <span className="flex items-center gap-2">
          <ProgressBar now={row.occupancyRate} className="h-1.5 w-16" />
          <span className="small text-nowrap">
            {row.occupancyRate}% · {row.occupiedRooms}/{row.totalRooms}
          </span>
        </span>
      ),
    },
    {
      key: 'revenue',
      title: 'Doanh thu kỳ',
      align: 'end',
      render: (row) => <MoneyText value={row.revenue} />,
    },
    { key: 'newContracts', title: 'HĐ mới', align: 'end' },
    { key: 'endedContracts', title: 'HĐ kết thúc', align: 'end' },
    {
      key: 'overdueAmount',
      title: 'Nợ quá hạn',
      align: 'end',
      render: (row) =>
        row.overdueRoomsCount > 0 ? (
          <span className="text-danger text-nowrap">
            {row.overdueRoomsCount} HĐ · <MoneyText value={row.overdueAmount} />
          </span>
        ) : (
          <span className="text-secondary">—</span>
        ),
    },
  ];

  const filters = (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {isAdmin && (
        <FilterSelect
          label="Tòa nhà"
          icon={BiBuildings}
          name="buildingId"
          options={buildings.map((building) => ({ value: building._id, label: building.name }))}
          placeholder="Tất cả"
          value={buildingId}
          onChange={(event) => setBuildingId(event.target.value)}
        />
      )}
      <FilterSelect
        label="Kỳ"
        icon={BiCalendar}
        name="type"
        options={PERIOD_OPTIONS}
        value={period.type}
        onChange={(event) => setPeriod({ ...period, type: event.target.value })}
        className="w-40"
      />
      {period.type === PERIOD_TYPE.MONTH && (
        <Form.Control
          type="month"
          aria-label="Tháng"
          className="w-44"
          value={period.month}
          onChange={(event) =>
            event.target.value && setPeriod({ ...period, month: event.target.value })
          }
        />
      )}
      {period.type === PERIOD_TYPE.QUARTER && (
        <FilterSelect
          name="quarter"
          options={QUARTER_OPTIONS}
          value={String(period.quarter)}
          onChange={(event) => setPeriod({ ...period, quarter: Number(event.target.value) })}
          className="w-32"
        />
      )}
      {period.type !== PERIOD_TYPE.MONTH && (
        <FilterSelect
          name="year"
          options={YEAR_OPTIONS}
          value={String(period.year)}
          onChange={(event) => setPeriod({ ...period, year: Number(event.target.value) })}
          className="w-32"
        />
      )}
    </div>
  );

  const renderBody = () => {
    if (state.noBuilding)
      return <EmptyState message={error || 'Bạn chưa được cấp quyền quản lý tòa nhà'} />;
    if (!current && loading) {
      return (
        <Card>
          <Card.Body>
            <SkeletonRows rows={6} columns={4} />
          </Card.Body>
        </Card>
      );
    }
    if (!current) {
      return (
        <ErrorState message="Không tải được dữ liệu báo cáo" detail={error} onRetry={loadReport} />
      );
    }

    return (
      <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {error && (
          <Alert variant="warning" className="mb-0 small print:hidden">
            Không tải được kỳ vừa chọn, đang hiện số liệu cũ: {error}
          </Alert>
        )}

        {/* 5 số tổng của kỳ, đều so với kỳ liền trước (lấp đầy là số hiện tại nên nằm ở vòng Tình trạng phòng) */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <SummaryCard
            label="Doanh thu thực thu"
            sub={
              <ChangeText
                current={current.totalRevenue}
                previous={previous?.totalRevenue}
                label={previousLabel}
              />
            }
          >
            <MoneyText value={current.totalRevenue ?? 0} />
          </SummaryCard>
          <SummaryCard
            label="Hợp đồng mới"
            sub={
              <ChangeText
                current={current.contracts?.new}
                previous={previous?.contracts?.new}
                label={previousLabel}
                asCount
              />
            }
          >
            {current.contracts?.new ?? 0}
          </SummaryCard>
          <SummaryCard
            label="Hợp đồng kết thúc"
            sub={
              <ChangeText
                current={current.contracts?.ended}
                previous={previous?.contracts?.ended}
                label={previousLabel}
                asCount
                upIsGood={false}
              />
            }
          >
            {current.contracts?.ended ?? 0}
          </SummaryCard>
          <SummaryCard
            label="Cư dân vào ở"
            sub={
              <ChangeText
                current={totals.residents}
                previous={previousTotals.residents}
                label={previousLabel}
                asCount
              />
            }
          >
            {totals.residents ?? 0}
          </SummaryCard>
          <SummaryCard
            label="Sự cố phát sinh"
            sub={
              <ChangeText
                current={totals.incidents}
                previous={previousTotals.incidents}
                label={previousLabel}
                asCount
                upIsGood={false}
              />
            }
          >
            {totals.incidents ?? 0}
          </SummaryCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-3">
          {/* doanh thu từng tháng (tháng không có doanh thu vẫn là 0) */}
          <Card className="lg:col-span-2">
            <Card.Body>
              <SectionTitle note={trendNote}>Doanh thu theo tháng</SectionTitle>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={monthLabel}
                      tickLine={false}
                      axisLine={{ stroke: CHART_GRID }}
                      tick={CHART_TICK}
                    />
                    <YAxis
                      tickFormatter={shortMoney}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tick={CHART_TICK}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--bs-tertiary-bg)' }}
                      labelFormatter={(month) => `Tháng ${monthLabel(month)}`}
                      formatter={(value) => [formatMoney(value), 'Doanh thu']}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {revenueTrend.map((point) => (
                        <Cell
                          key={point.month}
                          fill="var(--bs-primary)"
                          fillOpacity={inPeriod(point.month) ? 1 : 0.3}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>

          {/* tình trạng phòng tính tại lúc xem, không theo kỳ */}
          <Card>
            <Card.Body className="flex flex-col gap-3">
              <SectionTitle note="Tại thời điểm xem">Tình trạng phòng</SectionTitle>
              <div className="relative h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomSlices}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="68%"
                      outerRadius="100%"
                      paddingAngle={rooms.total > 0 ? 2 : 0}
                      isAnimationActive={false}
                    >
                      {roomSlices.map((slice) => (
                        <Cell key={slice.key} fill={slice.color} />
                      ))}
                    </Pie>
                    {rooms.total > 0 && (
                      <Tooltip formatter={(value, name) => [`${value} phòng`, name]} />
                    )}
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="fs-3 fw-bold leading-tight">{rooms.occupancyRate}%</span>
                  <span className="small text-secondary">lấp đầy</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {ROOM_PARTS.map((part) => (
                  <div key={part.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full bg-${part.variant}`} />
                      {part.label}
                    </span>
                    <span className="fw-semibold tabular-nums">
                      {rooms[part.key] ?? 0}
                      <span className="fw-normal text-secondary">
                        {' '}
                        (
                        {rooms.total > 0
                          ? Math.round(((rooms[part.key] ?? 0) / rooms.total) * 100)
                          : 0}
                        %)
                      </span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-top pt-2">
                  <span className="text-secondary">Tổng số phòng</span>
                  <span className="fw-semibold tabular-nums">{rooms.total}</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* hợp đồng mới (đã kích hoạt), cư dân vào ở, sự cố theo tháng – cùng đơn vị nên chung 1 trục */}
        <Card>
          <Card.Body>
            <SectionTitle note={trendNote}>Hoạt động theo tháng</SectionTitle>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tickLine={false}
                    axisLine={{ stroke: CHART_GRID }}
                    tick={CHART_TICK}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    tick={CHART_TICK}
                  />
                  <Tooltip labelFormatter={(month) => `Tháng ${monthLabel(month)}`} />
                  <Legend iconType="circle" />
                  {ACTIVITY_SERIES.map((series) => (
                    <Area
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={2}
                      fill={series.color}
                      fillOpacity={0.12}
                      dot={{ r: 3, fill: series.color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card.Body>
        </Card>

        {/* Admin xem toàn hệ thống: so sánh các tòa; bấm 1 tòa để xem báo cáo riêng tòa đó */}
        {byBuilding && (
          <section>
            <SectionTitle note={`${periodLabel(period)} · bấm một tòa để xem báo cáo riêng`}>
              Hiệu quả từng tòa
            </SectionTitle>
            <DataTable
              columns={buildingColumns}
              data={byBuilding}
              emptyMessage="Chưa có tòa nhà nào."
              onRowClick={(row) => setBuildingId(row._id)}
            />
          </section>
        )}

        {/* công nợ tính đến hôm nay, không phụ thuộc kỳ; bảng xếp hóa đơn trễ lâu nhất lên đầu */}
        <section>
          <SectionTitle
            note={
              <>
                Tính đến hôm nay, không theo kỳ · Tổng nợ{' '}
                <MoneyText value={lateTotal} className="fw-semibold text-danger" />
              </>
            }
          >
            Công nợ quá hạn{' '}
            <span className="fw-normal text-secondary">({latePayments.length} hóa đơn)</span>
          </SectionTitle>
          <DataTable
            columns={latePaymentColumns}
            data={latePayments}
            emptyMessage="Không có phòng nào chậm thanh toán."
            onRowClick={isAdmin ? undefined : (row) => navigate(`/invoices/${row._id}`)}
          />
        </section>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Báo cáo"
        subtitle={`${scopeName} · ${periodLabel(period)} (${formatDate(range.from)} – ${formatDate(range.to)})`}
        actions={
          <Button
            variant="secondary"
            className="flex items-center gap-2 print:hidden"
            onClick={() => window.print()}
          >
            <BiPrinter />
            In / Lưu PDF
          </Button>
        }
      >
        {filters}
      </PageHeader>
      {renderBody()}
    </>
  );
};

export default ReportPage;
