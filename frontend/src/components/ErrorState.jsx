// Báo lỗi ngay trong khối không tải được (không phủ cả màn hình): một câu nói rõ cái gì lỗi + nút "Thử lại"
// <ErrorState message="Không tải được danh sách phòng." detail={error.message} onRetry={reload} />
import { Button } from 'react-bootstrap';
import { BiErrorCircle, BiRefresh } from 'react-icons/bi';

const ErrorState = ({ message, detail, onRetry }) => (
  <div
    className="flex flex-col items-center justify-center gap-2 py-5 px-3 text-center"
    role="alert"
  >
    <BiErrorCircle size={32} className="text-danger" aria-hidden="true" />
    <p className="mb-0 fw-semibold">{message}</p>
    {detail && <p className="mb-0 small text-secondary">{detail}</p>}
    {onRetry && (
      <Button
        variant="secondary"
        size="sm"
        className="flex items-center gap-1 mt-1"
        onClick={onRetry}
      >
        <BiRefresh size={16} />
        Thử lại
      </Button>
    )}
  </div>
);

export default ErrorState;
