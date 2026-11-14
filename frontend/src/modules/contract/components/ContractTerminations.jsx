// UC-28, 29: khung "Đơn chấm dứt" trong chi tiết hợp đồng (Manager) và Hợp đồng của tôi (Customer)
// Lấy các đơn của hợp đồng (GET /terminations?contractId=), mới nhất trước; bấm một đơn → chi tiết đơn
// Customer có đơn hai bên đang chờ → nổi bật nút "Xem và xác nhận" (thông báo của khách dẫn về trang này)
// Không có đơn nào thì không hiện gì. Trang cha nhận onLoaded(items) để biết còn đơn đang xử lý (ẩn nút Chấm dứt)
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { BiChevronRight, BiXCircle } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import StatusBadge from '../../../components/StatusBadge';
import { TERMINATION_STATUS, TERMINATION_TYPE } from '../../../constants/enums';
import { TERMINATION_STATUS_LABEL, TERMINATION_TYPE_LABEL } from '../../../constants/statusLabels';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { formatDate } from '../../../utils/format';
import contractApi from '../contract.api';

const ContractTerminations = ({ contractId, isCustomer = false, onLoaded }) => {
  const [items, setItems] = useState(null); // null = đang tải

  const loadTerminations = useCallback(
    () =>
      contractApi.terminations(contractId).then((response) => {
        const list = [...(response.data?.items ?? [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setItems(list);
        onLoaded?.(list);
      }),
    [contractId, onLoaded],
  );

  useEffect(() => {
    let ignore = false;
    contractApi
      .terminations(contractId)
      .then((response) => {
        if (ignore) return;
        const list = [...(response.data?.items ?? [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setItems(list);
        onLoaded?.(list);
      })
      .catch(() => !ignore && setItems([]));
    return () => {
      ignore = true;
    };
  }, [contractId, onLoaded]);

  useAutoRefresh(loadTerminations, { enabled: Boolean(contractId) });

  if (!items || items.length === 0) return null;

  const pathOf = (termination) =>
    isCustomer ? `/my-terminations/${termination._id}` : `/terminations/${termination._id}`;
  const waitingForMe = isCustomer
    ? items.find(
        (item) => item.status === TERMINATION_STATUS.PENDING && item.type === TERMINATION_TYPE.MUTUAL,
      )
    : null;

  return (
    <Card className="print:hidden">
      <Card.Body className="flex flex-col gap-2">
        <h2 className="h6 fw-bold mb-0 flex items-center gap-2">
          <BiXCircle className="text-secondary" />
          Đơn chấm dứt hợp đồng
        </h2>

        {waitingForMe && (
          <Alert variant="warning" className="mb-0 flex flex-wrap items-center justify-between gap-2">
            <span>
              Quản lý tòa đã gửi đơn chấm dứt hợp đồng, hiệu lực từ{' '}
              <b>{formatDate(waitingForMe.effectiveDate)}</b>. Vui lòng xem và xác nhận.
            </span>
            <Button as={Link} to={pathOf(waitingForMe)} variant="primary" size="sm" className="no-underline">
              Xem và xác nhận
            </Button>
          </Alert>
        )}

        <div className="flex flex-col gap-1">
          {items.map((termination) => (
            <Button
              key={termination._id}
              as={Link}
              to={pathOf(termination)}
              variant="secondary"
              className="hf-btn-ghost flex flex-wrap items-center gap-2 text-start no-underline"
            >
              <StatusBadge map={TERMINATION_TYPE_LABEL} value={termination.type} />
              <span className="flex-1 min-w-0 truncate">
                Hiệu lực {formatDate(termination.effectiveDate)} · {termination.reason}
              </span>
              <span className="small text-secondary">Gửi {formatDate(termination.createdAt)}</span>
              <StatusBadge map={TERMINATION_STATUS_LABEL} value={termination.status} />
              <BiChevronRight className="text-secondary" />
            </Button>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
};

export default ContractTerminations;
