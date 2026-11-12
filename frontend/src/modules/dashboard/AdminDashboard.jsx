// UC-07: Tổng quan VẬN HÀNH cho Admin – xem nhanh hiện tại và đi xử lý ngay, không chọn kỳ (phân tích theo kỳ ở /reports)
// 4 thẻ số (doanh thu so với tháng trước) · Việc cần Admin xử lý (đơn phương chờ duyệt, tòa chưa có Manager, nợ quá hạn)
// · Hoạt động gần đây · Cơ cấu phòng · Biến động cư dân và hợp đồng cần theo dõi
import { useEffect, useMemo, useState } from 'react';
import { Card } from 'react-bootstrap';
import {
  BiBell,
  BiBuildings,
  BiCalendarExclamation,
  BiCheckDouble,
  BiCreditCard,
  BiErrorCircle,
  BiFile,
  BiGroup,
  BiMoney,
  BiPieChartAlt2,
  BiUserCheck,
  BiUserMinus,
  BiUserPlus,
  BiWallet,
  BiWrench,
  BiXCircle,
} from 'react-icons/bi';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import MoneyText from '../../components/MoneyText';
import { useAuth } from '../../context/AuthContext';
import { TERMINATION_STATUS, TERMINATION_TYPE } from '../../constants/enums';
import { formatDateTime } from '../../utils/format';
import dashboardApi from './dashboard.api';
import ChangeText from './components/ChangeText';
import TaskRow from './components/TaskRow';
import { currentPeriod, periodLabel, periodRange, previousPeriod } from './reportPeriod';

// tháng trước để so doanh thu (GET /reports của đúng tháng đó)
const LAST_MONTH = previousPeriod(currentPeriod());

