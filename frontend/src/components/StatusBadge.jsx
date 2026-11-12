// Badge trạng thái theo bảng nhãn trong constants/statusLabels.js: nền nhạt, chữ đậm cùng màu
// <StatusBadge map={INVOICE_STATUS_LABEL} value={invoice.status} />
// Bảng nhãn có icon (vd TERMINATION_TYPE_LABEL) thì icon hiện trước chữ
import { Badge } from 'react-bootstrap';

const StatusBadge = ({ map, value }) => {
    const item = map?.[value];
    const variant = item?.variant ?? 'secondary';
    const Icon = item?.icon;

    return (
        <Badge
            pill
            bg={`${variant}-subtle`}
            text={`${variant}-emphasis`}
            className={`border border-${variant}-subtle ${Icon ? 'inline-flex items-center gap-1' : ''}`}
        >
            {Icon && <Icon aria-hidden="true" />}
            {item?.label ?? value ?? '—'}
        </Badge>
    );
};

export default StatusBadge;