// UC-25: tờ giấy chi tiết hợp đồng (chỉ xem), dùng chung cho Manager (/contracts/:id) và Customer (/my-contract)
// Phòng (tầng, loại, sức chứa, tòa), người đại diện (Nháp chỉ có CCCD + email), ngày, giá, cọc, ghi chú, danh sách cư dân
import { Card } from 'react-bootstrap';
import DataTable from '../../../components/DataTable';
import FieldRow from '../../../components/FieldRow';
import MoneyText from '../../../components/MoneyText';
import StatusBadge from '../../../components/StatusBadge';
import { CONTRACT_STATUS, OCCUPANT_STATUS } from '../../../constants/enums';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../../constants/statusLabels';
import { formatDate, formatDateTime } from '../../../utils/format';
import { monthsOf } from '../contractFormat';

const occupantColumns = [
  { key: 'name', title: 'Họ tên', className: 'fw-medium' },
  {
    key: 'role',
    title: 'Vai trò',
    render: (row) => (row.isRepresentative ? 'Đại diện' : 'Ở cùng'),
  },
  { key: 'cccd', title: 'CCCD' },
  { key: 'phone', title: 'Số điện thoại' },
  { key: 'dateOfBirth', title: 'Ngày sinh', render: (row) => formatDate(row.dateOfBirth) },
  { key: 'joinDate', title: 'Ngày vào ở', render: (row) => formatDate(row.joinDate) },
  {
    key: 'status',
    title: 'Trạng thái',
    render: (row) =>
      row.status === OCCUPANT_STATUS.STAYED ? (
        <span className="text-success-emphasis">Đang ở</span>
      ) : (
        <span className="text-secondary">
          Đã chuyển đi {row.exitDate ? formatDate(row.exitDate) : ''}
        </span>
      ),
  },
];

// onOccupantClick: chỉ Manager truyền (bấm cư dân → trang chi tiết cư dân); Customer không truyền → bảng chỉ xem
const ContractPaper = ({ contract, onOccupantClick }) => {
  const { room, representative } = contract;
  const isDraft = contract.status === CONTRACT_STATUS.DRAFT;
  const months = monthsOf(contract.startDate, contract.endDate);

  return (
    <Card className="hf-paper">
      {/* định danh: loại hợp đồng, phòng, trạng thái */}
      <div className="flex flex-col gap-1">
        <span className="small text-secondary">
          Hợp đồng thuê phòng · {CONTRACT_TYPE_LABEL[contract.contractType]?.label ?? '—'}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <h1 className="h3 fw-bold mb-0">Phòng {room?.roomNumber ?? '—'}</h1>
          <StatusBadge map={CONTRACT_STATUS_LABEL} value={contract.status} />
        </span>
        {room?.building && (
          <span className="text-secondary">
            {room.building.name} · {room.building.address}
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 column-gap-5">
        <div>
          <FieldRow label="Phòng">
            Phòng {room?.roomNumber} · Tầng {room?.floorNumber}
          </FieldRow>
          <FieldRow label="Loại phòng">
            {room?.roomType
              ? `${room.roomType.name} · tối đa ${room.roomType.capacity} người`
              : '—'}
          </FieldRow>
          <FieldRow label="Giá thuê" required>
            <span className="fw-semibold">
              <MoneyText value={contract.rentPrice} />
            </span>{' '}
            / tháng
          </FieldRow>
          <FieldRow label="Tiền cọc" required>
            <MoneyText value={contract.deposit} />
          </FieldRow>
        </div>
        <div>
          <FieldRow label="Ngày bắt đầu" required>
            {formatDate(contract.startDate)}
          </FieldRow>
          <FieldRow label="Ngày kết thúc">
            {formatDate(contract.endDate)}{' '}
            {months > 0 && <span className="text-secondary">({months} tháng)</span>}
          </FieldRow>
          <FieldRow label="Xác nhận điện tử">
            {contract.activatedAt ? (
              <span className="text-success-emphasis">
                Đã xác nhận lúc {formatDateTime(contract.activatedAt)}
              </span>
            ) : (
              <span className="text-secondary">Chờ khách kích hoạt</span>
            )}
          </FieldRow>
          <FieldRow label="Ghi chú">
            {contract.notes ? (
              <span className="whitespace-pre-line">{contract.notes}</span>
            ) : (
              <span className="text-secondary">Không có</span>
            )}
          </FieldRow>
        </div>
      </div>

      {/* người đại diện: Nháp chỉ có CCCD + email Manager nhập; kích hoạt rồi có đủ hồ sơ */}
      <section className="flex flex-col gap-1">
        <h2 className="h6 fw-bold mb-1">Người đại diện</h2>
        <div className="grid lg:grid-cols-2 column-gap-5">
          <div>
            <FieldRow label="Họ tên">
              {representative?.name || <span className="text-secondary">Chưa kích hoạt</span>}
            </FieldRow>
            <FieldRow label="Số CCCD" required>
              {representative?.cccd}
            </FieldRow>
            <FieldRow label="Email" required>
              {representative?.email}
            </FieldRow>
          </div>
          {!isDraft && (
            <div>
              <FieldRow label="Số điện thoại">{representative?.phone || '—'}</FieldRow>
              <FieldRow label="Ngày sinh">{formatDate(representative?.dateOfBirth)}</FieldRow>
              <FieldRow label="Địa chỉ">{representative?.address || '—'}</FieldRow>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="h6 fw-bold mb-0">
          Cư dân{' '}
          <span className="fw-normal text-secondary">({contract.occupants?.length ?? 0})</span>
        </h2>
        <DataTable
          columns={occupantColumns}
          data={contract.occupants ?? []}
          onRowClick={onOccupantClick}
          emptyMessage={
            isDraft
              ? 'Chưa có cư dân – người đại diện được thêm khi khách kích hoạt.'
              : 'Chưa có cư dân.'
          }
        />
      </section>
    </Card>
  );
};

export default ContractPaper;