const AdminDashboard = ({ data }) => {
  const { user } = useAuth();

  const rooms = useMemo(
    () => data?.rooms ?? { total: 0, available: 0, occupied: 0, maintenance: 0 },
    [data?.rooms],
  );
  const occupancyRate = rooms.total > 0 ? Math.round((rooms.occupied / rooms.total) * 100) : 0;
  const residents = data?.residents ?? 0;
  const movedIn = data?.movedIn ?? 0;
  const movedOut = data?.movedOut ?? 0;
  const totalLeft = data?.totalLeft ?? 0;
  const activeContracts = data?.activeContracts ?? 0;
  const expiringContracts = data?.expiringContracts ?? 0;
  const pendingRefundContracts = data?.pendingRefundContracts ?? 0;
  const pendingAmount = data?.pendingInvoices?.totalAmount ?? 0;
  const overdueCount = data?.pendingInvoices?.overdueCount ?? 0;
  const overdueAmount = data?.pendingInvoices?.overdueAmount ?? 0;
  const recentActivities = Array.isArray(data?.recentActivities) ? data.recentActivities : [];

  // số liệu phụ cho khối "Việc cần Admin xử lý" + doanh thu tháng trước; lỗi thì để null (ẩn số, không chặn trang)
  const [extras, setExtras] = useState({ unilateral: null, noManager: null, lastMonthRevenue: null });

  useEffect(() => {
    Promise.all([
      dashboardApi
        .terminations({ type: TERMINATION_TYPE.UNILATERAL, status: TERMINATION_STATUS.PENDING, page: 1, limit: 1 })
        .then((response) => response.data.total)
        .catch(() => null),
      dashboardApi
        .buildings({ hasManager: 'false' })
        .then((response) => (Array.isArray(response.data) ? response.data : []))
        .catch(() => null),
      dashboardApi
        .report(periodRange(LAST_MONTH))
        .then((response) => response.data.totalRevenue)
        .catch(() => null),
    ]).then(([unilateral, noManager, lastMonthRevenue]) =>
      setExtras({ unilateral, noManager, lastMonthRevenue }),
    );
  }, []);

  // Dữ liệu biểu đồ tròn Donut
  // chỉ 3 trạng thái phòng (sự cố không phải trạng thái phòng nên không đưa vào đây)
  const donutData = useMemo(
    () => [
      { name: 'Đang thuê', value: rooms.occupied, color: 'var(--bs-primary)' },
      { name: 'Trống', value: rooms.available, color: 'var(--bs-success)' },
      { name: 'Bảo trì', value: rooms.maintenance, color: 'var(--bs-warning)' },
    ],
    [rooms],
  );

  const noManagerNames = (extras.noManager ?? []).map((building) => building.name).join(', ');
  const totalTasks = (extras.unilateral ?? 0) + (extras.noManager?.length ?? 0) + overdueCount;

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
        {/* Card 1: Tòa nhà & Công suất */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="hf-av w-11 h-11 shrink-0 text-xl">
            <BiBuildings size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Quy mô cơ sở</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {data?.buildings ?? data?.buildingSummaries?.length ?? 0} tòa nhà
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              {rooms.occupied}/{rooms.total} phòng thuê ({occupancyRate}%)
            </div>
          </div>
        </div>

        {/* Card 2: Nhân khẩu cư dân */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="hf-av w-11 h-11 shrink-0 text-xl">
            <BiGroup size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Nhân khẩu cư dân</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {residents} đang ở
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              +{movedIn} mới tháng này · {totalLeft} đã rời đi
            </div>
          </div>
        </div>

        {/* Card 3: Hợp đồng đang hiệu lực */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="hf-av w-11 h-11 shrink-0 text-xl">
            <BiFile size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Hợp đồng thuê</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {activeContracts} hiệu lực
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              {expiringContracts} sắp hết hạn · {pendingRefundContracts} chờ hoàn cọc
            </div>
          </div>
        </div>

        {/* Card 4: Doanh thu tháng này */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="hf-av w-11 h-11 shrink-0 text-xl">
            <BiMoney size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Thực thu tháng này</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight text-truncate">
              <MoneyText value={data?.monthlyRevenue ?? 0} />
            </div>
            <div className="text-[11px] mt-0.5 text-truncate">
              {extras.lastMonthRevenue === null ? (
                <span className="text-slate-500">
                  {pendingAmount > 0 ? (
                    <>
                      Chờ thu: <MoneyText value={pendingAmount} />
                    </>
                  ) : (
                    'Không có hóa đơn tồn đọng'
                  )}
                </span>
              ) : (
                <ChangeText
                  current={data?.monthlyRevenue ?? 0}
                  previous={extras.lastMonthRevenue}
                  label={periodLabel(LAST_MONTH)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2 Khối chính: Trái 8 cột | Phải 4 cột */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* CỘT TRÁI (8 CỘT) */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          {/* Việc chỉ Admin làm được; bấm từng dòng sang danh sách đã lọc sẵn */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="hf-av w-8 h-8 shrink-0">
                    <BiCheckDouble size={18} />
                  </span>
                  <span className="text-sm fw-bold text-slate-800">Việc cần Admin xử lý</span>
                </div>
                {totalTasks > 0 && <span className="hf-badge hf-b-red">{totalTasks} việc</span>}
              </div>

              <div className="flex flex-col gap-2.5">
                {/* UC-29: đơn đơn phương Manager gửi lên, Admin duyệt / từ chối */}
                <TaskRow
                  to={`/terminations?type=${TERMINATION_TYPE.UNILATERAL}`}
                  icon={BiXCircle}
                  iconClass="bg-rose-50 text-rose-600"
                  title="Đơn chấm dứt đơn phương chờ duyệt"
                  description={
                    extras.unilateral === null
                      ? 'Bấm để mở danh sách đơn chấm dứt'
                      : extras.unilateral > 0
                        ? `${extras.unilateral} đơn đang chờ Admin phê duyệt hoặc từ chối`
                        : 'Không có đơn nào chờ duyệt'
                  }
                  badge={extras.unilateral > 0 && `${extras.unilateral} đơn`}
                  badgeTone="red"
                />

                {/* BR-023: tòa không có Manager thì không ai vận hành */}
                <TaskRow
                  to="/buildings"
                  icon={BiBuildings}
                  iconClass="bg-primary-subtle text-primary"
                  title="Tòa nhà chưa có Manager phụ trách"
                  description={
                    extras.noManager === null
                      ? 'Bấm để mở danh sách tòa nhà'
                      : extras.noManager.length > 0
                        ? noManagerNames
                        : 'Tòa nào cũng đã có Manager'
                  }
                  badge={extras.noManager?.length > 0 && `${extras.noManager.length} tòa`}
                  badgeTone="plum"
                />

                {/* chi tiết từng hóa đơn nợ nằm ở mục Công nợ quá hạn của trang Báo cáo */}
                <TaskRow
                  to="/reports"
                  icon={BiErrorCircle}
                  iconClass="bg-amber-50 text-amber-600"
                  title="Hóa đơn quá hạn toàn hệ thống"
                  description={
                    overdueCount > 0 ? (
                      <>
                        {overdueCount} hóa đơn · Còn nợ <MoneyText value={overdueAmount} />
                      </>
                    ) : (
                      'Không có hóa đơn quá hạn'
                    )
                  }
                  badge={overdueCount > 0 && `${overdueCount} HĐ`}
                  badgeTone="warn"
                />
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

        {/* CỘT PHẢI (4 CỘT) */}
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
                      <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                      <span className="text-slate-600">Đang thuê</span>
                    </div>
                    <span className="font-semibold text-slate-800">{rooms.occupied}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
                      <span className="text-slate-600">Trống</span>
                    </div>
                    <span className="font-semibold text-slate-800">{rooms.available}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-warning shrink-0" />
                      <span className="text-slate-600">Bảo trì</span>
                    </div>
                    <span className="font-semibold text-slate-800">{rooms.maintenance}</span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Card Biến động cư dân & hợp đồng cần theo dõi */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BiGroup size={18} />
                </span>
                <span className="text-sm fw-bold text-slate-800">
                  Biến động cư dân & Hợp đồng cần theo dõi
                </span>
              </div>

              {/* 3 Ô biến động nhân khẩu */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                    <BiUserCheck className="text-blue-600" /> Đang ở
                  </div>
                  <div className="text-base fw-bold text-slate-800 mt-0.5">{residents}</div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                    <BiUserPlus className="text-emerald-600" /> Mới vào
                  </div>
                  <div className="text-base fw-bold text-emerald-700 mt-0.5">+{movedIn}</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                    <BiUserMinus className="text-rose-500" /> Rời đi
                  </div>
                  <div className="text-base fw-bold text-slate-800 mt-0.5">{totalLeft}</div>
                  <div className="text-[10px] text-slate-400">Tháng này: {movedOut}</div>
                </div>
              </div>

              {/* Manager các tòa xử lý; Admin chỉ theo dõi số lượng */}
              <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <BiCalendarExclamation className="text-purple-600" size={15} /> Sắp hết hạn (30 ngày)
                  </span>
                  <strong className="text-purple-700">{expiringContracts} hợp đồng</strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-teal-50/50 border border-teal-100">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <BiWallet className="text-teal-600" size={15} /> Hợp đồng chờ hoàn cọc
                  </span>
                  <strong className="text-teal-700">{pendingRefundContracts} hợp đồng</strong>
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
