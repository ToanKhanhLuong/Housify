// UC-24: sau khi tạo / gửi lại lời mời, BE trả rawToken (api.md: "dùng để test khi không có email thật")
// Chỉ hiện khi chạy dev (import.meta.env.DEV): link kích hoạt để Manager / nhóm thử mà không cần mở email
import { Alert, Button } from 'react-bootstrap';
import { BiCopy } from 'react-icons/bi';
import { toast } from 'react-toastify';
import { inviteLinkOf } from '../contractFormat';

const InviteLinkAlert = ({ rawToken, warning, onClose }) => {
  if (!rawToken && !warning) return null;
  const link = inviteLinkOf(rawToken);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Đã sao chép link mời');
    } catch {
      toast.error('Không sao chép được, hãy bôi đen link để chép');
    }
  };

  return (
    <Alert variant={warning ? 'warning' : 'info'} dismissible onClose={onClose} className="mb-0">
      {warning ? (
        <div className="fw-semibold">
          {warning}. Hãy bấm "Gửi lại lời mời" hoặc gửi link cho khách.
        </div>
      ) : (
        <div className="fw-semibold">
          Đã gửi lời mời ký hợp đồng qua email. Link có hiệu lực 24 giờ.
        </div>
      )}
      {import.meta.env.DEV && link && (
        <div className="flex flex-wrap items-center gap-2 mt-2 small">
          <span className="text-secondary">Link thử (chỉ hiện khi chạy dev):</span>
          <a href={link} target="_blank" rel="noreferrer" className="text-break">
            {link}
          </a>
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleCopy}
          >
            <BiCopy />
            Sao chép
          </Button>
        </div>
      )}
    </Alert>
  );
};

export default InviteLinkAlert;
