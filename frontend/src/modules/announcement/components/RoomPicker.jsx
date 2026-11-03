// Chọn phòng nhận thông báo (UC-40): chỉ phòng Đang thuê (có hợp đồng hiệu lực), xếp theo tầng
// Mỗi phòng một ô bấm bật / tắt (ô vuông tích giống bộ lọc ControlBar), nút Chọn tất cả / Bỏ chọn
import { Button } from 'react-bootstrap';
import { BiCheck } from 'react-icons/bi';

const RoomPicker = ({ rooms, selected, onChange, disabled }) => {
  const floors = [...new Set(rooms.map((room) => room.floorNumber))].sort((a, b) => a - b);
  const toggle = (roomId) =>
    onChange(selected.includes(roomId) ? selected.filter((id) => id !== roomId) : [...selected, roomId]);
  const allSelected = rooms.length > 0 && selected.length === rooms.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 small">
        <span className="text-secondary">
          Đã chọn <b className="text-body">{selected.length}</b> / {rooms.length} phòng đang thuê
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="hf-btn-ghost"
          disabled={disabled}
          onClick={() => onChange(allSelected ? [] : rooms.map((room) => room._id))}
        >
          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </Button>
      </div>

      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pe-1">
        {floors.map((floor) => (
          <div key={floor} className="flex items-start gap-3">
            <span className="w-14 shrink-0 pt-1.5 small fw-semibold text-secondary">Tầng {floor}</span>
            <div className="flex flex-wrap gap-2">
              {rooms
                .filter((room) => room.floorNumber === floor)
                .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true }))
                .map((room) => {
                  const checked = selected.includes(room._id);
                  return (
                    <Button
                      key={room._id}
                      variant="secondary"
                      size="sm"
                      disabled={disabled}
                      aria-pressed={checked}
                      onClick={() => toggle(room._id)}
                      className={`flex items-center gap-2 ${checked ? 'border-primary bg-primary-subtle' : ''}`}
                    >
                      <span className={`hf-box ${checked ? 'hf-box-on' : ''}`}>
                        {checked && <BiCheck size={14} />}
                      </span>
                      <span className="fw-semibold">{room.roomNumber}</span>
                      <span className="text-secondary">{room.occupantCount ?? 0} người</span>
                    </Button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomPicker;
