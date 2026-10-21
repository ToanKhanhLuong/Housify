// Nội dung một thông báo: chấm xanh + chữ đậm nếu chưa đọc, loại, thời gian (UC-41). compact: dạng gọn trong chuông
import StatusBadge from '../common/StatusBadge.jsx';
import { formatDateTime } from '../../utils/format.js';

export default function NotificationItem({ notification, compact = false }) {
  const { title, message, type, isRead, createdAt } = notification;

  return (
    <div className="flex gap-2 text-start">
      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${isRead ? 'bg-transparent' : 'bg-primary'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={isRead ? '' : 'font-semibold'}>{title}</span>
          {!compact && <StatusBadge group="NOTIFICATION_TYPE" value={type} />}
        </div>
        <div className={`line-clamp-2 text-gray-600 ${compact ? 'text-sm' : ''}`}>{message}</div>
        <div className="mt-1 text-xs text-gray-400">{formatDateTime(createdAt)}</div>
      </div>
    </div>
  );
}
