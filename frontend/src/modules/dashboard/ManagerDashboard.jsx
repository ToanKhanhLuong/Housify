// UC-47: Tổng quan điều hành cho Manager (Theo mẫu thiết kế Ảnh 2)
// Phủ đầy 1 màn hình (không cuộn xuống), Hoạt động gần đây cuộn dọc mượt mà và Công việc cần xử lý có nút navigate kèm trạng thái lọc
import { Card } from 'react-bootstrap';
import {
  BiBell,
  BiBuilding,
  BiCheck,
  BiChevronRight,
  BiCreditCard,
  BiDoorOpen,
  BiErrorCircle,
  BiGroup,
  BiReceipt,
  BiTimeFive,
  BiWallet,
  BiWrench,
} from 'react-icons/bi';
import { Link } from 'react-router-dom';
import MoneyText from '../../components/MoneyText';
import { useAuth } from '../../context/AuthContext';

const ManagerDashboard = ({ data }) => {
  const { user } = useAuth();

  const rooms = data?.rooms ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const occupancyRate = rooms.total > 0 ? Math.round((rooms.occupied / rooms.total) * 100) : 0;
  const availableRate = rooms.total > 0 ? Math.round((rooms.available / rooms.total) * 100) : 0;
  const maintenanceRate = rooms.total > 0 ? Math.max(0, 100 - occupancyRate - availableRate) : 0;

  const overdueCount = data?.pendingInvoices?.overdueCount ?? 0;
  const overdueAmount = data?.pendingInvoices?.overdueAmount ?? 0;
  const openIncidentsCount = data?.openIncidents ?? 0;
  const totalTasks = overdueCount + openIncidentsCount;

  const buildingName = data?.buildingOverview?.name || 'Tòa nhà phụ trách';
  const recentActivities = Array.isArray(data?.recentActivities) ? data.recentActivities : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Tiêu đề & Lời chào */}
      <div>
        <h1 className="h5 fw-bold mb-0 text-slate-800">Tổng quan</h1>
        <span className="text-xs text-slate-500">
          Chào mừng bạn trở lại, {user.name || 'Quản lý tòa nhà'} 👋
        </span>
      </div>

      {/* 4 Thẻ KPI ngang trên cùng (Ảnh 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Phòng */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BiDoorOpen size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Phòng</span>
            <div className="flex items-baseline gap-1.5 leading-tight">
              <span className="text-xl fw-bold text-slate-800">{occupancyRate}%</span>
              <span className="text-xs text-slate-600">Tỷ lệ lấp đầy</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              {rooms.occupied} / {rooms.total} phòng đang thuê
            </div>
          </div>
        </div>

        {/* Card 2: Tài chính */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <BiWallet size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Tài chính</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              <MoneyText value={data?.monthlyRevenue ?? 0} />
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Đã thu tháng này</div>
          </div>
        </div>

        {/* Card 3: Hóa đơn */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <BiReceipt size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Hóa đơn</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {overdueCount} hóa đơn
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              {overdueCount > 0 ? (
                <>
                  Đang quá hạn · <MoneyText value={overdueAmount} />
                </>
              ) : (
                'Không có nợ quá hạn'
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Vận hành */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <BiWrench size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Vận hành</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {openIncidentsCount} sự cố
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {openIncidentsCount > 0 ? 'Chưa xử lý' : 'Đang hoạt động ổn định'}
            </div>
          </div>
        </div>
      </div>

      {/* 2 Khối chính: Trái 7 cột (~60%) | Phải 5 cột (~40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* CỘT TRÁI (7 CỘT) */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          {/* Card Tình hình cơ sở */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <BiBuilding size={18} />
                  </span>
                  <span className="text-sm fw-bold text-slate-800">Tình hình cơ sở</span>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                  {buildingName}
                </span>
              </div>

              {/* Segmented Progress Bar nhiều đoạn */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 mb-3">
                <div
                  style={{ width: `${occupancyRate}%` }}
                  className="bg-purple-600 h-full transition-all duration-300"
                  title={`Đang thuê: ${occupancyRate}%`}
                />
                <div
                  style={{ width: `${availableRate}%` }}
                  className="bg-teal-500 h-full transition-all duration-300"
                  title={`Trống: ${availableRate}%`}
                />
                <div
                  style={{ width: `${maintenanceRate}%` }}
                  className="bg-amber-400 h-full transition-all duration-300"
                  title={`Bảo trì: ${maintenanceRate}%`}
                />
              </div>

              {/* Legend thống kê chi tiết theo % */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-1 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                  <span className="text-slate-600">
                    <strong className="text-slate-800">{rooms.occupied}</strong> đang thuê ({occupancyRate}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                  <span className="text-slate-600">
                    <strong className="text-slate-800">{rooms.available}</strong> trống ({availableRate}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-slate-600">
                    <strong className="text-slate-800">{rooms.maintenance}</strong> bảo trì ({maintenanceRate}%)
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Card Hoạt động gần đây (Dạng cuộn dọc vuốt xuống scrollable mượt mà) */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BiTimeFive size={18} />
                </span>
                <span className="text-sm fw-bold text-slate-800">Hoạt động gần đây</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  ({recentActivities.length} ghi nhận)
                </span>
              </div>

              {/* Danh sách các item cuộn dọc */}
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {recentActivities.length > 0 ? (
                  recentActivities.map((item, idx) => {
                    const isContract = item.category === 'Ký hợp đồng' || item.category === 'Hợp đồng';
                    const isResident = item.category === 'Cư dân';

                    return (
                      <div
                        key={item._id || idx}
                        className="p-2 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs transition-all hover:bg-slate-100/60"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isContract
                                ? 'bg-emerald-100 text-emerald-600'
                                : isResident
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-purple-100 text-purple-600'
                            }`}
                          >
                            {isContract ? (
                              <BiCheck size={16} />
                            ) : isResident ? (
                              <BiGroup size={15} />
                            ) : (
                              <BiCreditCard size={15} />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 text-truncate">
                              {item.code ? `${item.code} – ` : ''}
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {item.actorName}
                            </div>
                          </div>
                        </div>

                        <span className="shrink-0 text-[11px] text-slate-400">
                          {item.createdAt ? 'Gần đây' : 'Hôm nay'}
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

        {/* CỘT PHẢI (5 CỘT) */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Card Công việc cần xử lý (Có nút navigate và áp dụng trạng thái lọc) */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <BiBell size={18} />
                  </span>
                  <span className="text-sm fw-bold text-slate-800">Công việc cần xử lý</span>
                </div>
                {totalTasks > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                    {totalTasks}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {/* 1. Hóa đơn quá hạn -> navigate tới /invoices?status=PENDING */}
                <Link
                  to="/invoices?status=PENDING"
                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-100/60 hover:border-rose-200 flex items-center justify-between gap-3 text-xs no-underline transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <BiErrorCircle size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 group-hover:text-rose-700 transition-colors">
                        Hóa đơn quá hạn
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
                        {overdueCount > 0 ? (
                          <>
                            {overdueCount} hóa đơn · Còn nợ <MoneyText value={overdueAmount} />
                          </>
                        ) : (
                          'Hiện không có hóa đơn quá hạn'
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {overdueCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                        Khẩn cấp
                      </span>
                    )}
                    <BiChevronRight
                      size={18}
                      className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </Link>

                {/* 2. Sự cố chưa xử lý -> navigate tới /incidents?status=PENDING */}
                <Link
                  to="/incidents?status=PENDING"
                  className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-100/60 hover:border-amber-200 flex items-center justify-between gap-3 text-xs no-underline transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <BiWrench size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
                        Sự cố chưa xử lý
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
                        {openIncidentsCount > 0
                          ? `${openIncidentsCount} sự cố phòng đang chờ kiểm tra`
                          : 'Không có sự cố nào đang chờ xử lý'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {openIncidentsCount > 0 && (
                      <span className="w-5 h-5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-800 flex items-center justify-center">
                        {openIncidentsCount}
                      </span>
                    )}
                    <BiChevronRight
                      size={18}
                      className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
