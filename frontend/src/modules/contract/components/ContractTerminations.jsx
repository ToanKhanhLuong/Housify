// UC-28, 29: khung "Đơn chấm dứt" trong chi tiết hợp đồng (Manager) và Hợp đồng của tôi (Customer)
// - Manager: hiện mọi đơn của hợp đồng; mới nhất trước; bấm một đơn → chi tiết đơn
// - Customer (Hợp đồng của tôi): chỉ hiện đơn ĐÃ XÁC NHẬN / ĐÃ DUYỆT (2 chiều hoặc đơn phương); đơn chờ xử lý xem qua Thông báo → /my-terminations/:id
// Không có đơn nào thỏa điều kiện thì không hiện gì. Trang cha nhận onLoaded(items) để biết còn đơn đang xử lý (ẩn nút Chấm dứt)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { BiChevronRight, BiXCircle } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import StatusBadge from '../../../components/StatusBadge';
import { TERMINATION_STATUS } from '../../../constants/enums';
import { TERMINATION_STATUS_LABEL, TERMINATION_TYPE_LABEL } from '../../../constants/statusLabels';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { formatDate } from '../../../utils/format';
import contractApi from '../contract.api';

const ContractTerminations = ({ contractId, isCustomer = false, onLoaded }) => {
  const [items, setItems] = useState(null); // null = đang tải

  const filterForViewer = useCallback(
    (rawItems) => {
      const sorted = [...rawItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return isCustomer ? sorted.filter((item) => item.status === TERMINATION_STATUS.CONFIRMED) : sorted;
    },
    [isCustomer],
  );

  const loadTerminations = useCallback(
    () =>
      contractApi.terminations(contractId).then((response) => {
        const rawList = response.data?.items ?? [];
        setItems(filterForViewer(rawList));
        onLoaded?.(rawList);
      }),
    [contractId, filterForViewer, onLoaded],
  );

  useEffect(() => {
    let ignore = false;
    contractApi
      .terminations(contractId)
      .then((response) => {
        if (ignore) return;
        const rawList = response.data?.items ?? [];
        setItems(filterForViewer(rawList));
        onLoaded?.(rawList);
      })
      .catch(() => !ignore && setItems([]));
    return () => {
      ignore = true;
    };
  }, [contractId, filterForViewer, onLoaded]);

  useAutoRefresh(loadTerminations, { enabled: Boolean(contractId) });

  if (!items || items.length === 0) return null;

  const pathOf = (termination) =>
    isCustomer ? `/my-terminations/${termination._id}` : `/terminations/${termination._id}`;

  return (
    <Card className="print:hidden">
      <Card.Body className="flex flex-col gap-2">
        <h2 className="h6 fw-bold mb-0 flex items-center gap-2">
          <BiXCircle className="text-secondary" />
          Đơn chấm dứt hợp đồng
        </h2>

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
