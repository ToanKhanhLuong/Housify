// UC-05: hồ sơ Manager. Họ tên, email, SĐT chỉ xem; địa chỉ, ngày sinh, ảnh CCCD điền một lần rồi khóa (sửa sau nhờ Admin, UC-09)
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import PageHeader from '../../../components/PageHeader';
import FieldRow from '../../../components/FieldRow';
import Loading from '../../../components/Loading';
import EmptyState from '../../../components/EmptyState';
import { formatDate } from '../../../utils/format';
import authApi from '../auth.api';
import CccdImages from './CccdImages';
import ManagerProfileModal from './ManagerProfileModal';

// các trường Manager tự điền một lần (BR-011); không có ô số CCCD (UC-05)
const FILL_ONCE_FIELDS = ['dateOfBirth', 'address', 'cccdFrontImage', 'cccdBackImage'];

const ManagerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback, không chạy đồng bộ trong useEffect
  // (luật react-hooks/set-state-in-effect)
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
  if (!profile) return <EmptyState message="Không tải được hồ sơ" />;

  const emptyFields = FILL_ONCE_FIELDS.filter((field) => !profile[field]);

  return (
    <>
      <PageHeader
        title="Hồ sơ cá nhân"
        actions={
          emptyFields.length > 0 && (
            <Button variant="primary" onClick={() => setEditing(true)}>
              Cập nhật hồ sơ
            </Button>
          )
        }
      />

      {emptyFields.length === 0 && (
        <Alert variant="info">Muốn thay đổi thông tin hồ sơ, vui lòng liên hệ Admin.</Alert>
      )}

      <Card>
        <Card.Body className="p-4">
          <div className="grid lg:grid-cols-2 column-gap-5 mb-4">
            <div>
              <FieldRow label="Họ tên" required>
                {profile.name}
              </FieldRow>
              <FieldRow label="Email" required>
                {profile.email}
              </FieldRow>
              <FieldRow label="Số điện thoại" required>
                {profile.phone}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Ngày sinh">{formatDate(profile.dateOfBirth)}</FieldRow>
              <FieldRow label="Địa chỉ">{profile.address || null}</FieldRow>
            </div>
          </div>
          <CccdImages frontUrl={profile.cccdFrontUrl} backUrl={profile.cccdBackUrl} />
        </Card.Body>
      </Card>

      {/* render có điều kiện: mỗi lần mở là form mới */}
      {editing && (
        <ManagerProfileModal
          emptyFields={emptyFields}
          onHide={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            loadProfile();
          }}
        />
      )}
    </>
  );
};

export default ManagerProfile;
