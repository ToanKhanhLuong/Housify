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
  const [occupant, setOccupant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // hồ sơ khách nằm ở occupants: lấy bản ghi người đại diện trong thành viên phòng mình rồi mở chi tiết
  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadOccupant = useCallback(
    () =>
      authApi
        .getRoomMembers()
        .then((response) => {
          const members = response.data?.items ?? response.data ?? [];
          const me = members.find((member) => member.isRepresentative);
          if (!me) return null;
          return authApi.getOccupant(me._id).then((detail) => setOccupant(detail.data));
        })
        .catch((error) => toast.error(error.message))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    loadOccupant();
  }, [loadOccupant]);

  if (loading) return <Loading />;
  if (!occupant) return <EmptyState message="Không tìm thấy hồ sơ của bạn" />;

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
                {occupant.name}
              </FieldRow>
              <FieldRow label="Số CCCD" required>
                {occupant.cccd}
              </FieldRow>
              <FieldRow label="Ngày sinh" required>
                {formatDate(occupant.dateOfBirth)}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Số điện thoại" required>
                {occupant.phone}
              </FieldRow>
              <FieldRow label="Email" required>
                {occupant.email}
              </FieldRow>
              <FieldRow label="Địa chỉ">{occupant.address || null}</FieldRow>
            </div>
          </div>
          <CccdImages frontUrl={occupant.cccdFrontUrl} backUrl={occupant.cccdBackUrl} />
        </Card.Body>
      </Card>

      {editing && (
        <CustomerProfileModal
          occupant={occupant}
          onHide={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            loadOccupant();
            reloadUser(); // đổi họ tên thì header cập nhật theo
          }}
        />
      )}
    </>
  );
};

export default CustomerProfile;
