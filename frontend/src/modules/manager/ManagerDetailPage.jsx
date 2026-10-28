// UC-09..11: chi tiết Manager (Admin). Nút theo trạng thái:
// Chưa kích hoạt: gửi lại link, xóa · Đang hoạt động: sửa, khóa, phân công / gỡ phân công tòa · Bị khóa: sửa, mở khóa
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import StatusSteps from '../../components/StatusSteps';
import FieldRow from '../../components/FieldRow';
import ConfirmModal from '../../components/ConfirmModal';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import { USER_STATUS } from '../../constants/enums';
import { USER_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate, formatDateTime } from '../../utils/format';
import managerApi from './manager.api';
import CccdImages from './components/CccdImages';
import ManagerEditModal from './components/ManagerEditModal';
import LockManagerModal from './components/LockManagerModal';
import AssignBuildingModal from './components/AssignBuildingModal';

// luồng chính: tạo → kích hoạt; Bị khóa nằm ngoài luồng, StatusSteps tự hiện ở cuối
const STEPS = [USER_STATUS.PENDING, USER_STATUS.ACTIVE];

const ManagerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'edit' | 'lock' | 'assign'
  const [confirming, setConfirming] = useState(null); // 'resend' | 'remove' | 'unlock' | 'unassign'
  const [submitting, setSubmitting] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadManager = useCallback(
    () =>
      managerApi
        .detail(id)
        .then((response) => setManager(response.data))
        .catch((error) => toast.error(error.message))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    loadManager();
  }, [loadManager]);

  if (loading) return <Loading />;
  if (!manager) return <EmptyState message="Không tìm thấy Manager" />;

  const { status, building } = manager;
  const isPending = status === USER_STATUS.PENDING;
  const isActive = status === USER_STATUS.ACTIVE;
  const isLocked = status === USER_STATUS.LOCKED;

  // các thao tác chỉ cần hỏi xác nhận, dùng chung 1 ConfirmModal
  const CONFIRM = {
    resend: {
      title: 'Gửi lại link kích hoạt',
      message: `Gửi link kích hoạt mới tới ${manager.email}? Link cũ sẽ hết hiệu lực ngay.`,
      confirmText: 'Gửi lại',
      variant: 'primary',
      run: () => managerApi.resendActivation(manager._id),
      success: 'Đã gửi lại link kích hoạt',
    },
    remove: {
      title: 'Xóa tài khoản Manager',
      message: `Xóa hẳn tài khoản của ${manager.name}? Link kích hoạt đã gửi cũng không dùng được nữa.`,
      confirmText: 'Xóa',
      variant: 'danger',
      run: () => managerApi.remove(manager._id),
      success: 'Đã xóa tài khoản Manager',
    },
    unlock: {
      title: 'Mở khóa tài khoản Manager',
      message: `Mở khóa tài khoản của ${manager.name}? Manager đăng nhập lại được và nhận email báo.`,
      confirmText: 'Mở khóa',
      variant: 'primary',
      run: () => managerApi.unlock(manager._id),
      success: 'Đã mở khóa tài khoản Manager',
    },
    unassign: {
      title: 'Gỡ phân công',
      message: `Gỡ ${manager.name} khỏi ${building?.name}? Tòa sẽ chưa có người phụ trách.`,
      confirmText: 'Gỡ phân công',
      variant: 'danger',
      run: () => managerApi.assignBuilding(building?._id, { managerId: null }),
      success: 'Đã gỡ phân công',
    },
  };
  const action = confirming && CONFIRM[confirming];

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const response = await action.run();
      // việc chính xong nhưng gửi mail lỗi → cảnh báo (api.md)
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success(action.success);
      setConfirming(null);
      if (confirming === 'remove') navigate('/managers', { replace: true });
      else loadManager();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => setModal(null);
  const handleModalDone = () => {
    setModal(null);
    loadManager();
  };

  return (
    <>
      <PageHeader
        backTo="/managers"
        actions={
          <>
            {isPending && (
              <Button variant="primary" onClick={() => setConfirming('resend')}>
                Gửi lại link kích hoạt
              </Button>
            )}
            {isPending && (
              <Button variant="secondary" onClick={() => setConfirming('remove')}>
                Xóa tài khoản
              </Button>
            )}
            {/* UC-11: chỉ Manager đang hoạt động, chưa có tòa mới được phân công */}
            {isActive && !building && (
              <Button variant="primary" onClick={() => setModal('assign')}>
                Phân công tòa
              </Button>
            )}
            {isLocked && (
              <Button variant="primary" onClick={() => setConfirming('unlock')}>
                Mở khóa
              </Button>
            )}
            {(isActive || isLocked) && (
              <Button variant="secondary" onClick={() => setModal('edit')}>
                Chỉnh sửa
              </Button>
            )}
            {isActive && building && (
              <Button variant="secondary" onClick={() => setConfirming('unassign')}>
                Gỡ phân công
              </Button>
            )}
            {isActive && (
              <Button variant="secondary" onClick={() => setModal('lock')}>
                Khóa
              </Button>
            )}
          </>
        }
      >
        <StatusSteps map={USER_STATUS_LABEL} steps={STEPS} current={status} />
      </PageHeader>

      <Card>
        <Card.Body className="p-4">
          <div className="small text-secondary">Tài khoản Manager</div>
          <h2 className="h3 fw-semibold mb-4">{manager.name}</h2>

          <div className="grid lg:grid-cols-2 column-gap-5 mb-4">
            <div>
              <FieldRow label="Email" required>
                {manager.email}
              </FieldRow>
              <FieldRow label="Số điện thoại" required>
                {manager.phone}
              </FieldRow>
              <FieldRow label="Tòa phụ trách">
                {building?.name ?? <span className="text-secondary">Chưa phân công</span>}
              </FieldRow>
              {/* UC-09: số hợp đồng đang hiệu lực của tòa (BE trả trong building), để Admin cân nhắc trước khi khóa */}
              {building && (
                <FieldRow label="Hợp đồng đang hiệu lực">{building.activeContractCount}</FieldRow>
              )}
            </div>
            <div>
              <FieldRow label="Ngày sinh">{formatDate(manager.dateOfBirth)}</FieldRow>
              <FieldRow label="Địa chỉ">{manager.address || null}</FieldRow>
              <FieldRow label="Ngày tạo">{formatDateTime(manager.createdAt)}</FieldRow>
            </div>
          </div>

          <CccdImages frontUrl={manager.cccdFrontUrl} backUrl={manager.cccdBackUrl} />
        </Card.Body>
      </Card>

      {modal === 'edit' && (
        <ManagerEditModal manager={manager} onHide={closeModal} onSaved={handleModalDone} />
      )}
      {modal === 'lock' && (
        <LockManagerModal manager={manager} onHide={closeModal} onDone={handleModalDone} />
      )}
      {modal === 'assign' && (
        <AssignBuildingModal manager={manager} onHide={closeModal} onDone={handleModalDone} />
      )}

      <ConfirmModal
        show={Boolean(action)}
        title={action?.title}
        message={action?.message}
        confirmText={action?.confirmText}
        variant={action?.variant}
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
};

export default ManagerDetailPage;
