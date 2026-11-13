// UC-25: chi tiết hợp đồng (Manager), khuôn 9.2 trong frontend/AGENTS.md: nút theo trạng thái bên trái, StatusSteps bên phải
// Nháp → Gửi lại lời mời (UC-24 A2), Chỉnh sửa (UC-26), Hủy hợp đồng (UC-46)
// Đang hiệu lực → Gia hạn (UC-27), Sửa ghi chú (UC-26), Chấm dứt (UC-28)
// Bấm một cư dân trong bảng → chi tiết cư dân (/occupants/:id)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Placeholder, Spinner, Tab, Tabs } from 'react-bootstrap';
import { BiCalendarPlus, BiEditAlt, BiSend, BiXCircle } from 'react-icons/bi';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import StatusSteps from '../../components/StatusSteps';
import { useAuth } from '../../context/AuthContext';
import { CONTRACT_STATUS, ROLE } from '../../constants/enums';
import { CONTRACT_STATUS_LABEL } from '../../constants/statusLabels';
import contractApi from './contract.api';
import CancelContractModal from './components/CancelContractModal';
import ContractPaper from './components/ContractPaper';
import ContractDocumentTab from './components/ContractDocumentTab';
import EditContractModal from './components/EditContractModal';
import InviteLinkAlert from './components/InviteLinkAlert';
import RenewContractModal from './components/RenewContractModal';
// UC-28, 29, 45: Đang hiệu lực → nút Chấm dứt (mở /terminations/new?contractId=, ẩn khi đã có
// đơn chờ / đã xác nhận); khung "Đơn chấm dứt" (các đơn của hợp đồng); Đã kết thúc → khung "Hoàn cọc"
import { BiBlock } from 'react-icons/bi';
import { TERMINATION_STATUS } from '../../constants/enums';
import ContractTerminations from './components/ContractTerminations';
import RefundDepositSection from './components/RefundDepositSection';

// đơn còn đang xử lý (chờ / đã xác nhận chưa tới ngày hiệu lực) thì không tạo đơn mới
const OPEN_TERMINATION = [TERMINATION_STATUS.PENDING, TERMINATION_STATUS.CONFIRMED];

// Đã hủy nằm ngoài luồng chính, StatusSteps tự hiện ở cuối
const STEPS = [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED];

const ContractDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Admin chỉ xem: không nút thao tác, không hoàn cọc, quay về chi tiết phòng (Admin không có trang danh sách hợp đồng)
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  const [state, setState] = useState({ status: 'loading', contract: null, error: '' });
  const [modal, setModal] = useState(null); // 'edit' | 'renew' | 'cancel'
  const [busy, setBusy] = useState(''); // 'resend' | 'cancel'
  // lời mời vừa tạo (từ trang tạo) hoặc vừa gửi lại: { rawToken, warning }
  const [invite, setInvite] = useState(location.state?.invite ?? null);
  const [hasOpenTermination, setHasOpenTermination] = useState(false);
  // ContractTerminations báo danh sách đơn về để ẩn / hiện nút Chấm dứt
  const handleTerminationsLoaded = useCallback(
    (items) => setHasOpenTermination(items.some((item) => OPEN_TERMINATION.includes(item.status))),
    [],
  );

  const contract = state.contract;

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadContract = useCallback(
    () =>
      contractApi
        .detail(id)
        .then((response) => setState({ status: 'ok', contract: response.data, error: '' }))
        .catch((error) =>
          setState({
            status: error.status === 404 || error.status === 403 ? 'notFound' : 'error',
            contract: null,
            error: error.message,
          }),
        ),
    [id],
  );

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  const handleRetry = () => {
    setState({ status: 'loading', contract: null, error: '' });
    loadContract();
  };

  const afterSaved = () => {
    setModal(null);
    loadContract();
  };

  const handleResend = async () => {
    setBusy('resend');
    try {
      const response = await contractApi.resendInvite(contract._id);
      setInvite(response.data);
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Đã gửi lại lời mời cho khách');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const handleCancel = async (reason) => {
    setBusy('cancel');
    try {
      const response = await contractApi.cancel(contract._id, reason ? { reason } : {});
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Đã hủy hợp đồng nháp');
      setInvite(null);
      afterSaved();
    } catch (error) {
      setModal(null);
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải hợp đồng">
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
      <EmptyState message={state.error || 'Không tìm thấy hợp đồng'}>
        <Button variant="secondary" onClick={() => navigate(isAdmin ? '/buildings' : '/contracts')}>
          {isAdmin ? 'Về danh sách tòa nhà' : 'Về danh sách hợp đồng'}
        </Button>
      </EmptyState>
    );
  }
  if (state.status === 'error') {
    return (
      <ErrorState message="Không tải được hợp đồng" detail={state.error} onRetry={handleRetry} />
    );
  }

  const isDraft = contract.status === CONTRACT_STATUS.DRAFT;
  const isActive = contract.status === CONTRACT_STATUS.ACTIVE;

  const roomPath = `/rooms/${contract.room?._id ?? ''}`;

  const actions = isAdmin ? null : (
    <>
      {isDraft && (
        <Button
          variant="primary"
          className="flex items-center gap-2"
          onClick={handleResend}
          disabled={busy === 'resend'}
        >
          {busy === 'resend' ? <Spinner animation="border" size="sm" /> : <BiSend />}
          Gửi lại lời mời
        </Button>
      )}
      {isActive && (
        <Button
          variant="primary"
          className="flex items-center gap-2"
          onClick={() => setModal('renew')}
        >
          <BiCalendarPlus />
          Gia hạn
        </Button>
      )}
      {(isDraft || isActive) && (
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => setModal('edit')}
        >
          <BiEditAlt />
          {isDraft ? 'Chỉnh sửa' : 'Sửa ghi chú'}
        </Button>
      )}
      {isDraft && (
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => setModal('cancel')}
        >
          <BiXCircle />
          Hủy hợp đồng
        </Button>
      )}
      {isActive && !hasOpenTermination && (
        <Button
          as={Link}
          to={`/terminations/new?contractId=${contract._id}`}
          variant="secondary"
          className="flex items-center gap-2 no-underline"
        >
          <BiBlock />
          Chấm dứt
        </Button>
      )}
    </>
  );

  return (
    <>
      {/* thanh nút, link mời không in – trang in chỉ còn văn bản hợp đồng */}
      <div className="print:hidden">
        <PageHeader
          backTo={isAdmin ? roomPath : '/contracts'}
          breadcrumbs={
            isAdmin
              ? [{ label: `Phòng ${contract.room?.roomNumber ?? ''}`, to: roomPath }, 'Hợp đồng']
              : [{ label: 'Hợp đồng', to: '/contracts' }, `Phòng ${contract.room?.roomNumber ?? ''}`]
          }
          actions={actions}
        >
          <StatusSteps map={CONTRACT_STATUS_LABEL} steps={STEPS} current={contract.status} />
        </PageHeader>
      </div>

      {invite && isDraft && (
        <div className="mb-3 print:hidden">
          <InviteLinkAlert
            rawToken={invite.rawToken}
            warning={invite.warning}
            onClose={() => setInvite(null)}
          />
        </div>
      )}

      {/* UC-28, 29: các đơn chấm dứt của hợp đồng; UC-45: hoàn cọc khi Đã kết thúc */}
      {!isDraft && (
        <div className="flex flex-col gap-3 mb-3">
          <ContractTerminations contractId={contract._id} onLoaded={handleTerminationsLoaded} />
          {contract.status === CONTRACT_STATUS.ENDED && !isAdmin && <RefundDepositSection contractId={contract._id} />}
        </div>
      )}

      {/* Thông tin: bảng như trang chi tiết; Văn bản hợp đồng: tờ A4 như lúc gửi khách (In / Lưu PDF) */}
      <Tabs defaultActiveKey="info" className="mb-3 print:hidden" mountOnEnter>
        <Tab eventKey="info" title="Thông tin">
          <ContractPaper
            contract={contract}
            onOccupantClick={isAdmin ? undefined : (occupant) => navigate(`/occupants/${occupant._id}`)}
          />
        </Tab>
        <Tab eventKey="document" title="Văn bản hợp đồng">
          <ContractDocumentTab contract={contract} />
        </Tab>
      </Tabs>

      {modal === 'edit' && (
        <EditContractModal contract={contract} onHide={() => setModal(null)} onSaved={afterSaved} />
      )}
      {modal === 'renew' && (
        <RenewContractModal
          contract={contract}
          onHide={() => setModal(null)}
          onSaved={afterSaved}
        />
      )}
      {modal === 'cancel' && (
        <CancelContractModal
          contract={contract}
          loading={busy === 'cancel'}
          onConfirm={handleCancel}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
};

export default ContractDetailPage;
