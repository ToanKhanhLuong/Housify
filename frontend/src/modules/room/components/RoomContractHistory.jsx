// UC-19 (Manager, Admin chỉ xem): lịch sử hợp đồng của phòng trong chi tiết phòng – các hợp đồng Đã kết thúc, Đã hủy
// Mỗi dòng: người đại diện, loại, thời hạn, giá thuê, trạng thái; bấm một dòng → chi tiết hợp đồng. Phân trang 5 dòng
import { useEffect, useState } from 'react';
import { BiHistory } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/DataTable';
import MoneyText from '../../../components/MoneyText';
import Pager from '../../../components/Pager';
import SkeletonRows from '../../../components/SkeletonRows';
import StatusBadge from '../../../components/StatusBadge';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../../constants/statusLabels';
import { formatDate } from '../../../utils/format';
import roomApi from '../room.api';

const PAGE_SIZE = 5;

const columns = [
  {
    key: 'representative',
    title: 'Người đại diện',
    className: 'fw-semibold',
    render: (row) => row.representative?.name || row.representative?.email || '—',
  },
  {
    key: 'type',
    title: 'Loại',
    render: (row) => CONTRACT_TYPE_LABEL[row.contractType]?.label ?? '—',
  },
  {
    key: 'term',
    title: 'Thời hạn',
    render: (row) => `${formatDate(row.startDate)} → ${formatDate(row.endDate)}`,
  },
  {
    key: 'rentPrice',
    title: 'Giá thuê',
    align: 'end',
    render: (row) => <MoneyText value={row.rentPrice} />,
  },
  {
    key: 'status',
    title: 'Trạng thái',
    render: (row) => <StatusBadge map={CONTRACT_STATUS_LABEL} value={row.status} />,
  },
];

const RoomContractHistory = ({ roomId }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  // loading → ok | error
  const [state, setState] = useState({ status: 'loading', items: [], total: 0, error: '' });

  useEffect(() => {
    let ignore = false;
    roomApi
      .contractHistory(roomId, page)
      .then((response) => {
        if (ignore) return;
        setState({
          status: 'ok',
          items: response.data?.items ?? [],
          total: response.data?.total ?? 0,
          error: '',
        });
      })
      .catch((error) => !ignore && setState({ status: 'error', items: [], total: 0, error: error.message }));
    return () => {
      ignore = true;
    };
  }, [roomId, page]);

  const renderBody = () => {
    if (state.status === 'loading') return <SkeletonRows rows={2} columns={4} />;
    if (state.status === 'error') {
      return <span className="small text-secondary">Không tải được lịch sử hợp đồng: {state.error}</span>;
    }
    if (state.total === 0) return <div className="hf-ph h-16">Phòng chưa có hợp đồng cũ</div>;
    return (
      <>
        <DataTable
          columns={columns}
          data={state.items}
          onRowClick={(row) => navigate(`/contracts/${row._id}`)}
        />
        {state.total > PAGE_SIZE && (
          <div className="flex justify-end mt-2">
            <Pager page={page} limit={PAGE_SIZE} total={state.total} onChange={setPage} />
          </div>
        )}
      </>
    );
  };

  return (
    <section className="flex flex-col gap-2">
      <span className="fw-semibold flex items-center gap-2">
        <BiHistory className="text-secondary" />
        Lịch sử hợp đồng
        {state.status === 'ok' && <span className="fw-normal text-secondary">({state.total})</span>}
      </span>
      {renderBody()}
    </section>
  );
};

export default RoomContractHistory;
