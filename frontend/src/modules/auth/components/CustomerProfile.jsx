// UC-05: hồ sơ Customer (người đại diện). Họ tên, số CCCD chỉ xem (Manager sửa ở UC-31); email, SĐT, ngày sinh, địa chỉ, ảnh CCCD tự sửa
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiEditAlt } from 'react-icons/bi';
import { toast } from 'react-toastify';
import PageHeader from '../../../components/PageHeader';
import FieldRow from '../../../components/FieldRow';
import Loading from '../../../components/Loading';
import EmptyState from '../../../components/EmptyState';
import { ROLE } from '../../../constants/enums';
import { ROLE_LABEL } from '../../../constants/statusLabels';
import { formatDate } from '../../../utils/format';
import authApi from '../auth.api';
import CccdImages from './CccdImages';
import CustomerProfileModal from './CustomerProfileModal';

// chữ cái đầu của tên gọi, giống avatar trên Header: "Nguyễn Văn Hưng" → "H"
const initialOf = (name = '') => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? '?';

// dòng thông tin trang xem: nhãn nhạt, giá trị đậm để nổi bật thông tin (FieldRow dùng chung giữ nguyên, chỉ truyền class)
const InfoRow = ({ label, children }) => (
  <FieldRow label={<span className="fw-normal text-secondary">{label}</span>}>
    <span className="fw-medium text-body-emphasis">{children ?? '—'}</span>
  </FieldRow>
);

const CustomerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // GET /profile: BE tự lấy bản ghi người đại diện mới nhất của khách (hồ sơ nằm ở occupants)
  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadProfile = useCallback(
    () =>
      authApi
        .getProfile()
        .then((response) => setProfile(response.data))
        .catch((error) => toast.error(error.message))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) return <Loading />;
  if (!profile) return <EmptyState message="Không tìm thấy hồ sơ của bạn" />;

  return (
    // gom nội dung vào khung rộng tối đa ~1230px (88rem, chữ gốc 14px; màn 1920px còn trống ~200px mỗi bên) cho gọn trên màn hình rộng
    <div className="max-w-[88rem] mx-auto">
      <PageHeader
        title="Hồ sơ cá nhân"
        subtitle="Quản lý thông tin cá nhân và hình ảnh giấy tờ của bạn."
      />

      {/* thẻ danh tính; nút Chỉnh sửa đặt bên phải theo thiết kế (lệch quy định nút bên trái, nhóm đã cân nhắc) */}
      <Card className="mb-3">
        <Card.Body className="p-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center justify-center w-14 h-14 rounded-circle bg-primary-subtle text-primary-emphasis fs-4 fw-semibold">
            {initialOf(profile.name)}
          </span>
          <div className="min-w-0">
            <div className="h4 fw-semibold mb-1">{profile.name}</div>
            <div className="flex items-center gap-2">
              <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
                {ROLE_LABEL[ROLE.CUSTOMER]}
              </span>
              <span className="small text-secondary">Người đại diện phòng</span>
            </div>
          </div>
          <Button
            variant="primary"
            className="ms-auto flex items-center gap-2"
            onClick={() => setEditing(true)}
          >
            <BiEditAlt />
            Chỉnh sửa
          </Button>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Body className="p-4">
          <h2 className="h6 fw-semibold mb-3">Thông tin cá nhân</h2>
          {/* lưới 2 cột xếp theo cặp hàng; dấu * chỉ hiện ở form chỉnh sửa */}
          <div className="grid lg:grid-cols-2 column-gap-5">
            <InfoRow label="Họ tên">{profile.name}</InfoRow>
            <InfoRow label="Số CCCD">{profile.cccd}</InfoRow>
            <InfoRow label="Email">{profile.email}</InfoRow>
            <InfoRow label="Số điện thoại">{profile.phone}</InfoRow>
            <InfoRow label="Ngày sinh">{formatDate(profile.dateOfBirth)}</InfoRow>
            <InfoRow label="Địa chỉ">{profile.address || null}</InfoRow>
          </div>
        </Card.Body>
      </Card>

      <CccdImages frontUrl={profile.cccdFrontUrl} backUrl={profile.cccdBackUrl} />

      {editing && (
        <CustomerProfileModal
          profile={profile}
          onHide={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            loadProfile();
          }}
        />
      )}
    </div>
  );
};

export default CustomerProfile;
