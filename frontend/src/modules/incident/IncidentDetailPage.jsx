// UC-43, 44: chi tiết đơn sự cố, dùng chung Manager (/incidents/:id) và Customer (/my-incidents/:id). Khuôn PageHeader + StatusSteps + tờ giấy
// Nút của Manager theo trạng thái: Chờ tiếp nhận → Tiếp nhận, Từ chối; Đang xử lý → Đánh dấu đã giải quyết, Từ chối
// Đã giải quyết / Từ chối: không đổi được nữa. Cuối trang là lịch sử trạng thái (các thông báo đã gửi cho khách)
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Image, Placeholder, Spinner } from 'react-bootstrap';
import { BiCheck, BiCheckCircle, BiHistory, BiImage, BiInfoCircle, BiPlay, BiXCircle } from 'react-icons/bi';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FieldRow from '../../components/FieldRow';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import StatusSteps from '../../components/StatusSteps';
import { useAuth } from '../../context/AuthContext';
import { INCIDENT_STATUS, ROLE } from '../../constants/enums';
import { INCIDENT_STATUS_LABEL, INCIDENT_TYPE_LABEL } from '../../constants/statusLabels';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { formatDateTime } from '../../utils/format';
import incidentApi from './incident.api';
import ResultNoteModal from './components/ResultNoteModal';

// Từ chối nằm ngoài luồng chính, StatusSteps tự hiện ở cuối
const STEPS = [INCIDENT_STATUS.PENDING, INCIDENT_STATUS.IN_PROGRESS, INCIDENT_STATUS.RESOLVED];

const SectionTitle = ({ icon: Icon, children }) => (
  <h2 className="h6 fw-bold mb-2 flex items-center gap-2">
    <Icon className="text-secondary" />
    {children}
  </h2>
);

