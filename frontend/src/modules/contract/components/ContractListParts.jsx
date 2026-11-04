// Các mảnh hiển thị của danh sách hợp đồng (UC-25): người đại diện có avatar, thanh thời hạn, thẻ hợp đồng
import { ProgressBar } from 'react-bootstrap';
import { BiGroup } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import MoneyText from '../../../components/MoneyText';
import StatusBadge from '../../../components/StatusBadge';
import { CONTRACT_STATUS } from '../../../constants/enums';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../../constants/statusLabels';
import { formatDate } from '../../../utils/format';
import { initialsOf, termOf } from '../contractFormat';

// người đại diện: avatar + họ tên; chưa kích hoạt (chưa có họ tên) thì hiện email, avatar xám
export const Representative = ({ contract }) => {
  const rep = contract.representative ?? {};
  const activated = Boolean(rep.name);
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span
        className={`hf-av w-9 h-9 text-xs ${activated ? '' : 'bg-body-tertiary text-secondary border'}`}
        aria-hidden="true"
      >
        {activated ? initialsOf(rep.name) : '?'}
      </span>
      <span className="flex flex-col min-w-0">
        <span className={`truncate ${activated ? 'fw-semibold' : 'text-secondary'}`}>
          {rep.name || rep.email || '—'}
        </span>
        <span className="small text-secondary truncate">
          {activated
            ? rep.phone || rep.email
            : contract.status === CONTRACT_STATUS.DRAFT
              ? 'Chờ kích hoạt'
              : 'Chưa có hồ sơ'}
        </span>
      </span>
    </span>
  );
};

// thời hạn: ngày bắt đầu → kết thúc, thanh tiến độ, nhãn còn bao nhiêu ngày (vàng khi ≤ 30 ngày)
export const Term = ({ contract, now }) => {
  const term = termOf(contract, now);
  return (
    <span className="flex flex-col gap-1 min-w-40">
      <span className="small">
        {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
      </span>
      <ProgressBar now={term.percent} variant={term.variant} className="h-1.5" />
      <span className={`small text-${term.variant}-emphasis`}>{term.text}</span>
    </span>
  );
};

// thẻ hợp đồng (chế độ Thẻ): phòng + trạng thái, người đại diện, giá thuê, thời hạn, loại + số người
export const ContractCard = ({ contract, now }) => (
  <Link to={`/contracts/${contract._id}`} className="hf-tcard no-underline gap-3">
    <span className="flex items-start justify-between gap-2">
      <span className="flex flex-col">
        <span className="fs-5 fw-bold leading-tight">Phòng {contract.room?.roomNumber ?? '—'}</span>
        <span className="small text-secondary">
          {CONTRACT_TYPE_LABEL[contract.contractType]?.label ?? 'Hợp đồng'} · Tầng {contract.room?.floorNumber ?? '—'}
        </span>
      </span>
      <StatusBadge map={CONTRACT_STATUS_LABEL} value={contract.status} />
    </span>
    <Representative contract={contract} />
    <span className="fs-6 fw-bold">
      <MoneyText value={contract.rentPrice} />
      <span className="small fw-normal text-secondary"> / tháng</span>
    </span>
    <Term contract={contract} now={now} />
    <span className="flex items-center gap-1 small text-secondary pt-2 border-top mt-auto">
      <BiGroup />
      {contract.occupantCount ?? 0} người đang ở
    </span>
  </Link>
);
