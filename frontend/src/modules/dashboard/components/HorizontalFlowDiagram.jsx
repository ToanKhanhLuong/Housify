// Thẻ biểu đồ sóng mượt kết hợp sơ đồ ngang có mũi tên ở chân thẻ theo phong cách Nova Residence (UC-07, 47)
import { Fragment, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BiRightArrowAlt } from 'react-icons/bi';
import MoneyText from '../../../components/MoneyText';
import { formatMoney } from '../../../utils/format';

const HorizontalFlowDiagram = ({
  isAdmin,
  data,
  reportData,
  chartData = [],
  chartMode = 'scale',
  onChartModeChange,
  scopeLabel,
}) => {
  const [selectedStep, setSelectedStep] = useState(0);

  const rooms = data?.rooms ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const newContracts = reportData?.contracts?.new ?? 0;
  const endedContracts = reportData?.contracts?.ended ?? 0;
  const overdueCount = isAdmin
    ? (reportData?.latePayments?.length ?? 0)
    : (data?.pendingInvoices?.overdueCount ?? 0);

  const steps = isAdmin
    ? [
        {
          label: 'Quỹ phòng',
          value: `${rooms.total} phòng`,
          sub: `${rooms.occupied} thuê · ${rooms.available} trống`,
          note: `Hệ thống đang khai thác ${rooms.occupied}/${rooms.total} phòng thuộc ${data.buildings} tòa nhà.`,
        },
        {
          label: 'Hợp đồng',
          value: `${data.activeContracts} hiệu lực`,
          sub: `+${newContracts} mới · ${endedContracts} kết thúc`,
          note: `Đang có ${data.activeContracts} hợp đồng hiệu lực, phát sinh ${newContracts} hợp đồng mới trong kỳ.`,
        },
        {
          label: 'Cư dân',
          value: `${data.residents} người`,
          sub: `+${data.movedIn} vào · ${data.movedOut} ra`,
          note: `Tổng cộng ${data.residents} cư dân đang ở và ${data.users} tài khoản hoạt động.`,
        },
        {
          label: 'Vận hành',
          value: `${data.openIncidents} sự cố`,
          sub: `${overdueCount} hóa đơn quá hạn`,
          note: `Có ${data.openIncidents} sự cố chưa xử lý và ${overdueCount} hóa đơn quá hạn cần thu.`,
        },
      ]
    : [
        {
          label: 'Quỹ phòng',
          value: `${rooms.total} phòng`,
          sub: `${rooms.occupied} thuê · ${rooms.available} trống`,
          note: `Tòa nhà đang cho thuê ${rooms.occupied}/${rooms.total} phòng (${rooms.maintenance} bảo trì).`,
        },
        {
          label: 'Hợp đồng',
          value: `+${newContracts} mới`,
          sub: `${data.expiringContracts} sắp hết hạn`,
          note: `Có ${data.expiringContracts} hợp đồng sẽ hết hạn trong 30 ngày tới.`,
        },
        {
          label: 'Chờ thu',
          value: `${data.pendingInvoices?.count ?? 0} hóa đơn`,
          sub: `${overdueCount} hóa đơn quá hạn`,
          note: `Tổng số hóa đơn đang chờ thanh toán trong tòa nhà của bạn.`,
        },
        {
          label: 'Thực thu',
          value: <MoneyText value={data.monthlyRevenue} />,
          sub: `${data.openIncidents} sự cố mở`,
          note: `Doanh thu đã thu trong tháng này và ${data.openIncidents} sự cố phòng cần xử lý.`,
        },
      ];

  const activeStep = steps[selectedStep] ?? steps[0];

  return (
    <Card>
      <Card.Body className="p-4 flex flex-col gap-3">
        {/* Hàng tiêu đề + tag tóm tắt giống thẻ Apartment 52 ở Ảnh 1 */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="h6 fw-bold mb-1">{scopeLabel}</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="hf-badge hf-b-gray">{rooms.total} phòng</span>
              <span className="hf-badge hf-b-plum">{rooms.occupied} đang thuê</span>
              <span className="hf-badge hf-b-ok">{rooms.available} phòng trống</span>
              {rooms.maintenance > 0 && (
                <span className="hf-badge hf-b-warn">{rooms.maintenance} bảo trì</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={chartMode === 'scale' ? 'primary' : 'secondary'}
              className={chartMode === 'scale' ? '' : 'hf-btn-ghost'}
              onClick={() => onChartModeChange?.('scale')}
            >
              Quy mô khai thác
            </Button>
            <Button
              size="sm"
              variant={chartMode === 'revenue' ? 'primary' : 'secondary'}
              className={chartMode === 'revenue' ? '' : 'hf-btn-ghost'}
              onClick={() => onChartModeChange?.('revenue')}
            >
              Doanh thu 6 tháng
            </Button>
          </div>
        </div>

        {/* Biểu đồ sóng mượt (AreaChart) không kẻ lưới rối */}
        <div className="w-full h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(value, name) => {
                  if (chartMode === 'revenue') return [formatMoney(value), 'Doanh thu'];
                  return [
                    value,
                    name === 'primaryValue' ? 'Tổng số phòng / Quy mô' : 'Đang thuê / Cư dân',
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="primaryValue"
                stroke="var(--bs-primary)"
                strokeWidth={2.5}
                fill="var(--bs-primary-bg-subtle)"
                isAnimationActive={false}
              />
              {chartMode === 'scale' && (
                <Area
                  type="monotone"
                  dataKey="secondaryValue"
                  stroke="var(--bs-success)"
                  strokeWidth={2}
                  fill="var(--bs-success-bg-subtle)"
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sơ đồ ngang 4 bước có mũi tên nằm ngay chân biểu đồ giống Ảnh 1 */}
        <div className="border-top pt-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          {steps.map((step, index) => {
            const isSelected = index === selectedStep;
            return (
              <Fragment key={step.label}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedStep(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedStep(index);
                    }
                  }}
                  className={`flex flex-col p-2.5 rounded flex-1 cursor-pointer ${
                    isSelected ? 'bg-body-tertiary' : ''
                  }`}
                >
                  <span className="small text-secondary">{step.label}</span>
                  <span className="fs-5 fw-bold tabular-nums text-body mt-0.5">{step.value}</span>
                  <span className="small text-secondary text-truncate">{step.sub}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center text-secondary shrink-0">
                    <BiRightArrowAlt size={22} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        <div className="small text-secondary">
          <strong className="text-body">{activeStep.label}:</strong> {activeStep.note}
        </div>
      </Card.Body>
    </Card>
  );
};

export default HorizontalFlowDiagram;
