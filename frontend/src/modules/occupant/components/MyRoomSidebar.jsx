// Cột phải trang Phòng của tôi (Customer): tóm tắt hợp đồng (giá thuê, thời hạn, thanh còn bao nhiêu ngày),
// thẻ quản lý tòa (gọi điện)
import { Button, Card, ProgressBar } from 'react-bootstrap';
import { BiChevronRight, BiFile, BiPhone } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import FieldRow from '../../../components/FieldRow';
import MoneyText from '../../../components/MoneyText';
import { CONTRACT_TYPE_LABEL } from '../../../constants/statusLabels';
import { formatDate } from '../../../utils/format';
import OccupantAvatar from './OccupantAvatar';

// contract: chi tiết hợp đồng + term { daysLeft, percent } tính sẵn lúc tải (render phải thuần)
const ContractSummary = ({ contract, term }) => (
  <Card>
    <Card.Body className="flex flex-col gap-3 p-4">
      <h2 className="h5 fw-bold mb-0 flex items-center gap-2">
        <BiFile className="text-secondary" />
        Hợp đồng của bạn
      </h2>
      <div>
        <FieldRow label="Loại">
          {CONTRACT_TYPE_LABEL[contract.contractType]?.label ?? '—'}
        </FieldRow>
        <FieldRow label="Giá thuê">
          <span className="fw-semibold">
            <MoneyText value={contract.rentPrice} />
          </span>{' '}
          / tháng
        </FieldRow>
        <FieldRow label="Thời hạn">
          {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
        </FieldRow>
      </div>
      {term && (
        <div className="flex flex-col gap-1">
          <ProgressBar now={term.percent} variant="primary" className="h-2.5" />
          <span className="text-secondary">
            {term.daysLeft > 0 ? `Còn ${term.daysLeft} ngày là hết hạn` : 'Hợp đồng đã tới ngày kết thúc'}
          </span>
        </div>
      )}
      <Button
        as={Link}
        to="/my-contract"
        variant="secondary"
        className="self-start flex items-center gap-1 no-underline"
      >
        Xem hợp đồng
        <BiChevronRight />
      </Button>
    </Card.Body>
  </Card>
);

const MyRoomSidebar = ({ contract, term, manager }) => (
  <div className="flex flex-col gap-4">
    {contract && <ContractSummary contract={contract} term={term} />}

    {manager && (
      <Card>
        <Card.Body className="flex flex-col gap-3 p-4">
          <h2 className="h5 fw-bold mb-0">Quản lý tòa</h2>
          <div className="flex items-center gap-3">
            <OccupantAvatar name={manager.name} isRepresentative size="md" />
            <div className="flex flex-col min-w-0">
              <span className="fs-6 fw-semibold truncate">{manager.name}</span>
              <span className="text-secondary">Liên hệ khi cần thêm / bớt người, báo hỏng</span>
            </div>
          </div>
          {manager.phone && (
            <Button
              as="a"
              href={`tel:${manager.phone}`}
              variant="primary"
              className="self-start flex items-center gap-1 no-underline"
            >
              <BiPhone />
              {manager.phone}
            </Button>
          )}
        </Card.Body>
      </Card>
    )}
  </div>
);

export default MyRoomSidebar;
