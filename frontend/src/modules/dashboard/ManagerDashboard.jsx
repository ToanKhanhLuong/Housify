// UC-47: Tổng quan điều hành thực tế cho Manager
// Hiển thị toàn diện: Tỷ lệ lấp đầy phòng, Nhân khẩu cư dân (Đang ở / Mới vào / Đã chuyển đi), Tiến độ thu tài chính,
// Công việc cần xử lý (Hóa đơn quá hạn, Hợp đồng sắp hết hạn, Chờ hoàn cọc, Sự cố, Đơn thỏa thuận chờ khách xác nhận)
// và Lối tắt thao tác nhanh. Trang VẬN HÀNH: không chọn kỳ (phân tích theo kỳ ở /reports)
import { useEffect, useState } from 'react';
import { Button, Card, ProgressBar } from 'react-bootstrap';
import {
  BiBell,
  BiBroadcast,
  BiBuilding,
  BiCalendarExclamation,
  BiCheck,
  BiCreditCard,
  BiDoorOpen,
  BiErrorCircle,
  BiFile,
  BiGroup,
  BiPlus,
  BiReceipt,
  BiTimeFive,
  BiUserCheck,
  BiUserMinus,
  BiUserPlus,
  BiWallet,
  BiWrench,
} from 'react-icons/bi';
import { Link } from 'react-router-dom';
import MoneyText from '../../components/MoneyText';
import { useAuth } from '../../context/AuthContext';
import { TERMINATION_STATUS, TERMINATION_TYPE } from '../../constants/enums';
import { formatDateTime } from '../../utils/format';
import dashboardApi from './dashboard.api';
import TaskRow from './components/TaskRow';