const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user.role === ROLE.MANAGER;
  const basePath = isManager ? '/incidents' : '/my-incidents';

  const [state, setState] = useState({ status: 'loading', incident: null, error: '' });
  const [modal, setModal] = useState(null); // 'resolve' | 'reject'
  const [busy, setBusy] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadIncident = useCallback(
    (silent = false) =>
      incidentApi
        .detail(id)
        .then((response) => setState({ status: 'ok', incident: response.data, error: '' }))
        .catch((error) => {
          if (silent) return;
          setState({
            status: error.status === 404 || error.status === 403 ? 'notFound' : 'error',
            incident: null,
            error: error.message,
          });
        }),
    [id],
  );

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  useAutoRefresh(() => loadIncident(true), {
    enabled: state.status === 'ok' && !modal && !busy,
  });

  // gọi 1 thao tác xử lý đơn, báo kết quả, tải lại đơn; lỗi thì tải lại để thấy trạng thái mới nhất
  const runAction = async (action, successText) => {
    setBusy(true);
    try {
      const response = await action();
      toast.success(response.message || successText);
      setModal(null);
    } catch (error) {
      toast.error(error.message);
      setModal(null);
    } finally {
      setBusy(false);
      loadIncident();
    }
  };

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải đơn sự cố">
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
      <EmptyState message={state.error || 'Không tìm thấy đơn sự cố'}>
        <Button variant="secondary" onClick={() => navigate(basePath)}>
          Về danh sách sự cố
        </Button>
      </EmptyState>
    );
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        message="Không tải được đơn sự cố"
        detail={state.error}
        onRetry={() => {
          setState({ status: 'loading', incident: null, error: '' });
          loadIncident();
        }}
      />
    );
  }

  const { incident } = state;
  const { room, reporter, status } = incident;
  const isPending = status === INCIDENT_STATUS.PENDING;
  const isInProgress = status === INCIDENT_STATUS.IN_PROGRESS;
  const isRejected = status === INCIDENT_STATUS.REJECTED;
  const images = incident.images ?? [];
  const history = incident.history ?? [];

  const actions = isManager && (isPending || isInProgress) && (
    <>
      {isPending && (
        <Button
          variant="primary"
          className="flex items-center gap-2"
          disabled={busy}
          onClick={() => runAction(() => incidentApi.accept(incident._id), 'Đã tiếp nhận đơn')}
        >
          {busy ? <Spinner animation="border" size="sm" /> : <BiPlay />}
          Tiếp nhận
        </Button>
      )}
      {isInProgress && (
        <Button
          variant="primary"
          className="flex items-center gap-2"
          disabled={busy}
          onClick={() => setModal('resolve')}
        >
          <BiCheck />
          Đánh dấu đã giải quyết
        </Button>
      )}
      <Button
        variant="secondary"
        className="flex items-center gap-2"
        disabled={busy}
        onClick={() => setModal('reject')}
      >
        <BiXCircle />
        Từ chối
      </Button>
    </>
  );

  return (
    <>
      <PageHeader
        backTo={basePath}
        breadcrumbs={[{ label: 'Sự cố', to: basePath }, incident.incidentCode]}
        actions={actions}
      >
        <StatusSteps map={INCIDENT_STATUS_LABEL} steps={STEPS} current={status} />
      </PageHeader>

      <Card className="hf-paper">
        {/* định danh: mã đơn, tiêu đề, loại, trạng thái */}
        <div className="flex flex-col gap-1">
          <span className="small text-secondary">
            Báo cáo sự cố · {incident.incidentCode} · {INCIDENT_TYPE_LABEL[incident.type]?.label ?? '—'}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <h1 className="h3 fw-bold mb-0">{incident.title}</h1>
            <StatusBadge map={INCIDENT_STATUS_LABEL} value={status} />
          </span>
        </div>

        <div className="grid lg:grid-cols-2 column-gap-5">
          <div>
            <FieldRow label="Phòng">
              {room ? `Phòng ${room.roomNumber} · Tầng ${room.floorNumber}` : '—'}
            </FieldRow>
            <FieldRow label="Người gửi">
              {reporter ? `${reporter.name} · ${reporter.phone}` : '—'}
            </FieldRow>
            <FieldRow label="Ngày gửi">{formatDateTime(incident.createdAt)}</FieldRow>
          </div>
          <div>
            <FieldRow label="Người xử lý">{incident.handledByName || 'Chưa có'}</FieldRow>
            {incident.resolvedAt && (
              <FieldRow label="Giải quyết lúc">{formatDateTime(incident.resolvedAt)}</FieldRow>
            )}
          </div>
        </div>

        {/* kết quả xử lý: ghi chú khi đã giải quyết, lý do khi bị từ chối */}
        {incident.resultNote && (
          <div
            className={`rounded border px-3 py-2 flex flex-col gap-1 ${isRejected ? 'border-danger-subtle bg-danger-subtle' : 'border-success-subtle bg-success-subtle'}`}
          >
            <span
              className={`fw-semibold flex items-center gap-2 ${isRejected ? 'text-danger-emphasis' : 'text-success-emphasis'}`}
            >
              {isRejected ? <BiXCircle /> : <BiCheckCircle />}
              {isRejected ? 'Lý do từ chối' : 'Kết quả xử lý'}
            </span>
            <span className="whitespace-pre-line">{incident.resultNote}</span>
          </div>
        )}

        <section>
          <SectionTitle icon={BiInfoCircle}>Mô tả chi tiết</SectionTitle>
          <div className="whitespace-pre-line">{incident.description}</div>
        </section>

        <section>
          <SectionTitle icon={BiImage}>Ảnh đính kèm</SectionTitle>
          {images.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {images.map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-40 h-28 overflow-hidden rounded border"
                  title="Xem ảnh gốc"
                >
                  <Image
                    src={url}
                    alt={`Ảnh sự cố ${index + 1}`}
                    className="h-full w-full object-cover transition-opacity hover:opacity-75"
                  />
                </a>
              ))}
            </div>
          ) : (
            <span className="text-secondary">Không có ảnh</span>
          )}
        </section>

        <section>
          <SectionTitle icon={BiHistory}>Lịch sử trạng thái</SectionTitle>
          <ul className="list-unstyled mb-0 flex flex-col gap-2">
            <li className="flex gap-3">
              <span className="small text-secondary shrink-0 w-36">{formatDateTime(incident.createdAt)}</span>
              <span>Đã gửi báo cáo sự cố</span>
            </li>
            {history.map((item) => (
              <li key={item._id} className="flex gap-3">
                <span className="small text-secondary shrink-0 w-36">{formatDateTime(item.createdAt)}</span>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        </section>
      </Card>

      {modal === 'resolve' && (
        <ResultNoteModal
          title="Đánh dấu đã giải quyết"
          message="Khách nhận thông báo kèm ghi chú kết quả. Đơn đã giải quyết không đổi được nữa."
          label="Ghi chú kết quả"
          placeholder="Vd: đã thay vòi nước mới"
          emptyMessage="Vui lòng nhập ghi chú kết quả"
          confirmText="Đã giải quyết"
          variant="primary"
          loading={busy}
          onConfirm={(resultNote) =>
            runAction(() => incidentApi.resolve(incident._id, { resultNote }), 'Đã giải quyết đơn')
          }
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'reject' && (
        <ResultNoteModal
          title="Từ chối đơn"
          message="Khách nhận thông báo kèm lý do. Đơn bị từ chối không đổi được nữa."
          label="Lý do từ chối"
          placeholder="Vd: không thuộc trách nhiệm của tòa"
          emptyMessage="Vui lòng nhập lý do từ chối"
          confirmText="Từ chối đơn"
          variant="danger"
          loading={busy}
          onConfirm={(resultNote) =>
            runAction(() => incidentApi.reject(incident._id, { resultNote }), 'Đã từ chối đơn')
          }
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
};

export default IncidentDetailPage;
