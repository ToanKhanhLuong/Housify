// UC-25: chi tiết hợp đồng (Manager), khuôn 9.2 trong frontend/AGENTS.md: nút theo trạng thái bên trái, StatusSteps bên phải
// Nháp → Gửi lại lời mời (UC-24 A2), Chỉnh sửa (UC-26), Hủy hợp đồng (UC-46)
// Đang hiệu lực → Gia hạn (UC-27), Sửa ghi chú (UC-26), Thêm người ở cùng (UC-32, mở trang Cư dân), Lập hóa đơn (UC-34)
// Bấm một cư dân trong bảng → chi tiết cư dân (/occupants/:id)
// Chừa chỗ cho An: Chấm dứt (UC-28, 29) khi Đang hiệu lực, Hoàn cọc (UC-45) khi Đã kết thúc
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Placeholder, Spinner, Tab, Tabs } from 'react-bootstrap';
import { BiCalendarPlus, BiEditAlt, BiReceipt, BiSend, BiUserPlus, BiXCircle } from 'react-icons/bi';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import StatusSteps from '../../components/StatusSteps';
import { CONTRACT_STATUS } from '../../constants/enums';
import { CONTRACT_STATUS_LABEL } from '../../constants/statusLabels';
import contractApi from './contract.api';
import CancelContractModal from './components/CancelContractModal';
import ContractPaper from './components/ContractPaper';
import ContractDocumentTab from './components/ContractDocumentTab';
import EditContractModal from './components/EditContractModal';
import InviteLinkAlert from './components/InviteLinkAlert';
import RenewContractModal from './components/RenewContractModal';

// Đã hủy nằm ngoài luồng chính, StatusSteps tự hiện ở cuối
const STEPS = [CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED];

const ContractDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState({ status: 'loading', contract: null, error: '' });
  const [modal, setModal] = useState(null); // 'edit' | 'renew' | 'cancel'
  const [busy, setBusy] = useState(''); // 'resend' | 'cancel'
  // lời mời vừa tạo (từ trang tạo) hoặc vừa gửi lại: { rawToken, warning }
  const [invite, setInvite] = useState(location.state?.invite ?? null);

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
        <Button variant="secondary" onClick={() => navigate('/contracts')}>
          Về danh sách hợp đồng
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

  const actions = (
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
      {isActive && (
        // UC-32: popup thêm nằm ở module occupant → mở trang Cư dân với phòng chọn sẵn, thêm xong quay lại đây
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() =>
            navigate('/occupants', {
              state: {
                addTo: { _id: contract._id, roomNumber: contract.room?.roomNumber ?? '' },
                returnTo: `/contracts/${contract._id}`,
              },
            })
          }
        >
          <BiUserPlus />
          Thêm người ở cùng
        </Button>
      )}
      {isActive && (
        <Button
          as={Link}
          to={`/invoices/new?contractId=${contract._id}`}
          variant="secondary"
          className="flex items-center gap-2 no-underline"
        >
          <BiReceipt />
          Lập hóa đơn
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
      {/* chỗ cho An: isActive → nút "Chấm dứt" (UC-28, 29); ENDED → nút "Hoàn cọc" (UC-45) */}
    </>
  );

  return (
    <>
      {/* thanh nút, link mời không in – trang in chỉ còn văn bản hợp đồng */}
      <div className="print:hidden">
        <PageHeader
          backTo="/contracts"
          breadcrumbs={[
            { label: 'Hợp đồng', to: '/contracts' },
            `Phòng ${contract.room?.roomNumber ?? ''}`,
          ]}
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

      {/* Thông tin: bảng như trang chi tiết; Văn bản hợp đồng: tờ A4 như lúc gửi khách (In / Lưu PDF) */}
      <Tabs defaultActiveKey="info" className="mb-3 print:hidden" mountOnEnter>
        <Tab eventKey="info" title="Thông tin">
          <ContractPaper
            contract={contract}
            onOccupantClick={(occupant) => navigate(`/occupants/${occupant._id}`)}
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
