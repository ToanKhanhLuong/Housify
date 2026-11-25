// UC-25 (Customer): xem hợp đồng của mình – ưu tiên hợp đồng Đang hiệu lực, chưa có thì hợp đồng mới nhất; hỗ trợ /:id từ lịch sử
// GET /contracts (BE trả hợp đồng ACTIVE / ENDED mà Customer đại diện) → GET /contracts/:id để có phòng, tòa, cư dân. Chỉ xem
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Tab, Tabs } from 'react-bootstrap';
import { BiHistory } from 'react-icons/bi';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import { CONTRACT_STATUS } from '../../constants/enums';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { formatDate, formatDateTime } from '../../utils/format';
import contractApi from './contract.api';
import ContractPaper from './components/ContractPaper';
import ContractDocumentTab from './components/ContractDocumentTab';
import ContractTerminations from './components/ContractTerminations';

const MyContractPage = () => {
  const { id } = useParams();
  // loading → ok | empty | error
  const [state, setState] = useState({
    status: 'loading',
    contract: null,
    hasActive: true,
    totalContracts: 0,
    error: '',
  });

  const loadContract = useCallback(
    (silent = false) => {
      if (id) {
        return contractApi
          .detail(id)
          .then((detail) =>
            setState({
              status: 'ok',
              contract: detail.data,
              hasActive: detail.data?.status === CONTRACT_STATUS.ACTIVE,
              totalContracts: 0,
              error: '',
            }),
          )
          .catch((error) => {
            if (silent) return;
            setState({ status: 'error', contract: null, hasActive: true, totalContracts: 0, error: error.message });
          });
      }

      return contractApi
        .list({ page: 1, limit: 50 })
        .then((response) => {
          const items = response.data?.items ?? [];
          const totalContracts = response.data?.total ?? items.length;
          const activeContract = items.find((item) => item.status === CONTRACT_STATUS.ACTIVE);
          const upcomingContract = items.find((item) => item.status === CONTRACT_STATUS.UPCOMING);
          const current = activeContract ?? upcomingContract ?? items[0];
          if (!current) {
            return setState({ status: 'empty', contract: null, hasActive: false, totalContracts: 0, error: '' });
          }
          return contractApi
            .detail(current._id)
            .then((detail) =>
              setState({
                status: 'ok',
                contract: detail.data,
                hasActive: Boolean(activeContract),
                totalContracts,
                error: '',
              }),
            );
        })
        .catch((error) => {
          if (silent) return;
          setState({ status: 'error', contract: null, hasActive: true, totalContracts: 0, error: error.message });
        });
    },
    [id],
  );

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  useAutoRefresh(() => loadContract(true), { enabled: state.status === 'ok' });

  const handleRetry = () => {
    setState({ status: 'loading', contract: null, hasActive: true, totalContracts: 0, error: '' });
    loadContract();
  };

  if (state.status === 'loading') {
    return (
      <Card>
        <Card.Body>
          <SkeletonRows rows={6} columns={4} />
        </Card.Body>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-3">
        {id && (
          <PageHeader
            backTo="/my-contract/history"
            breadcrumbs={[{ label: 'Hợp đồng của tôi', to: '/my-contract' }, { label: 'Lịch sử hợp đồng', to: '/my-contract/history' }, 'Chi tiết']}
          />
        )}
        <ErrorState
          message="Không tải được hợp đồng của bạn"
          detail={state.error}
          onRetry={handleRetry}
        />
      </div>
    );
  }
  if (state.status === 'empty') {
    return <EmptyState message="Bạn chưa có hợp đồng thuê phòng nào." />;
  }

  const isEnded = state.contract.status === CONTRACT_STATUS.ENDED;
  const isUpcoming = state.contract.status === CONTRACT_STATUS.UPCOMING;

  return (
    <div className="flex flex-col gap-3">
      {id ? (
        <PageHeader
          backTo="/my-contract/history"
          breadcrumbs={[
            { label: 'Hợp đồng của tôi', to: '/my-contract' },
            { label: 'Lịch sử hợp đồng', to: '/my-contract/history' },
            `Phòng ${state.contract.room?.roomNumber ?? ''}`,
          ]}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <span className="small text-secondary">
            {isEnded
              ? 'Hợp đồng đã kết thúc — bạn chỉ có thể xem lại thông tin và văn bản đã xác nhận.'
              : 'Cần thêm người ở cùng hoặc sửa thông tin hợp đồng, vui lòng liên hệ Manager của tòa.'}
          </span>
          <Button
            as={Link}
            to="/my-contract/history"
            variant="secondary"
            className="flex items-center gap-1 no-underline"
          >
            <BiHistory />
            Lịch sử hợp đồng ({state.totalContracts})
          </Button>
        </div>
      )}

      {isEnded && (
        <Alert variant="info" className="mb-0 print:hidden">
          {!id && !state.hasActive
            ? 'Hiện tại bạn không có hợp đồng đang hiệu lực. Dưới đây là hợp đồng đã kết thúc gần nhất (chỉ xem).'
            : 'Đây là hợp đồng đã kết thúc (chỉ xem). Bạn không thể chỉnh sửa hay gửi yêu cầu trên hợp đồng này.'}
          {state.contract.depositRefundedAt && (
            <> Thủ tục hoàn/quyết toán tiền cọc đã được ghi nhận lúc {formatDateTime(state.contract.depositRefundedAt)}.</>
          )}
        </Alert>
      )}

      {isUpcoming && (
        <Alert variant="info" className="mb-0 print:hidden">
          Hợp đồng Sắp hiệu lực: bạn đã ký và đã cọc, ngày bắt đầu dự kiến {formatDate(state.contract.startDate)}.
          Hợp đồng tự chuyển Đang hiệu lực khi phòng được bàn giao. Trong thời gian này bạn chỉ xem được thông tin,
          chưa chỉnh sửa được. Muốn hủy, vui lòng liên hệ Manager (hủy theo thỏa thuận thì mất cọc).
        </Alert>
      )}

      {/* UC-28: đơn chấm dứt của hợp đồng – đơn hai bên đang chờ thì nổi bật nút "Xem và xác nhận" */}
      <ContractTerminations contractId={state.contract._id} isCustomer />
      <Tabs defaultActiveKey="info" className="mb-3 print:hidden" mountOnEnter>
        <Tab eventKey="info" title="Thông tin">
          <ContractPaper contract={state.contract} />
        </Tab>
        <Tab eventKey="document" title="Văn bản hợp đồng">
          <ContractDocumentTab contract={state.contract} />
        </Tab>
      </Tabs>
    </div>
  );
};

export default MyContractPage;
