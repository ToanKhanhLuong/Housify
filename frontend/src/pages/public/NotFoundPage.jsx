// Trang 404: đường dẫn không tồn tại
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-gray-500">Không tìm thấy trang bạn yêu cầu</p>
      <Button as={Link} to="/">
        Về trang chủ
      </Button>
    </div>
  );
}
