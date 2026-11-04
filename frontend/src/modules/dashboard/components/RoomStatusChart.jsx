// Biểu đồ tròn phòng theo trạng thái (Trống / Đang thuê / Bảo trì), giữa vòng là tổng số phòng; bên phải là chú thích số lượng
// Màu lấy biến Bootstrap, cùng màu nhãn trạng thái phòng
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';

const SLICES = [
  { key: 'available', status: ROOM_STATUS.AVAILABLE, color: 'var(--bs-success)' },
  { key: 'occupied', status: ROOM_STATUS.OCCUPIED, color: 'var(--bs-primary)' },
  { key: 'maintenance', status: ROOM_STATUS.MAINTENANCE, color: 'var(--bs-warning)' },
];

const RoomStatusChart = ({ rooms }) => {
  if (!rooms?.total) {
    return <div className="hf-ph h-40">Không có dữ liệu</div>;
  }

  const data = SLICES.map((slice) => ({ ...slice, value: rooms[slice.key] ?? 0 }));

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative w-44 h-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={1}
              isAnimationActive={false}
            >
              {data.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="fs-3 fw-bold leading-tight tabular-nums">{rooms.total}</span>
          <span className="small text-secondary">phòng</span>
        </span>
      </div>
      <ul className="list-unstyled mb-0 flex flex-col gap-2 flex-1 min-w-32">
        {data.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2">
            <svg width="10" height="10" aria-hidden="true" className="shrink-0">
              <circle cx="5" cy="5" r="5" fill={slice.color} />
            </svg>
            <span className="flex-1">{ROOM_STATUS_LABEL[slice.status].label}</span>
            <span className="fw-semibold tabular-nums">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RoomStatusChart;
