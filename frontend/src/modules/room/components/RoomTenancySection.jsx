// UC-19 (Manager): trong chi tiết phòng hiện hợp đồng đang hiệu lực và cư dân đang ở
// - Hợp đồng: người đại diện, loại, thời hạn, giá thuê → link sang hợp đồng. Chỉ có nháp thì báo chờ khách kích hoạt
// - Cư dân: avatar chữ viết tắt, Đại diện / quan hệ, SĐT → bấm mở chi tiết cư dân; còn chỗ thì nút "Thêm người"
//   (popup thêm nằm ở trang Cư dân: mở với phòng chọn sẵn, thêm xong quay lại phòng này)
// Admin không gọi được API hợp đồng / cư dân (chỉ M, C) nên trang chỉ hiện phần này cho Manager
import { useEffect, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { BiChevronRight, BiFile, BiGroup } from 'react-icons/bi';
import { Link, useNavigate } from 'react-router-dom';
import MoneyText from '../../../components/MoneyText';
import SkeletonRows from '../../../components/SkeletonRows';
import StatusBadge from '../../../components/StatusBadge';
import { CONTRACT_STATUS } from '../../../constants/enums';
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../../../constants/statusLabels';
import { formatDate } from '../../../utils/format';
import roomApi from '../room.api';

// "Đỗ Minh Khang" → "MK" (giống avatar ở header)
const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

const SectionTitle = ({ icon: Icon, children }) => (
  <span className="fw-semibold flex items-center gap-2">
    <Icon className="text-secondary" />
    {children}
  </span>
);

const RoomTenancySection = ({ room }) => {
  const navigate = useNavigate();
  // loading → ok | error
  const [state, setState] = useState({ status: 'loading', contracts: [], occupants: [], error: '' });

  useEffect(() => {
    let ignore = false;
    Promise.all([roomApi.contracts(room._id), roomApi.occupants(room._id)])
      .then(([contracts, occupants]) => {
        if (ignore) return;
        setState({
          status: 'ok',
          contracts: contracts.data?.items ?? [],
          // đại diện đứng đầu
          occupants: [...(occupants.data?.items ?? [])].sort(
            (a, b) => Number(b.isRepresentative) - Number(a.isRepresentative),
          ),
          error: '',
        });
      })
      .catch((error) => !ignore && setState({ status: 'error', contracts: [], occupants: [], error: error.message }));
    return () => {
      ignore = true;
    };
  }, [room._id]);

  if (state.status === 'loading') return <SkeletonRows rows={3} columns={3} />;
  if (state.status === 'error') {
    return (
      <Alert variant="secondary" className="mb-0 small">
        Không tải được hợp đồng và cư dân của phòng: {state.error}
      </Alert>
    );
  }

  const active = state.contracts.find((contract) => contract.status === CONTRACT_STATUS.ACTIVE);
  const draft = state.contracts.find((contract) => contract.status === CONTRACT_STATUS.DRAFT);
  const capacity = room.roomType?.capacity;
  const count = state.occupants.length;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* hợp đồng đang hiệu lực */}
      <section className="flex flex-col gap-2">
        <SectionTitle icon={BiFile}>Hợp đồng đang hiệu lực</SectionTitle>
        {active ? (
          <Link
            to={`/contracts/${active._id}`}
            className="hf-tcard no-underline gap-2"
            title="Mở hợp đồng"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="fw-semibold">
                {active.representative?.name || active.representative?.cccd || '—'}
              </span>
              <StatusBadge map={CONTRACT_STATUS_LABEL} value={active.status} />
            </span>
            <span className="small text-secondary">
              {CONTRACT_TYPE_LABEL[active.contractType]?.label ?? 'Hợp đồng'} ·{' '}
              {formatDate(active.startDate)} – {formatDate(active.endDate)}
            </span>
            <span className="flex items-center justify-between gap-2 small">
              <span>
                <span className="fw-semibold">
                  <MoneyText value={active.rentPrice} />
                </span>{' '}
                / tháng
              </span>
              <span className="flex items-center gap-1 text-secondary">
                Xem hợp đồng
                <BiChevronRight />
              </span>
            </span>
          </Link>
        ) : draft ? (
          <Link to={`/contracts/${draft._id}`} className="hf-tcard no-underline gap-1">
            <span className="flex items-center justify-between gap-2">
              <span className="fw-semibold">Hợp đồng nháp chờ khách kích hoạt</span>
              <StatusBadge map={CONTRACT_STATUS_LABEL} value={draft.status} />
            </span>
            <span className="small text-secondary">
              Đã gửi lời mời tới {draft.representative?.email ?? '—'} · bắt đầu{' '}
              {formatDate(draft.startDate)}
            </span>
          </Link>
        ) : (
          <div className="hf-ph h-24">Phòng chưa có hợp đồng</div>
        )}
      </section>

      {/* cư dân đang ở */}
      <section className="flex flex-col gap-2">
        <SectionTitle icon={BiGroup}>
          Cư dân đang ở{' '}
          <span className="fw-normal text-secondary">
            ({count}
            {capacity ? `/${capacity}` : ''})
          </span>
        </SectionTitle>
        {count === 0 ? (
          <div className="hf-ph h-24">Chưa có ai đang ở</div>
        ) : (
          <div className="hf-card flex flex-col gap-1 p-2">
            {state.occupants.map((occupant) => (
              <Button
                key={occupant._id}
                variant="secondary"
                className="hf-btn-ghost w-full flex items-center gap-3 px-2 py-2 text-start"
                onClick={() => navigate(`/occupants/${occupant._id}`)}
              >
                <span
                  className={`hf-av w-9 h-9 text-xs ${occupant.isRepresentative ? '' : 'bg-body-tertiary text-secondary border'}`}
                  aria-hidden="true"
                >
                  {initialsOf(occupant.name)}
                </span>
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="fw-semibold text-body truncate">{occupant.name}</span>
                    {occupant.isRepresentative && <span className="hf-badge hf-b-plum">Đại diện</span>}
                  </span>
                  <span className="small text-secondary truncate">
                    {[occupant.isRepresentative ? null : occupant.relationship || 'Ở cùng', occupant.phone]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <BiChevronRight className="text-secondary shrink-0" />
              </Button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default RoomTenancySection;
