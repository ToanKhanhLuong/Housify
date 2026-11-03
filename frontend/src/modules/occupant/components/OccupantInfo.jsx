// UC-30: hồ sơ một cư dân (chỉ xem) – dùng ở trang chi tiết (Manager) và popup thành viên (Customer)
// 3 mục có tiêu đề: Thông tin cá nhân · Cư trú · Ảnh CCCD (link có ký tạm thời BE trả kèm cccdFrontUrl / cccdBackUrl)
import { Image } from 'react-bootstrap';
import { BiCalendar, BiIdCard, BiImage, BiUser } from 'react-icons/bi';
import FieldRow from '../../../components/FieldRow';
import StatusBadge from '../../../components/StatusBadge';
import { OCCUPANT_STATUS_LABEL } from '../../../constants/statusLabels';
import { formatDate } from '../../../utils/format';

const SectionTitle = ({ icon: Icon, children }) => (
  <h2 className="h6 fw-bold mb-2 flex items-center gap-2">
    <Icon className="text-secondary" />
    {children}
  </h2>
);

const CccdImage = ({ url, label }) => (
  <figure className="mb-0 flex flex-col gap-1">
    <figcaption className="small fw-semibold">{label}</figcaption>
    {url ? (
      <a href={url} target="_blank" rel="noreferrer" title="Mở ảnh cỡ lớn">
        <Image src={url} alt={label} className="h-40 w-full object-contain rounded border bg-body-tertiary" />
      </a>
    ) : (
      <div className="hf-ph h-40">
        <BiImage size={28} />
        Chưa có ảnh
      </div>
    )}
  </figure>
);

const OccupantInfo = ({ occupant }) => (
  <div className="flex flex-col gap-4">
    <div className="grid lg:grid-cols-2 gap-x-5 gap-y-4">
      <section>
        <SectionTitle icon={BiUser}>Thông tin cá nhân</SectionTitle>
        <FieldRow label="Họ tên" required>
          {occupant.name}
        </FieldRow>
        <FieldRow label="Số CCCD" required>
          <span className="tabular-nums">{occupant.cccd}</span>
        </FieldRow>
        <FieldRow label="Số điện thoại" required>
          {occupant.phone}
        </FieldRow>
        {occupant.isRepresentative && <FieldRow label="Email">{occupant.email || '—'}</FieldRow>}
        <FieldRow label="Ngày sinh">{formatDate(occupant.dateOfBirth)}</FieldRow>
        <FieldRow label="Địa chỉ">{occupant.address || '—'}</FieldRow>
      </section>
      <section>
        <SectionTitle icon={BiCalendar}>Cư trú</SectionTitle>
        <FieldRow label="Vai trò">{occupant.roleLabel}</FieldRow>
        {!occupant.isRepresentative && (
          <FieldRow label="Quan hệ với đại diện">{occupant.relationship || '—'}</FieldRow>
        )}
        <FieldRow label="Trạng thái">
          <StatusBadge map={OCCUPANT_STATUS_LABEL} value={occupant.status} />
        </FieldRow>
        <FieldRow label="Ngày vào ở">{formatDate(occupant.joinDate)}</FieldRow>
        {occupant.exitDate && <FieldRow label="Ngày chuyển ra">{formatDate(occupant.exitDate)}</FieldRow>}
      </section>
    </div>

    <section>
      <SectionTitle icon={BiIdCard}>Ảnh CCCD</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-3">
        <CccdImage url={occupant.cccdFrontUrl} label="Mặt trước" />
        <CccdImage url={occupant.cccdBackUrl} label="Mặt sau" />
      </div>
    </section>
  </div>
);

export default OccupantInfo;
