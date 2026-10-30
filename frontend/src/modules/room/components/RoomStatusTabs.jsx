// UC-19: tab trạng thái phòng có số đếm (Tất cả · Trống · Đang thuê · Bảo trì), bấm một lần là lọc
// counts tính từ các phòng đang hiện theo bộ lọc khác, nên con số luôn khớp với bảng bên dưới
// children: nằm cuối hàng tab bên phải (số phòng, xóa bộ lọc) – chỉ hiện từ màn tablet trở lên
import { Nav } from 'react-bootstrap';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';

const ALL = 'all'; // khóa của tab "Tất cả" (khóa rỗng bị Nav bỏ qua)

const TABS = [
  { value: '', label: 'Tất cả' },
  ...[ROOM_STATUS.AVAILABLE, ROOM_STATUS.OCCUPIED, ROOM_STATUS.MAINTENANCE].map((status) => ({
    value: status,
    label: ROOM_STATUS_LABEL[status].label,
  })),
];

const RoomStatusTabs = ({ value, counts, onChange, children }) => (
  <div className="flex items-center gap-3 border-bottom mb-3">
    {/* tab cuộn ngang trong hàng của nó trên điện thoại, không làm trang cuộn ngang */}
    <div className="min-w-0 flex-1 overflow-x-auto">
      <Nav
        variant="underline"
        className="flex-nowrap"
        activeKey={value || ALL}
        onSelect={(key) => onChange(key === ALL ? '' : key)}
      >
        {TABS.map((tab) => {
          const isActive = (value || ALL) === (tab.value || ALL);
          return (
            <Nav.Item key={tab.value || ALL}>
              {/* tab chưa chọn chữ xám, tab đang chọn chữ đậm + gạch chân: màu không nằm trên khung */}
              <Nav.Link
                eventKey={tab.value || ALL}
                className={`flex items-center gap-2 whitespace-nowrap ${isActive ? '' : 'text-secondary'}`}
              >
                {tab.label}
                <span className="small text-secondary tabular-nums">{counts[tab.value] ?? 0}</span>
              </Nav.Link>
            </Nav.Item>
          );
        })}
      </Nav>
    </div>
    {children && <div className="hidden md:flex items-center gap-2 flex-none">{children}</div>}
  </div>
);

export default RoomStatusTabs;
