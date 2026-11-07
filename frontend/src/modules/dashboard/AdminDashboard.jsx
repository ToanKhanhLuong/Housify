// UC-07: Tổng quan điều hành cho Admin (Theo mẫu thiết kế Ảnh 1 tinh gọn, chính xác)
// Không viết cứng số liệu/phần trăm, biểu đồ 7 ngày hiển thị chuẩn trục X, Hoạt động gần đây cuộn dọc mượt mà, bỏ thẻ Housify
import { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import {
  BiBarChartAlt2,
  BiBell,
  BiBuildings,
  BiCreditCard,
  BiFile,
  BiGroup,
  BiMoney,
  BiPieChartAlt2,
  BiWrench,
} from 'react-icons/bi';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import MoneyText from '../../components/MoneyText';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/format';

const AdminDashboard = ({ data }) => {
  const { user } = useAuth();

  const rooms = useMemo(
    () => data?.rooms ?? { total: 0, available: 0, occupied: 0, maintenance: 0 },
    [data?.rooms],
  );
  const openIncidents = data?.openIncidents ?? 0;
  const recentActivities = Array.isArray(data?.recentActivities) ? data.recentActivities : [];

  // Dữ liệu biểu đồ hoạt động 7 ngày qua (đọc đúng trường name / date từ backend)
  const chartData = useMemo(() => {
    const rawPoints = data?.performanceByPeriod?.['7d']?.points;
    if (Array.isArray(rawPoints) && rawPoints.length > 0) {
      return rawPoints.map((p) => {
        // p.name là "DD/MM/YY" hoặc p.date là "YYYY-MM-DD"
        let shortDate = '';
        if (p.name) {
          const parts = String(p.name).split('/');
          shortDate = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : p.name;
        } else if (p.date) {
          const parts = String(p.date).split('-');
          shortDate = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : p.date;
        }

        const contracts = p.contracts ?? 0;
        const residents = p.residents ?? 0;
        const incidents = p.incidents ?? 0;
        const totalActivity = contracts + residents + incidents;

        return {
          date: shortDate || 'N/A',
          total: totalActivity,
          contracts,
          residents,
          incidents,
        };
      });
    }

    // Dữ liệu fallback nếu chưa có sự kiện
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      days.push({ date: `${day}/${month}`, total: 0, contracts: 0, residents: 0, incidents: 0 });
    }
    return days;
  }, [data]);

  // Dữ liệu biểu đồ tròn Donut
  const donutData = useMemo(() => [
    { name: 'Đang thuê', value: rooms.occupied, color: '#8b5cf6' },
    { name: 'Trống', value: rooms.available, color: '#10b981' },
    { name: 'Bảo trì', value: rooms.maintenance, color: '#f59e0b' },
    { name: 'Sự cố', value: openIncidents, color: '#ef4444' },
  ], [rooms, openIncidents]);

  return (
    <div className="flex flex-col gap-3">
      {/* Tiêu đề & Lời chào */}
      <div>
        <h1 className="h5 fw-bold mb-0 text-slate-800">Tổng quan</h1>
        <span className="text-xs text-slate-500">
          Chào mừng bạn trở lại, {user.name || 'Admin'} 👋
        </span>
      </div>

      {/* 4 Thẻ KPI ngang trên cùng (Dữ liệu thật, KHÔNG viết cứng phần trăm/chỉ số) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tòa nhà đang hoạt động */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BiBuildings size={22} />
          </div>
          <div>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {data?.buildings ?? data?.buildingSummaries?.length ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Tòa nhà đang hoạt động</div>
          </div>
        </div>

        {/* Card 2: Cư dân mới tháng này */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BiGroup size={22} />
          </div>
          <div>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {data?.movedIn ?? data?.residents ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Cư dân mới tháng này</div>
          </div>
        </div>

        {/* Card 3: Hợp đồng đang hiệu lực */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <BiFile size={22} />
          </div>
          <div>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {data?.activeContracts ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Hợp đồng đang hiệu lực</div>
          </div>
        </div>

        {/* Card 4: Doanh thu tháng này (Tiền thực thu trong tháng, không hardcode %) */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <BiMoney size={22} />
          </div>
          <div>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              <MoneyText value={data?.monthlyRevenue ?? 0} />
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Doanh thu tháng này</div>
          </div>
        </div>
      </div>

      {/* 2 Khối chính: Trái 8 cột | Phải 4 cột */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* CỘT TRÁI (8 CỘT) */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          {/* Card Biểu đồ 7 ngày */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <BiBarChartAlt2 size={18} />
                  </span>
                  <span className="text-sm fw-bold text-slate-800">Hoạt động trong 7 ngày qua</span>
                </div>
                <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  7 ngày
                </span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminPurpleArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-xs flex flex-col gap-1">
                              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1">
                                Ngày {label}
                              </div>
                              <div className="flex items-center justify-between gap-3 text-slate-600">
                                <span>Tổng hoạt động:</span>
                                <strong className="text-purple-600">{item.total}</strong>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Hợp đồng: {item.contracts} · Cư dân: {item.residents} · Sự cố: {item.incidents}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#adminPurpleArea)"
                      dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#7c3aed' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>

          {/* Card Hoạt động gần đây (Dạng cuộn dọc vuốt xuống scroll mượt mà, bỏ chữ Xem tất cả) */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BiBell size={18} />
                </span>
                <span className="text-sm fw-bold text-slate-800">Hoạt động gần đây</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  ({recentActivities.length} ghi nhận)
                </span>
              </div>

              {/* Danh sách cuộn dọc scrollable */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {recentActivities.length > 0 ? (
                  recentActivities.map((item, idx) => {
                    const isContract = item.category === 'Ký hợp đồng' || item.category === 'Hợp đồng';
                    const isIncident = item.category === 'Sự cố phòng';

                    return (
                      <div
                        key={item._id || idx}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs transition-colors hover:bg-slate-100/60"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isContract
                                ? 'bg-purple-100 text-purple-600'
                                : isIncident
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            {isContract ? (
                              <BiFile size={15} />
                            ) : isIncident ? (
                              <BiWrench size={15} />
                            ) : (
                              <BiCreditCard size={15} />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 text-truncate">
                              {item.code ? `${item.code} – ` : ''}
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {item.actorName} · {item.createdAt ? formatDateTime(item.createdAt) : ''}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            item.badgeTone === 'ok'
                              ? 'bg-emerald-50 text-emerald-600'
                              : item.badgeTone === 'warn'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-purple-50 text-purple-600'
                          }`}
                        >
                          {item.badgeText || 'Hoạt động'}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Chưa có hoạt động nào gần đây
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* CỘT PHẢI (4 CỘT - Đã bỏ thẻ Housify) */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          {/* Card Cơ cấu phòng (Donut) */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BiPieChartAlt2 size={18} />
                </span>
                <span className="text-sm fw-bold text-slate-800">Cơ cấu phòng</span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Donut chart */}
                <div className="relative w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        innerRadius="70%"
                        outerRadius="100%"
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-800 leading-tight">
                      {rooms.total}
                    </span>
                    <span className="text-xs text-slate-500">phòng</span>
                  </div>
                </div>

                {/* Legend thống kê chi tiết */}
                <div className="flex flex-col gap-2 flex-1 min-w-0 text-xs">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                      <span className="text-slate-600">Đang thuê</span>
                    </div>
                    <span className="font-semibold text-slate-800">{rooms.occupied}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-600">Trống</span>
                    </div>
                    <span className="font-semibold text-slate-800">{rooms.available}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-slate-600">Bảo trì</span>
                    </div>
                    <span className="font-semibold text-slate-800">{rooms.maintenance}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-slate-600">Sự cố</span>
                    </div>
                    <span className="font-semibold text-slate-800">{openIncidents}</span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
