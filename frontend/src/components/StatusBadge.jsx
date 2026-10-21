// Badge trạng thái theo bảng nhãn trong constants/statusLabels.js
// <StatusBadge map={INVOICE_STATUS_LABEL} value={invoice.status} />
import { Badge } from 'react-bootstrap';

const DARK_TEXT = ['warning', 'info', 'light']; // nền sáng thì chữ tối cho dễ đọc

const StatusBadge = ({ map, value }) => {
    const item = map?.[value];
    if (!item) return <Badge bg="secondary">{value ?? '—'}</Badge>;

    return (
        <Badge bg={item.variant} text={DARK_TEXT.includes(item.variant) ? 'dark' : undefined}>
            {item.label}
        </Badge>
    );
};

export default StatusBadge;