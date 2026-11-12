// UC-25: tab "Văn bản hợp đồng" – hợp đồng hiện dạng trang giấy A4 như lúc gửi cho khách kích hoạt (ContractDocument chung)
// Dựng dữ liệu từ GET /contracts/:id + nội quy tòa (GET /buildings/:id/rules). Bên A = contract.manager
//   (Manager tạo hợp đồng, có ngày sinh + địa chỉ, giống văn bản khách xác nhận ở UC-06). Có nút In / Lưu PDF
import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { BiPrinter } from 'react-icons/bi';
import ContractDocument from '../../../components/ContractDocument';
import { useAuth } from '../../../context/AuthContext';
import { OCCUPANT_STATUS, ROLE } from '../../../constants/enums';
import contractApi from '../contract.api';

// đổi dữ liệu GET /contracts/:id sang dạng ContractDocument cần
const toDocument = (contract, rules, manager) => ({
  building: { ...(contract.room?.building ?? {}), rules },
  room: {
    roomNumber: contract.room?.roomNumber,
    floorNumber: contract.room?.floorNumber,
    roomTypeName: contract.room?.roomType?.name ?? '',
    capacity: contract.room?.roomType?.capacity ?? null,
  },
  manager,
  contractType: contract.contractType,
  createdAt: contract.createdAt,
  startDate: contract.startDate,
  endDate: contract.endDate,
  rentPrice: contract.rentPrice,
  deposit: contract.deposit,
  notes: contract.notes ?? '',
  representativeEmail: contract.representative?.email,
  representativeCccd: contract.representative?.cccd,
  // người ở cùng còn đang ở (đại diện in ở mục Bên B)
  coOccupants: (contract.occupants ?? []).filter(
    (person) => !person.isRepresentative && person.status === OCCUPANT_STATUS.STAYED,
  ),
});

const ContractDocumentTab = ({ contract }) => {
  const { user } = useAuth();
  const [rules, setRules] = useState('');
  const buildingId = contract.room?.building?._id;

  // nội quy là mục 3 của hợp đồng; lỗi tải thì vẫn hiện văn bản ("chưa ban hành nội quy")
  useEffect(() => {
    if (!buildingId) return;
    contractApi
      .buildingRules(buildingId)
      .then((response) => setRules(response.data?.rules ?? ''))
      .catch(() => setRules(''));
  }, [buildingId]);

  // BE chưa trả manager (bản cũ) thì dùng cách cũ: Manager xem → chính mình, Customer xem → Manager của tòa
  const manager =
    contract.manager ??
    (user.role === ROLE.MANAGER
      ? { name: user.name, phone: user.phone }
      : (user.building?.manager ?? null));

  const representative = contract.representative ?? {};
  // Bên B: đã kích hoạt thì có hồ sơ; Nháp thì để "……" như mẫu giấy
  const party = {
    name: representative.name,
    dateOfBirth: representative.dateOfBirth,
    phone: representative.phone,
    address: representative.address,
  };
  const confirmation = contract.activatedAt
    ? { name: representative.name ?? '', activatedAt: contract.activatedAt }
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <span className="small text-secondary">
          Văn bản hợp đồng dựng từ dữ liệu hiện tại (ghi chú, ngày kết thúc sau gia hạn…). In hoặc
          lưu PDF để gửi khách.
        </span>
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => window.print()}
        >
          <BiPrinter />
          In / Lưu PDF
        </Button>
      </div>
      {/* khổ giấy rộng tối đa 1152px (gấp rưỡi 768px), căn giữa; khi in bỏ giới hạn để dùng đủ khổ giấy */}
      <div className="w-full max-w-6xl mx-auto print:max-w-none">
        <ContractDocument
          contract={toDocument(contract, rules, manager)}
          party={party}
          confirmation={confirmation}
        />
      </div>
    </div>
  );
};

export default ContractDocumentTab;
