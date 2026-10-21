// Badge trạng thái theo bảng nhãn trong constants/statusLabels.js: nền nhạt, chữ đậm cùng màu
// <StatusBadge map={INVOICE_STATUS_LABEL} value={invoice.status} />
import { Badge } from 'react-bootstrap';

const StatusBadge = ({ map, value }) => {
    const item = map?.[value];
    const variant = item?.variant ?? 'secondary';

    return (
        <Badge
            pill
            bg={`${variant}-subtle`}
            text={`${variant}-emphasis`}
            className={`border border-${variant}-subtle`}
        >
            {item?.label ?? value ?? '—'}
        </Badge>
    );
};

export default StatusBadge;