const ManagerDashboard = ({ data }) => {
  const { user } = useAuth();

  const rooms = data?.rooms ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const occupancyRate = rooms.total > 0 ? Math.round((rooms.occupied / rooms.total) * 100) : 0;
  const availableRate = rooms.total > 0 ? Math.round((rooms.available / rooms.total) * 100) : 0;
  const maintenanceRate = rooms.total > 0 ? Math.max(0, 100 - occupancyRate - availableRate) : 0;

  const residents = data?.residents ?? 0;
  const movedIn = data?.movedIn ?? 0;
  const movedOut = data?.movedOut ?? 0;
  const totalLeft = data?.totalLeft ?? 0;

  const activeContracts = data?.activeContracts ?? 0;
  const draftContracts = data?.draftContracts ?? 0;
  const expiringContracts = data?.expiringContracts ?? 0;
  const pendingRefundContracts = data?.pendingRefundContracts ?? 0;

  const monthlyRevenue = data?.monthlyRevenue ?? 0;
  const pendingCount = data?.pendingInvoices?.count ?? 0;
  const pendingAmount = data?.pendingInvoices?.totalAmount ?? 0;
  const overdueCount = data?.pendingInvoices?.overdueCount ?? 0;
  const overdueAmount = data?.pendingInvoices?.overdueAmount ?? 0;
  const openIncidentsCount = data?.openIncidents ?? 0;

  const totalExpectedMonth = monthlyRevenue + pendingAmount;
  const collectionRate =
    totalExpectedMonth > 0 ? Math.round((monthlyRevenue / totalExpectedMonth) * 100) : 100;

  // UC-28: đơn thỏa thuận đã gửi, đang chờ người đại diện xác nhận (quá 7 ngày tự xác nhận) – lỗi thì để null
  const [pendingMutual, setPendingMutual] = useState(null);

  useEffect(() => {
    dashboardApi
      .terminations({ type: TERMINATION_TYPE.MUTUAL, status: TERMINATION_STATUS.PENDING, page: 1, limit: 1 })
      .then((response) => setPendingMutual(response.data.total))
      .catch(() => setPendingMutual(null));
  }, []);

  const totalTasks =
    overdueCount + openIncidentsCount + expiringContracts + pendingRefundContracts + (pendingMutual ?? 0);

  const buildingName = data?.buildingOverview?.name || 'Tòa nhà phụ trách';
  const recentActivities = Array.isArray(data?.recentActivities) ? data.recentActivities : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Tiêu đề & Thanh lối tắt thao tác nhanh */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="h5 fw-bold mb-0 text-slate-800">Tổng quan điều hành</h1>
          <span className="text-xs text-slate-500">
            Chào mừng bạn trở lại, {user.name || 'Quản lý tòa nhà'} 👋 · {buildingName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            as={Link}
            to="/contracts/new"
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5 no-underline"
          >
            <BiPlus size={16} /> Tạo hợp đồng
          </Button>
          <Button
            as={Link}
            to="/invoices/new"
            variant="secondary"
            size="sm"
            className="flex items-center gap-1.5 no-underline"
          >
            <BiReceipt size={15} /> Lập hóa đơn
          </Button>
          <Button
            as={Link}
            to="/announcements"
            variant="secondary"
            size="sm"
            className="flex items-center gap-1.5 no-underline"
          >
            <BiBroadcast size={15} /> Gửi thông báo
          </Button>
        </div>
      </div>

      {/* 5 Thẻ KPI cốt lõi trên cùng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Phòng & Lấp đầy */}
        <Link
          to="/my-building"
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 no-underline hover:border-slate-300 transition-colors"
        >
          <span className="hf-av w-10 h-10 shrink-0">
            <BiDoorOpen size={20} />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-medium block">Công suất phòng</span>
            <div className="flex items-baseline gap-1.5 leading-tight">
              <span className="text-xl fw-bold text-slate-800">{occupancyRate}%</span>
              <span className="text-xs text-slate-600">lấp đầy</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              {rooms.occupied}/{rooms.total} đang thuê · {rooms.available} trống
            </div>
          </div>
        </Link>

        {/* Card 2: Nhân khẩu cư dân */}
        <Link
          to="/occupants"
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 no-underline hover:border-slate-300 transition-colors"
        >
          <span className="hf-av w-10 h-10 shrink-0">
            <BiGroup size={20} />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-medium block">Cư dân lưu trú</span>
            <div className="flex items-baseline gap-1.5 leading-tight">
              <span className="text-xl fw-bold text-slate-800">{residents}</span>
              <span className="text-xs text-slate-600">đang ở</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              +{movedIn} mới · {totalLeft} đã rời đi
            </div>
          </div>
        </Link>

        {/* Card 3: Tài chính tháng */}
        <Link
          to="/payments"
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 no-underline hover:border-slate-300 transition-colors"
        >
          <span className="hf-av w-10 h-10 shrink-0">
            <BiWallet size={20} />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-medium block">
              Thực thu tháng ({collectionRate}%)
            </span>
            <div className="text-xl fw-bold text-slate-800 leading-tight text-truncate">
              <MoneyText value={monthlyRevenue} />
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              {pendingAmount > 0 ? (
                <>
                  Chờ thu: <MoneyText value={pendingAmount} /> ({pendingCount} HĐ)
                </>
              ) : (
                'Đã thu đủ hóa đơn tháng'
              )}
            </div>
          </div>
        </Link>

        {/* Card 4: Hóa đơn quá hạn */}
        <Link
          to="/invoices?status=PENDING"
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 no-underline hover:border-slate-300 transition-colors"
        >
          <span className="hf-av w-10 h-10 shrink-0">
            <BiReceipt size={20} />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-medium block">Công nợ quá hạn</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {overdueCount} hóa đơn
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              {overdueCount > 0 ? (
                <>
                  Quá hạn · <MoneyText value={overdueAmount} />
                </>
              ) : (
                'Không có nợ quá hạn'
              )}
            </div>
          </div>
        </Link>

        {/* Card 5: Vận hành & Sự cố */}
        <Link
          to="/incidents"
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 no-underline hover:border-slate-300 transition-colors"
        >
          <span className="hf-av w-10 h-10 shrink-0">
            <BiWrench size={20} />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-medium block">Sự cố & Hợp đồng</span>
            <div className="text-xl fw-bold text-slate-800 leading-tight">
              {openIncidentsCount} sự cố
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">
              {activeContracts} HĐ hiệu lực · {expiringContracts} sắp hết hạn
            </div>
          </div>
        </Link>
      </div>

      {/* 2 Khối chính: Trái 7 cột (~60%) | Phải 5 cột (~40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* CỘT TRÁI (7 CỘT) */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          {/* Card Tình hình cơ sở & Biến động nhân khẩu */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="hf-av w-8 h-8 shrink-0">
                    <BiBuilding size={18} />
                  </span>
                  <span className="text-sm fw-bold text-slate-800">
                    Tình hình cơ sở & Nhân khẩu cư dân
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                  {buildingName}
                </span>
              </div>

              {/* Segmented Progress Bar nhiều đoạn */}
              <div>
                <ProgressBar className="h-3 mb-2.5">
                  <ProgressBar variant="primary" now={occupancyRate} title={`Đang thuê: ${occupancyRate}%`} />
                  <ProgressBar variant="success" now={availableRate} title={`Trống: ${availableRate}%`} />
                  <ProgressBar variant="warning" now={maintenanceRate} title={`Bảo trì: ${maintenanceRate}%`} />
                </ProgressBar>

                {/* Legend thống kê chi tiết theo % */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                    <span className="text-slate-600">
                      <strong className="text-slate-800">{rooms.occupied}</strong> đang thuê ({occupancyRate}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
                    <span className="text-slate-600">
                      <strong className="text-slate-800">{rooms.available}</strong> trống ({availableRate}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-warning shrink-0" />
                    <span className="text-slate-600">
                      <strong className="text-slate-800">{rooms.maintenance}</strong> bảo trì ({maintenanceRate}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Ô thống kê biến động Cư dân & Hợp đồng */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                <Link
                  to="/occupants"
                  className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col gap-0.5 no-underline hover:bg-slate-100/80 transition-colors"
                >
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <BiUserCheck className="text-slate-600" size={14} /> Đang cư trú
                  </span>
                  <span className="text-base fw-bold text-slate-800">{residents} người</span>
                  <span className="text-[10px] text-slate-400">Trong {rooms.occupied} phòng</span>
                </Link>

                <Link
                  to="/occupants"
                  className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col gap-0.5 no-underline hover:bg-slate-100/80 transition-colors"
                >
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <BiUserPlus className="text-slate-600" size={14} /> Mới vào tháng này
                  </span>
                  <span className="text-base fw-bold text-slate-800">+{movedIn} người</span>
                  <span className="text-[10px] text-slate-400">Cư dân chuyển đến</span>
                </Link>

                <Link
                  to="/occupants"
                  className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col gap-0.5 no-underline hover:bg-slate-100/80 transition-colors"
                >
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <BiUserMinus className="text-slate-600" size={14} /> Đã rời đi
                  </span>
                  <span className="text-base fw-bold text-slate-800">{totalLeft} người</span>
                  <span className="text-[10px] text-slate-400">Tháng này: {movedOut} người</span>
                </Link>

                <Link
                  to="/contracts"
                  className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col gap-0.5 no-underline hover:bg-slate-100/80 transition-colors"
                >
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <BiFile className="text-slate-600" size={14} /> Hợp đồng
                  </span>
                  <span className="text-base fw-bold text-slate-800">{activeContracts} hiệu lực</span>
                  <span className="text-[10px] text-slate-400">
                    {draftContracts > 0 ? `${draftContracts} bản nháp chờ ký` : 'Không có bản nháp'}
                  </span>
                </Link>
              </div>
            </Card.Body>
          </Card>

          {/* Card Hoạt động gần đây (Dạng cuộn dọc vuốt xuống scrollable mượt mà) */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="hf-av w-8 h-8 shrink-0">
                  <BiTimeFive size={18} />
                </span>
                <span className="text-sm fw-bold text-slate-800">Hoạt động gần đây</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  ({recentActivities.length} ghi nhận)
                </span>
              </div>

              {/* Danh sách các item cuộn dọc */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
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
                          <span className="hf-av w-7 h-7 text-xs shrink-0">
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
                          {item.createdAt ? formatDateTime(item.createdAt) : 'Gần đây'}
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
          {/* Card Công việc cần xử lý */}
          <Card className="border-slate-100 shadow-xs rounded-2xl">
            <Card.Body className="p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="hf-av w-8 h-8 shrink-0">
                    <BiBell size={18} />
                  </span>
                  <span className="text-sm fw-bold text-slate-800">Công việc cần xử lý</span>
                </div>
                {totalTasks > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                    {totalTasks} việc
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <TaskRow
                  to="/invoices?status=PENDING"
                  icon={BiErrorCircle}
                  iconClass="bg-rose-50 text-rose-600"
                  title="Hóa đơn quá hạn"
                  description={
                    overdueCount > 0 ? (
                      <>
                        {overdueCount} hóa đơn · Còn nợ <MoneyText value={overdueAmount} />
                      </>
                    ) : (
                      'Hiện không có hóa đơn quá hạn'
                    )
                  }
                  badge={overdueCount > 0 && 'Khẩn cấp'}
                  badgeTone="red"
                />

                <TaskRow
                  to="/incidents?status=PENDING"
                  icon={BiWrench}
                  iconClass="bg-amber-50 text-amber-600"
                  title="Sự cố chưa xử lý"
                  description={
                    openIncidentsCount > 0
                      ? `${openIncidentsCount} sự cố phòng đang chờ kiểm tra`
                      : 'Không có sự cố nào đang chờ xử lý'
                  }
                  badge={openIncidentsCount > 0 && `${openIncidentsCount} sự cố`}
                  badgeTone="warn"
                />

                <TaskRow
                  to="/contracts?status=ACTIVE"
                  icon={BiCalendarExclamation}
                  iconClass="bg-primary-subtle text-primary"
                  title="Hợp đồng sắp hết hạn (30 ngày tới)"
                  description={
                    expiringContracts > 0
                      ? `${expiringContracts} hợp đồng cần liên hệ gia hạn hoặc tìm khách mới`
                      : 'Không có hợp đồng nào sắp hết hạn trong 30 ngày'
                  }
                  badge={expiringContracts > 0 && `${expiringContracts} phòng`}
                  badgeTone="plum"
                />

                {/* UC-28: khách chưa xác nhận thì Manager nhắc khách; quá 7 ngày hệ thống tự xác nhận */}
                <TaskRow
                  to={`/terminations?type=${TERMINATION_TYPE.MUTUAL}`}
                  icon={BiTimeFive}
                  iconClass="bg-slate-100 text-slate-700"
                  title="Đơn thỏa thuận chờ khách xác nhận"
                  description={
                    pendingMutual === null
                      ? 'Bấm để mở danh sách đơn chấm dứt'
                      : pendingMutual > 0
                        ? `${pendingMutual} đơn đang chờ người đại diện xác nhận điện tử`
                        : 'Không có đơn nào đang chờ khách xác nhận'
                  }
                  badge={pendingMutual > 0 && `${pendingMutual} đơn`}
                  badgeTone="gray"
                />

                <TaskRow
                  to="/contracts?status=ENDED"
                  icon={BiWallet}
                  iconClass="bg-slate-100 text-slate-700"
                  title="Quyết toán & Hoàn trả tiền cọc"
                  description={
                    pendingRefundContracts > 0
                      ? `${pendingRefundContracts} hợp đồng hết hạn đang chờ hoàn trả tiền cọc`
                      : 'Tất cả hợp đồng hết hạn đã được quyết toán cọc'
                  }
                  badge={pendingRefundContracts > 0 && `${pendingRefundContracts} chờ hoàn`}
                  badgeTone="warn"
                />
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
