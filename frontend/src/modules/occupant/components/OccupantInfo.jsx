// UC-30: hồ sơ một cư dân (chỉ xem) – dùng ở trang chi tiết (Manager) và popup thành viên (Customer)
// Ảnh CCCD xem bằng link có ký tạm thời BE trả kèm (cccdFrontUrl / cccdBackUrl), không lưu link
import { Image } from 'react-bootstrap';
import { BiImage } from 'react-icons/bi';
import FieldRow from '../../../components/FieldRow';
import StatusBadge from '../../../components/StatusBadge';
import { OCCUPANT_STATUS_LABEL } from '../../../constants/statusLabels';
import { formatDate } from '../../../utils/format';

const CccdImage = ({ url, label }) => (
  <figure className="mb-0 flex flex-col gap-1">
    <figcaption className="small fw-semibold">{label}</figcaption>
    {url ? (
      <a href={url} target="_blank" rel="noreferrer" title="Mở ảnh cỡ lớn">
        <Image src={url} alt={label} className="h-40 w-full object-contain rounded border bg-body-tertiary" />
      </a>
    ) : (
      <div className="h-40 flex flex-col items-center justify-center gap-1 rounded border bg-body-tertiary text-secondary small">
        <BiImage size={28} />
        Chưa có ảnh
      </div>
    )}
  </figure>
);

const OccupantInfo = ({ occupant }) => (
  <div className="flex flex-col gap-3">
    <div className="grid lg:grid-cols-2 column-gap-5">
      <div>
        <FieldRow label="Họ tên" required>
          {occupant.name}
        </FieldRow>
        <FieldRow label="Số CCCD" required>
          {occupant.cccd}
        </FieldRow>
        <FieldRow label="Số điện thoại" required>
          {occupant.phone}
        </FieldRow>
        {occupant.isRepresentative && <FieldRow label="Email">{occupant.email || '—'}</FieldRow>}
        <FieldRow label="Ngày sinh">{formatDate(occupant.dateOfBirth)}</FieldRow>
        <FieldRow label="Địa chỉ">{occupant.address || '—'}</FieldRow>
      </div>
      <div>
        <FieldRow label="Vai trò">{occupant.roleLabel}</FieldRow>
        {!occupant.isRepresentative && (
          <FieldRow label="Quan hệ với đại diện">{occupant.relationship || '—'}</FieldRow>
        )}
        <FieldRow label="Trạng thái">
          <StatusBadge map={OCCUPANT_STATUS_LABEL} value={occupant.status} />
        </FieldRow>
        <FieldRow label="Ngày vào ở">{formatDate(occupant.joinDate)}</FieldRow>
        {occupant.exitDate && <FieldRow label="Ngày chuyển ra">{formatDate(occupant.exitDate)}</FieldRow>}
      </div>
    </div>

    <section>
      <h2 className="h6 fw-bold mb-2">Ảnh CCCD</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <CccdImage url={occupant.cccdFrontUrl} label="Mặt trước" />
        <CccdImage url={occupant.cccdBackUrl} label="Mặt sau" />
      </div>
    </section>
  </div>
);

export default OccupantInfo;
