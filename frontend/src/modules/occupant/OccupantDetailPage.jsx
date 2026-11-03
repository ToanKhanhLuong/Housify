// UC-30: chi tiết cư dân (Manager, /occupants/:id) – hồ sơ, ảnh CCCD, phòng và hợp đồng đang thuộc về
// Nút: Sửa thông tin (UC-31, hợp đồng Nháp / Đang hiệu lực); Cho rời phòng (UC-33, chỉ người ở cùng đang ở, hợp đồng Đang hiệu lực)
// Người đại diện không rời phòng theo luồng này – phải chấm dứt hợp đồng
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Placeholder } from 'react-bootstrap';
import { BiEditAlt, BiLogOut } from 'react-icons/bi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FieldRow from '../../components/FieldRow';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { CONTRACT_STATUS, OCCUPANT_STATUS } from '../../constants/enums';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import occupantApi from './occupant.api';
import EditOccupantModal from './components/EditOccupantModal';
import LeaveOccupantModal from './components/LeaveOccupantModal';
import OccupantInfo from './components/OccupantInfo';

const OccupantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', occupant: null, error: '' });
  const [modal, setModal] = useState(null); // 'edit' | 'leave'

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadOccupant = useCallback(
    () =>
      occupantApi
        .detail(id)
        .then((response) => setState({ status: 'ok', occupant: response.data, error: '' }))
        .catch((error) =>
          setState({
            status: error.status === 404 || error.status === 403 ? 'notFound' : 'error',
            occupant: null,
            error: error.message,
          }),
        ),
    [id],
  );

  useEffect(() => {
    loadOccupant();
  }, [loadOccupant]);

  const handleRetry = () => {
    setState({ status: 'loading', occupant: null, error: '' });
    loadOccupant();
  };
  const afterSaved = () => {
    setModal(null);
    loadOccupant();
  };

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải cư dân">
        <Placeholder as="div" className="mb-3">
          <Placeholder className="w-64 h-6 rounded bg-body-tertiary" />
        </Placeholder>
        <Card>
          <Card.Body>
            <SkeletonRows rows={6} columns={4} />
          </Card.Body>
        </Card>
      </div>
    );
  }
  if (state.status === 'notFound') {
    return (
      <EmptyState message={state.error || 'Không tìm thấy cư dân'}>
        <Button variant="secondary" onClick={() => navigate('/occupants')}>
          Về danh sách cư dân
        </Button>
      </EmptyState>
    );
  }
  if (state.status === 'error') {
    return <ErrorState message="Không tải được cư dân" detail={state.error} onRetry={handleRetry} />;
  }

  const { occupant } = state;
  const { room, contract } = occupant;
  const contractStatus = contract?.status;
  // BE: Manager sửa được cư dân của hợp đồng Nháp / Đang hiệu lực
  const canEdit =
    contractStatus === CONTRACT_STATUS.DRAFT || contractStatus === CONTRACT_STATUS.ACTIVE;
  const canLeave =
    !occupant.isRepresentative &&
    occupant.status === OCCUPANT_STATUS.STAYED &&
    contractStatus === CONTRACT_STATUS.ACTIVE;

  const actions = (
    <>
      {canEdit && (
        <Button
          variant="primary"
          className="flex items-center gap-2"
          onClick={() => setModal('edit')}
        >
          <BiEditAlt />
          Sửa thông tin
        </Button>
      )}
      {canLeave && (
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => setModal('leave')}
        >
          <BiLogOut />
          Cho rời phòng
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        backTo="/occupants"
        breadcrumbs={[{ label: 'Cư dân', to: '/occupants' }, occupant.name]}
        actions={actions}
      />

      <Card className="hf-paper">
        <div className="flex flex-col gap-1">
          <span className="small text-secondary">
            {occupant.roleLabel} · Phòng {room?.roomNumber ?? '—'}
          </span>
          <h1 className="h3 fw-bold mb-0">{occupant.name}</h1>
          {occupant.isRepresentative && occupant.status === OCCUPANT_STATUS.STAYED && (
            <span className="small text-secondary">
              Người đại diện có tài khoản đăng nhập bằng số CCCD. Muốn cho người đại diện rời phòng
              thì chấm dứt hợp đồng.
            </span>
          )}
        </div>

        <OccupantInfo occupant={occupant} />

        <section className="flex flex-col gap-1">
          <h2 className="h6 fw-bold mb-1">Phòng và hợp đồng</h2>
          <div className="grid lg:grid-cols-2 column-gap-5">
            <div>
              <FieldRow label="Phòng">
                {room ? `Phòng ${room.roomNumber} · Tầng ${room.floorNumber}` : '—'}
              </FieldRow>
              <FieldRow label="Tòa nhà">{room?.building?.name ?? '—'}</FieldRow>
            </div>
            <div>
              <FieldRow label="Hợp đồng">
                {contract ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Link to={`/contracts/${contract._id}`}>
                      {CONTRACT_TYPE_LABEL[contract.contractType]?.label ?? 'Hợp đồng'}
                    </Link>
                    <StatusBadge map={CONTRACT_STATUS_LABEL} value={contract.status} />
                  </span>
                ) : (
                  '—'
                )}
              </FieldRow>
              <FieldRow label="Thời hạn">
                {contract
                  ? `${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`
                  : '—'}
              </FieldRow>
            </div>
          </div>
        </section>
      </Card>

      {modal === 'edit' && (
        <EditOccupantModal occupant={occupant} onHide={() => setModal(null)} onSaved={afterSaved} />
      )}
      {modal === 'leave' && (
        <LeaveOccupantModal occupant={occupant} onHide={() => setModal(null)} onSaved={afterSaved} />
      )}
    </>
  );
};

export default OccupantDetailPage;
