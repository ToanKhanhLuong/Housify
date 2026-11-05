// Biểu đồ tròn trạng thái phòng kết hợp lưới 2x2 chỉ số nhanh theo phong cách Home Desk (UC-07, 47)
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';

const SLICES = [
  { key: 'occupied', status: ROOM_STATUS.OCCUPIED, color: 'var(--bs-primary)' },
  { key: 'available', status: ROOM_STATUS.AVAILABLE, color: 'var(--bs-success)' },
  { key: 'maintenance', status: ROOM_STATUS.MAINTENANCE, color: 'var(--bs-warning)' },
];

const RoomStatusChart = ({ rooms, openIncidents = 0 }) => {
  if (!rooms?.total) {
    return <div className="hf-ph h-36">Không có dữ liệu phòng</div>;
  }

  const data = SLICES.map((slice) => ({
    ...slice,
    value: rooms[slice.key] ?? 0,
  }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="relative w-32 h-32 shrink-0 mx-auto sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="fs-4 fw-bold leading-tight tabular-nums">{rooms.total}</span>
          <span className="small text-secondary">phòng</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1 min-w-40">
        <div className="flex flex-col">
          <span className="fs-5 fw-bold tabular-nums leading-tight">{rooms.occupied ?? 0}</span>
          <span className="small text-secondary flex items-center gap-1.5 mt-0.5">
            <span className="hf-dot hf-dot-plum" />
            {ROOM_STATUS_LABEL[ROOM_STATUS.OCCUPIED].label}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="fs-5 fw-bold tabular-nums leading-tight">{rooms.available ?? 0}</span>
          <span className="small text-secondary flex items-center gap-1.5 mt-0.5">
            <span className="hf-dot hf-dot-ok" />
            {ROOM_STATUS_LABEL[ROOM_STATUS.AVAILABLE].label}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="fs-5 fw-bold tabular-nums leading-tight">{rooms.maintenance ?? 0}</span>
          <span className="small text-secondary flex items-center gap-1.5 mt-0.5">
            <span className="hf-dot hf-dot-warn" />
            {ROOM_STATUS_LABEL[ROOM_STATUS.MAINTENANCE].label}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="fs-5 fw-bold tabular-nums leading-tight">{openIncidents}</span>
          <span className="small text-secondary flex items-center gap-1.5 mt-0.5">
            <span className="hf-dot hf-dot-red" />
            Sự cố mở
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoomStatusChart;
