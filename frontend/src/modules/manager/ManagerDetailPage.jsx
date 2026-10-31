// UC-09..11: chi tiết Manager (Admin). Nút theo trạng thái:
// Chưa kích hoạt: gửi lại link, xóa · Đang hoạt động: sửa, khóa, phân công / gỡ phân công tòa · Bị khóa: sửa, mở khóa
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import {
  BiBuildings,
  BiCake,
  BiEditAlt,
  BiEnvelope,
  BiFile,
  BiLockAlt,
  BiLockOpenAlt,
  BiMap,
  BiPhone,
  BiSend,
  BiTime,
  BiTrash,
  BiUnlink,
  BiUser,
} from 'react-icons/bi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import StatusSteps from '../../components/StatusSteps';
import FieldRow from '../../components/FieldRow';
import ConfirmModal from '../../components/ConfirmModal';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import StatusBadge from '../../components/StatusBadge';
import { ROLE, USER_STATUS } from '../../constants/enums';
import { ROLE_LABEL, USER_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate, formatDateTime } from '../../utils/format';
import managerApi from './manager.api';
import CccdImages from './components/CccdImages';
import ManagerAvatar from './components/ManagerAvatar';
import ManagerEditModal from './components/ManagerEditModal';
import LockManagerModal from './components/LockManagerModal';
import AssignBuildingModal from './components/AssignBuildingModal';

// luồng chính: tạo → kích hoạt; Bị khóa nằm ngoài luồng, StatusSteps tự hiện ở cuối
const STEPS = [USER_STATUS.PENDING, USER_STATUS.ACTIVE];

// dòng thông tin: icon đơn sắc + nhãn nhạt, giá trị đậm (giống trang hồ sơ); FieldRow dùng chung giữ nguyên, chỉ truyền class
// inline-flex để dấu * đỏ của FieldRow vẫn đứng ngay sau nhãn
const InfoRow = ({ icon: Icon, label, required = false, children }) => (
  <FieldRow
    label={
      <span className="inline-flex items-center gap-2 fw-normal text-secondary">
        <Icon />
        {label}
      </span>
    }
    required={required}
  >
    <span className="fw-medium text-body-emphasis">{children ?? '—'}</span>
  </FieldRow>
);

// nút thao tác có icon đứng trước chữ (theo Figma)
const IconButton = ({ icon: Icon, children, ...props }) => (
  <Button className="flex items-center gap-2" {...props}>
    <Icon />
    {children}
  </Button>
);

const ManagerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(''); // tải lỗi: hiện ErrorState có nút Thử lại
  const [modal, setModal] = useState(null); // 'edit' | 'lock' | 'assign'
  const [confirming, setConfirming] = useState(null); // 'resend' | 'remove' | 'unlock' | 'unassign'
  const [submitting, setSubmitting] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadManager = useCallback(
    () =>
      managerApi
        .detail(id)
        .then((response) => {
          setManager(response.data);
          setLoadError('');
        })
        .catch((error) => setLoadError(error.message))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    loadManager();
  }, [loadManager]);

  // Thử lại sau khi tải lỗi: hiện lại vòng xoay rồi gọi API
  const handleRetry = () => {
    setLoading(true);
    loadManager();
  };

  if (loading) return <Loading />;
  // 404 "Không tìm thấy Manager" hay lỗi mạng đều hiện câu BE trả kèm nút Thử lại
  if (loadError || !manager)
    return (
      <ErrorState
        message="Không tải được thông tin Manager"
        detail={loadError}
        onRetry={handleRetry}
      />
    );

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
        breadcrumbs={[{ label: 'Quản lý Manager', to: '/managers' }, manager.name]}
        actions={
          <>
            {isPending && (
              <IconButton icon={BiSend} variant="primary" onClick={() => setConfirming('resend')}>
                Gửi lại link kích hoạt
              </IconButton>
            )}
            {isPending && (
              <IconButton
                icon={BiTrash}
                variant="secondary"
                onClick={() => setConfirming('remove')}
              >
                Xóa tài khoản
              </IconButton>
            )}
            {/* UC-11: chỉ Manager đang hoạt động, chưa có tòa mới được phân công */}
            {isActive && !building && (
              <IconButton icon={BiBuildings} variant="primary" onClick={() => setModal('assign')}>
                Phân công tòa
              </IconButton>
            )}
            {isLocked && (
              <IconButton
                icon={BiLockOpenAlt}
                variant="primary"
                onClick={() => setConfirming('unlock')}
              >
                Mở khóa
              </IconButton>
            )}
            {(isActive || isLocked) && (
              <IconButton icon={BiEditAlt} variant="secondary" onClick={() => setModal('edit')}>
                Chỉnh sửa
              </IconButton>
            )}
            {isActive && building && (
              <IconButton
                icon={BiUnlink}
                variant="secondary"
                onClick={() => setConfirming('unassign')}
              >
                Gỡ phân công
              </IconButton>
            )}
            {isActive && (
              <IconButton icon={BiLockAlt} variant="secondary" onClick={() => setModal('lock')}>
                Khóa
              </IconButton>
            )}
          </>
        }
      >
        <StatusSteps map={USER_STATUS_LABEL} steps={STEPS} current={status} />
      </PageHeader>

      {/* thẻ danh tính: avatar + tên + vai trò + trạng thái; bên phải là tòa phụ trách và số hợp đồng của tòa */}
      <Card className="mb-3">
        <Card.Body className="p-4 flex flex-wrap items-center gap-4">
          <ManagerAvatar name={manager.name} size="lg" />
          <div className="min-w-0">
            <div className="h4 fw-semibold mb-2">{manager.name}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
                {ROLE_LABEL[ROLE.MANAGER]}
              </span>
              <StatusBadge map={USER_STATUS_LABEL} value={status} />
            </div>
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-5">
            <div className="vr d-none d-md-block" />
            <div>
              <div className="flex items-center gap-2 fs-5 fw-semibold">
                <BiBuildings className="text-secondary" />
                {/* bấm tên tòa mở trang chi tiết tòa nhà */}
                {building ? (
                  <Link to={`/buildings/${building._id}`}>{building.name}</Link>
                ) : (
                  <span className="text-secondary fw-normal">Chưa phân công</span>
                )}
              </div>
              <div className="small text-secondary">Tòa phụ trách</div>
            </div>
            {/* UC-09: số hợp đồng đang hiệu lực của tòa (BE trả trong building), để Admin cân nhắc trước khi khóa */}
            {building && (
              <div>
                <div className="flex items-center gap-2 fs-4 fw-semibold">
                  <BiFile className="text-secondary" />
                  {building.activeContractCount}
                </div>
                <div className="small text-secondary">Hợp đồng đang hiệu lực</div>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* chưa kích hoạt: giải thích vì sao chỉ có nút Gửi lại link và Xóa (UC-09) */}
      {isPending && (
        <Alert variant="warning">
          Manager chưa kích hoạt tài khoản. Link kích hoạt đã gửi tới{' '}
          <strong>{manager.email}</strong>, hiệu lực 24 giờ. Thông tin sai thì xóa tài khoản rồi tạo
          lại.
        </Alert>
      )}

      <Card className="mb-3">
        <Card.Header className="bg-transparent px-4 py-3">
          <h2 className="h6 fw-semibold mb-0 flex items-center gap-2">
            <BiUser className="text-secondary" />
            Thông tin cá nhân
          </h2>
        </Card.Header>
        <Card.Body className="px-4 py-3">
          {/* * đỏ theo luật 11: họ tên, email, SĐT bắt buộc (UC-08 bước 1); ngày sinh, địa chỉ, ảnh CCCD không bắt buộc */}
          <div className="grid lg:grid-cols-2 column-gap-5">
            <InfoRow icon={BiUser} label="Họ tên" required>
              {manager.name}
            </InfoRow>
            <InfoRow icon={BiEnvelope} label="Email" required>
              {manager.email}
            </InfoRow>
            <InfoRow icon={BiPhone} label="Số điện thoại" required>
              {manager.phone}
            </InfoRow>
            <InfoRow icon={BiCake} label="Ngày sinh">
              {formatDate(manager.dateOfBirth)}
            </InfoRow>
            <InfoRow icon={BiMap} label="Địa chỉ">
              {manager.address || null}
            </InfoRow>
            <InfoRow icon={BiTime} label="Ngày tạo">
              {formatDateTime(manager.createdAt)}
            </InfoRow>
          </div>
        </Card.Body>
      </Card>

      <CccdImages frontUrl={manager.cccdFrontUrl} backUrl={manager.cccdBackUrl} />

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
