// UC-25 (Customer): xem hợp đồng của mình – ưu tiên hợp đồng Đang hiệu lực, chưa có thì hợp đồng mới nhất
// GET /contracts (BE chỉ trả hợp đồng Customer đại diện) → GET /contracts/:id để có phòng, tòa, cư dân. Chỉ xem
import { useCallback, useEffect, useState } from 'react';
import { Card, Tab, Tabs } from 'react-bootstrap';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import { CONTRACT_STATUS } from '../../constants/enums';
import contractApi from './contract.api';
import ContractPaper from './components/ContractPaper';
import ContractDocumentTab from './components/ContractDocumentTab';
import ContractTerminations from './components/ContractTerminations';

const MyContractPage = () => {
  // loading → ok | empty | error
  const [state, setState] = useState({ status: 'loading', contract: null, error: '' });

  const loadContract = useCallback(
    () =>
      contractApi
        .list({ page: 1, limit: 10 })
        .then((response) => {
          const items = response.data?.items ?? [];
          const current = items.find((item) => item.status === CONTRACT_STATUS.ACTIVE) ?? items[0];
          if (!current) return setState({ status: 'empty', contract: null, error: '' });
          return contractApi
            .detail(current._id)
            .then((detail) => setState({ status: 'ok', contract: detail.data, error: '' }));
        })
        .catch((error) => setState({ status: 'error', contract: null, error: error.message })),
    [],
  );

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  const handleRetry = () => {
    setState({ status: 'loading', contract: null, error: '' });
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
      <ErrorState
        message="Không tải được hợp đồng của bạn"
        detail={state.error}
        onRetry={handleRetry}
      />
    );
  }
  if (state.status === 'empty')
    return <EmptyState message="Bạn chưa có hợp đồng thuê phòng nào." />;

  return (
    <div className="flex flex-col gap-3">
      <div className="small text-secondary print:hidden">
        Cần thêm người ở cùng hoặc sửa thông tin hợp đồng, vui lòng liên hệ Manager của tòa.
      </div>
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
