// Hiện trạng thái / loại bằng Badge, nhãn + màu lấy từ statusLabels.js
// Ví dụ: <StatusBadge group="ROOM_STATUS" value={room.status} />
import { Badge } from 'react-bootstrap';
import { getStatusLabel } from '../../constants/statusLabels.js';

const DARK_TEXT_BG = ['warning', 'info', 'light'];

export default function StatusBadge({ group, value }) {
  const { label, bg } = getStatusLabel(group, value);
  return (
    <Badge bg={bg} text={DARK_TEXT_BG.includes(bg) ? 'dark' : undefined} className="fw-medium">
      {label}
    </Badge>
  );
}
