// UC-25: tờ giấy chi tiết hợp đồng (chỉ xem), dùng chung cho Manager (/contracts/:id) và Customer (/my-contract)
// Đầu trang: phòng + trạng thái + tòa; hàng 4 số chính (giá thuê, tiền cọc, thời hạn còn bao nhiêu ngày, số người / sức chứa)
// Các mục: Thông tin hợp đồng · Người đại diện (Nháp chỉ có CCCD + email) · Cư dân
import { useState } from 'react';
import { Card, ProgressBar, Table } from 'react-bootstrap';
import { BiCheckShield, BiFile, BiGroup, BiTime, BiUser } from 'react-icons/bi';
import FieldRow from '../../../components/FieldRow';
import MoneyText from '../../../components/MoneyText';
import StatusBadge from '../../../components/StatusBadge';
import { CONTRACT_STATUS, OCCUPANT_STATUS } from '../../../constants/enums';
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  OCCUPANT_STATUS_LABEL,
} from '../../../constants/statusLabels';
import { formatDate, formatDateTime } from '../../../utils/format';
import { initialsOf, monthsOf, termOf } from '../contractFormat';

const SectionTitle = ({ icon: Icon, children }) => (
  <h2 className="h6 fw-bold mb-2 flex items-center gap-2">
    <Icon className="text-secondary" />
    {children}
  </h2>
);

// ô số chính: nhãn nhỏ trên, giá trị to dưới, dòng phụ tùy chọn
const KeyFigure = ({ label, children, sub }) => (
  <div className="rounded border bg-body-tertiary px-3 py-2 flex flex-col gap-1">
    <span className="small text-secondary">{label}</span>
    <span className="fs-5 fw-bold leading-tight">{children}</span>
    {sub}
  </div>
);

const Avatar = ({ name, muted = false, size = 'w-9 h-9 text-xs' }) => (
  <span
    className={`hf-av ${size} ${muted ? 'bg-body-tertiary text-secondary border' : ''}`}
    aria-hidden="true"
  >
    {name ? initialsOf(name) : '?'}
  </span>
);

