// UC-48: báo cáo /reports. Chọn kỳ theo tháng, quý hoặc năm; Admin lọc được theo tòa, Manager chỉ xem tòa mình
// Gồm: tổng doanh thu, biểu đồ doanh thu theo tháng, phòng theo trạng thái + tỷ lệ lấp đầy, hợp đồng mới / kết thúc,
// bảng phòng chậm thanh toán (tính theo hiện tại, không phụ thuộc kỳ). Trang chỉ đọc
import { useCallback, useEffect, useState } from 'react';
import { Card, Form } from 'react-bootstrap';
import { BiBuildings, BiFile, BiMoney, BiXCircle } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DataTable from '../../components/DataTable';
import ErrorState from '../../components/ErrorState';
import MoneyText from '../../components/MoneyText';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { formatDate, formatMoney } from '../../utils/format';
import dashboardApi from './dashboard.api';
import { monthLabel, PERIOD_TYPE, periodRange } from './reportPeriod';
import RoomStatusChart from './components/RoomStatusChart';
import StatTile from './components/StatTile';

const QUARTERS = [1, 2, 3, 4];
const pad = (value) => String(value).padStart(2, '0');

// trục tiền rút gọn: 3.500.000 → "3,5 tr"
const shortMoney = (value) =>
  value >= 1000000 ? `${new Intl.NumberFormat('vi-VN').format(value / 1000000)} tr` : String(value);

const latePaymentColumns = [
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

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  // kỳ mặc định: tháng hiện tại, tính 1 lần khi mở trang (render phải thuần)
  const [today] = useState(() => new Date());
  const currentYear = today.getFullYear();
  const [period, setPeriod] = useState({
    type: PERIOD_TYPE.MONTH,
    month: `${currentYear}-${pad(today.getMonth() + 1)}`,
    year: currentYear,
    quarter: Math.floor(today.getMonth() / 3) + 1,
  });
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  // loading → ok | error
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const years = Array.from({ length: 5 }, (_, index) => currentYear - index);

  useEffect(() => {
    if (!isAdmin) return;
    dashboardApi
      .buildings()
      .then((response) => {
        const data = response.data;
        setBuildings(Array.isArray(data) ? data : (data?.items ?? []));
      })
      .catch(() => setBuildings([]));
  }, [isAdmin]);

  const { from, to } = periodRange(period);
  const loadReport = useCallback(
    () =>
      dashboardApi
        .report({ from, to, ...(buildingId && { buildingId }) })
        .then((response) => setState({ status: 'ok', data: response.data, error: '' }))
        .catch((error) => setState({ status: 'error', data: null, error: error.message })),
    [from, to, buildingId],
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const updatePeriod = (patch) => setPeriod((prev) => ({ ...prev, ...patch }));

  const renderContent = () => {
    if (state.status === 'loading' && !state.data) {
      return (
        <Card>
          <Card.Body>
            <SkeletonRows rows={6} columns={4} />
          </Card.Body>
        </Card>
      );
    }
    if (state.status === 'error') {
      return <ErrorState message="Không tải được báo cáo" detail={state.error} onRetry={loadReport} />;
    }

    const { data } = state;
    const chartData = data.revenueByMonth.map((item) => ({ ...item, label: monthLabel(item.month) }));
    const hasPeriodData = data.totalRevenue > 0 || data.contracts.new > 0 || data.contracts.ended > 0;

    return (
      <>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatTile icon={BiMoney} label="Tổng doanh thu trong kỳ" value={<MoneyText value={data.totalRevenue} />} />
          <StatTile
            icon={BiBuildings}
            label="Tỷ lệ lấp đầy hiện tại"
            value={`${data.rooms.occupancyRate}%`}
            sub={`${data.rooms.occupied} / ${data.rooms.total} phòng đang thuê`}
          />
          <StatTile icon={BiFile} label="Hợp đồng mới trong kỳ" value={data.contracts.new} />
          <StatTile icon={BiXCircle} label="Hợp đồng kết thúc trong kỳ" value={data.contracts.ended} />
        </div>

        <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
          <Card>
            <Card.Body className="flex flex-col gap-3">
              <h2 className="h6 fw-bold mb-0">Doanh thu theo tháng</h2>
              {hasPeriodData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bs-border-color)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickFormatter={shortMoney} tickLine={false} axisLine={false} width={56} fontSize={12} />
                      <Tooltip formatter={(value) => [formatMoney(value), 'Doanh thu']} cursor={{ fill: 'var(--bs-tertiary-bg)' }} />
                      <Bar dataKey="revenue" fill="var(--bs-primary)" radius={[4, 4, 0, 0]} maxBarSize={56} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="hf-ph h-72">Không có dữ liệu cho kỳ này</div>
              )}
            </Card.Body>
          </Card>
          <Card>
            <Card.Body className="flex flex-col gap-3">
              <h2 className="h6 fw-bold mb-0">Phòng theo trạng thái</h2>
              <RoomStatusChart rooms={data.rooms} />
            </Card.Body>
          </Card>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="h6 fw-bold mb-0">
            Phòng chậm thanh toán{' '}
            <span className="fw-normal text-secondary">({data.latePayments.length})</span>
          </h2>
          <DataTable
            columns={latePaymentColumns}
            data={data.latePayments}
            emptyMessage="Không có phòng nào chậm thanh toán."
            onRowClick={isAdmin ? undefined : (row) => navigate(`/invoices/${row._id}`)}
          />
        </section>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <Card.Body className="flex flex-wrap items-center gap-3 py-2">
          <span className="fw-semibold">Kỳ báo cáo</span>
          <Form.Select
            aria-label="Loại kỳ"
            className="w-auto"
            value={period.type}
            onChange={(event) => updatePeriod({ type: event.target.value })}
          >
            <option value={PERIOD_TYPE.MONTH}>Theo tháng</option>
            <option value={PERIOD_TYPE.QUARTER}>Theo quý</option>
            <option value={PERIOD_TYPE.YEAR}>Theo năm</option>
          </Form.Select>

          {period.type === PERIOD_TYPE.MONTH ? (
            <Form.Control
              type="month"
              aria-label="Tháng"
              className="w-auto"
              value={period.month}
              onChange={(event) => event.target.value && updatePeriod({ month: event.target.value })}
            />
          ) : (
            <>
              {period.type === PERIOD_TYPE.QUARTER && (
                <Form.Select
                  aria-label="Quý"
                  className="w-auto"
                  value={period.quarter}
                  onChange={(event) => updatePeriod({ quarter: Number(event.target.value) })}
                >
                  {QUARTERS.map((quarter) => (
                    <option key={quarter} value={quarter}>
                      Quý {quarter}
                    </option>
                  ))}
                </Form.Select>
              )}
              <Form.Select
                aria-label="Năm"
                className="w-auto"
                value={period.year}
                onChange={(event) => updatePeriod({ year: Number(event.target.value) })}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    Năm {year}
                  </option>
                ))}
              </Form.Select>
            </>
          )}

          {isAdmin && (
            <Form.Select
              aria-label="Tòa nhà"
              className="w-auto min-w-56 ms-auto"
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
            >
              <option value="">Toàn hệ thống</option>
              {buildings.map((building) => (
                <option key={building._id} value={building._id}>
                  {building.name}
                </option>
              ))}
            </Form.Select>
          )}
        </Card.Body>
      </Card>

      {renderContent()}
    </div>
  );
};

export default ReportPage;
