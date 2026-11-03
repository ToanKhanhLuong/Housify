// Khung kết quả xử lý đơn chấm dứt (UC-28, 29) theo trạng thái:
// - Hai bên, đã xác nhận: "Đã xác nhận điện tử" + Hợp lệ / Không hợp lệ (BE tính lại mã xác thực), người xác nhận,
//   thời điểm, IP, mã xác thực rút gọn. Tự động xác nhận sau 7 ngày: hiện câu BE trả (statusText)
// - Đơn phương, đã xác nhận: Admin đã phê duyệt lúc …
// - Chờ xử lý: chờ người đại diện xác nhận / chờ Admin duyệt. Bị từ chối / Đã hủy: lý do
// Giao diện ghi "Xác nhận điện tử", không dùng chữ "Chữ ký số" (quy ước nhóm)
import { BiCheckShield, BiErrorCircle, BiTime, BiXCircle } from 'react-icons/bi';
import FieldRow from '../../../components/FieldRow';
import { TERMINATION_STATUS, TERMINATION_TYPE } from '../../../constants/enums';
import { formatDateTime } from '../../../utils/format';

const Box = ({ tone, icon: Icon, title, children }) => (
  <div className={`rounded border border-${tone}-subtle bg-${tone}-subtle px-3 py-3 flex flex-col gap-2`}>
    <span className={`flex items-center gap-2 fw-semibold text-${tone}-emphasis`}>
      <Icon size={20} />
      {title}
    </span>
    {children}
  </div>
);

const TerminationOutcome = ({ termination }) => {
  const { status, type } = termination;
  const isMutual = type === TERMINATION_TYPE.MUTUAL;

  if (status === TERMINATION_STATUS.PENDING) {
    return (
      <Box tone="warning" icon={BiTime} title={isMutual ? 'Chờ người đại diện xác nhận' : 'Chờ Admin phê duyệt'}>
        <span className="small">
          {isMutual
            ? 'Khách nhận thông báo và email, xác nhận điện tử trên tài khoản của mình. Hệ thống nhắc vào ngày 1, 3, 6 và tự xác nhận sau 7 ngày nếu khách không phản hồi.'
            : 'Đơn đơn phương được gửi Admin xem xét. Hợp đồng vẫn đang hiệu lực cho tới khi đơn được duyệt và tới ngày hiệu lực.'}
        </span>
      </Box>
    );
  }

  if (status === TERMINATION_STATUS.REJECTED) {
    return (
      <Box tone="danger" icon={BiXCircle} title="Admin đã từ chối đơn">
        <span className="small">
          Lý do: <span className="fw-semibold">{termination.rejectReason || '—'}</span>
        </span>
        <span className="small">Hợp đồng vẫn giữ nguyên đang hiệu lực.</span>
      </Box>
    );
  }

  if (status === TERMINATION_STATUS.CANCELLED) {
    return (
      <Box tone="secondary" icon={BiXCircle} title="Đơn đã hủy">
        <span className="small">
          Lý do hủy: <span className="fw-semibold">{termination.cancelReason || '—'}</span>
        </span>
      </Box>
    );
  }

  // CONFIRMED
  if (!isMutual) {
    return (
      <Box tone="success" icon={BiCheckShield} title="Admin đã phê duyệt đơn đơn phương">
        <span className="small">Lúc {formatDateTime(termination.handledAt)}</span>
      </Box>
    );
  }

  const confirmation = termination.electronicConfirmation;
  if (confirmation?.autoConfirmed) {
    return (
      <Box tone="success" icon={BiCheckShield} title="Đã xác nhận">
        <span className="small">{confirmation.statusText}</span>
        <span className="small">Lúc {formatDateTime(confirmation.confirmedAt)}</span>
      </Box>
    );
  }

  const valid = termination.signatureValid === true;
  return (
    <Box
      tone={valid ? 'success' : 'danger'}
      icon={valid ? BiCheckShield : BiErrorCircle}
      title={confirmation?.statusText ?? 'Đã xác nhận điện tử'}
    >
      <span
        className={`hf-badge self-start ${valid ? 'hf-b-ok' : 'hf-b-red'}`}
        title="Hệ thống tính lại mã xác thực từ nội dung đơn, người xác nhận và thời điểm xác nhận rồi so với mã đã lưu"
      >
        {confirmation?.validityText ?? (valid ? 'Hợp lệ' : 'Không hợp lệ')}
      </span>
      <div className="small">
        <FieldRow label="Người xác nhận">{confirmation?.signedBy ?? termination.signedBy}</FieldRow>
        <FieldRow label="Thời điểm">{formatDateTime(confirmation?.signedAt ?? termination.signedAt)}</FieldRow>
        <FieldRow label="Địa chỉ IP">{confirmation?.handledIp || '—'}</FieldRow>
        <FieldRow label="Mã xác thực">
          <span className="font-monospace">{confirmation?.shortSignature ?? termination.shortSignature}</span>
        </FieldRow>
      </div>
    </Box>
  );
};

export default TerminationOutcome;
