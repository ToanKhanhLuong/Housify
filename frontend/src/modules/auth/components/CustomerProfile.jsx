// Hồ sơ Customer (người đại diện, UC-31): xem và sửa thông tin của mình. CCCD chỉ xem (nhóm chốt)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import PageHeader from '../../../components/PageHeader';
import FieldRow from '../../../components/FieldRow';
import Loading from '../../../components/Loading';
import EmptyState from '../../../components/EmptyState';
import { useAuth } from '../../../context/AuthContext';
import { formatDate } from '../../../utils/format';
import authApi from '../auth.api';
import CccdImages from './CccdImages';
import CustomerProfileModal from './CustomerProfileModal';

const CustomerProfile = () => {
  const { reloadUser } = useAuth();
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
    <>
      <PageHeader
        title="Hồ sơ cá nhân"
        actions={
          <Button variant="primary" onClick={() => setEditing(true)}>
            Cập nhật hồ sơ
          </Button>
        }
      />

      <Card>
        <Card.Body className="p-4">
          {/* UC-31: CCCD và ngày sinh là trường quan trọng → dấu * đỏ */}
          <div className="grid lg:grid-cols-2 column-gap-5 mb-4">
            <div>
              <FieldRow label="Họ tên" required>
                {profile.name}
              </FieldRow>
              <FieldRow label="Số CCCD" required>
                {profile.cccd}
              </FieldRow>
              <FieldRow label="Ngày sinh" required>
                {formatDate(profile.dateOfBirth)}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Số điện thoại" required>
                {profile.phone}
              </FieldRow>
              <FieldRow label="Email" required>
                {profile.email}
              </FieldRow>
              <FieldRow label="Địa chỉ">{profile.address || null}</FieldRow>
            </div>
          </div>
          <CccdImages frontUrl={profile.cccdFrontUrl} backUrl={profile.cccdBackUrl} />
        </Card.Body>
      </Card>

      {editing && (
        <CustomerProfileModal
          profile={profile}
          onHide={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            loadProfile();
            reloadUser(); // đổi họ tên thì header cập nhật theo
          }}
        />
      )}
    </>
  );
};

export default CustomerProfile;