// onOccupantClick: chỉ Manager truyền (bấm cư dân → trang chi tiết cư dân); Customer không truyền → bảng chỉ xem
const ContractPaper = ({ contract, onOccupantClick }) => {
  const { room, representative } = contract;
  const isDraft = contract.status === CONTRACT_STATUS.DRAFT;
  const months = monthsOf(contract.startDate, contract.endDate);
  // mốc thời gian để tính "còn X ngày" – lấy 1 lần khi mở trang (render phải thuần)
  const [now] = useState(() => Date.now());
  const term = termOf(contract, now);
  const occupants = contract.occupants ?? [];
  const stayed = occupants.filter((occupant) => occupant.status === OCCUPANT_STATUS.STAYED).length;
  const capacity = room?.roomType?.capacity;

  return (
    <Card className="hf-paper">
      {/* định danh: loại hợp đồng, phòng, trạng thái, tòa */}
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

      {/* 4 số chính */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KeyFigure label="Giá thuê / tháng">
          <MoneyText value={contract.rentPrice} />
        </KeyFigure>
        <KeyFigure label="Tiền cọc">
          <MoneyText value={contract.deposit} />
        </KeyFigure>
        <KeyFigure
          label="Thời hạn"
          sub={
            <span className="flex items-center gap-2">
              <ProgressBar now={term.percent} variant={term.variant} className="h-1.5 flex-1" />
              <span className={`small shrink-0 text-${term.variant}-emphasis`}>{term.text}</span>
            </span>
          }
        >
          {months > 0 ? `${months} tháng` : '—'}
        </KeyFigure>
        <KeyFigure label="Số người ở">
          {stayed}
          {capacity ? <span className="fs-6 fw-normal text-secondary"> / {capacity} người</span> : ' người'}
        </KeyFigure>
      </div>

      {/* thông tin hợp đồng */}
      <section>
        <SectionTitle icon={BiFile}>Thông tin hợp đồng</SectionTitle>
        <div className="grid lg:grid-cols-2 column-gap-5">
          <div>
            <FieldRow label="Phòng">
              Phòng {room?.roomNumber} · Tầng {room?.floorNumber}
            </FieldRow>
            <FieldRow label="Loại phòng">
              {room?.roomType ? `${room.roomType.name} · tối đa ${room.roomType.capacity} người` : '—'}
            </FieldRow>
            <FieldRow label="Ngày bắt đầu" required>
              {formatDate(contract.startDate)}
            </FieldRow>
            <FieldRow label="Ngày kết thúc">{formatDate(contract.endDate)}</FieldRow>
          </div>
          <div>
            <FieldRow label="Xác nhận điện tử">
              {contract.activatedAt ? (
                <span className="inline-flex items-center gap-1 text-success-emphasis">
                  <BiCheckShield />
                  Đã xác nhận lúc {formatDateTime(contract.activatedAt)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-secondary">
                  <BiTime />
                  Chờ khách kích hoạt
                </span>
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
      </section>

      {/* người đại diện: Nháp chỉ có CCCD + email Manager nhập; kích hoạt rồi có đủ hồ sơ */}
      <section>
        <SectionTitle icon={BiUser}>Người đại diện</SectionTitle>
        <div className="rounded border px-3 py-3 flex flex-col gap-3">
          <span className="flex items-center gap-3">
            <Avatar name={representative?.name} muted={!representative?.name} size="w-12 h-12 text-base" />
            <span className="flex flex-col">
              <span className={`fs-6 ${representative?.name ? 'fw-bold' : 'text-secondary'}`}>
                {representative?.name || 'Chưa kích hoạt'}
              </span>
              <span className="small text-secondary">
                {isDraft ? 'Khách nhận lời mời qua email, tự điền hồ sơ khi kích hoạt' : 'Người đứng tên hợp đồng'}
              </span>
            </span>
          </span>
          <div className="grid lg:grid-cols-2 column-gap-5">
            <div>
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
        </div>
      </section>

      {/* cư dân */}
      <section>
        <SectionTitle icon={BiGroup}>
          Cư dân <span className="fw-normal text-secondary">({occupants.length})</span>
        </SectionTitle>
        {occupants.length === 0 ? (
          <div className="hf-ph h-20">
            {isDraft ? 'Chưa có cư dân – người đại diện được thêm khi khách kích hoạt.' : 'Chưa có cư dân.'}
          </div>
        ) : (
          <Card>
            <Card.Body className="p-0">
              <Table hover={Boolean(onOccupantClick)} responsive className="align-middle mb-0">
                <thead>
                  <tr>
                    <th className="ps-3">Họ tên</th>
                    <th>CCCD</th>
                    <th>Số điện thoại</th>
                    <th>Ngày sinh</th>
                    <th>Ngày vào ở</th>
                    <th className="pe-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {occupants.map((occupant) => (
                    <tr
                      key={occupant._id}
                      onClick={onOccupantClick ? () => onOccupantClick(occupant) : undefined}
                      className={onOccupantClick ? 'cursor-pointer' : undefined}
                    >
                      <td className="ps-3">
                        <span className="flex items-center gap-2">
                          <Avatar name={occupant.name} muted={!occupant.isRepresentative} />
                          <span className="flex flex-col">
                            <span className="fw-semibold">{occupant.name}</span>
                            <span className="small text-secondary">
                              {occupant.isRepresentative ? 'Đại diện' : occupant.relationship || 'Ở cùng'}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="tabular-nums">{occupant.cccd}</td>
                      <td>{occupant.phone}</td>
                      <td>{formatDate(occupant.dateOfBirth)}</td>
                      <td>{formatDate(occupant.joinDate)}</td>
                      <td className="pe-3">
                        <StatusBadge map={OCCUPANT_STATUS_LABEL} value={occupant.status} />
                        {occupant.exitDate && (
                          <span className="small text-secondary ms-1">{formatDate(occupant.exitDate)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}
      </section>
    </Card>
  );
};

export default ContractPaper;
