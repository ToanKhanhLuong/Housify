// Trang 403: không có quyền vào trang. embedded: hiện trong khung MainLayout thay vì cả màn hình
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext.jsx';
import { HOME_PATH } from '../../constants/menus.js';

export default function ForbiddenPage({ message = 'Bạn không có quyền truy cập trang này', embedded = false }) {
  const { user } = useAuth();
  const homePath = (user && HOME_PATH[user.role]) || '/';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${embedded ? 'py-10' : 'min-h-screen'}`}
    >
      <h1 className="text-5xl font-bold">403</h1>
      <p className="mb-0 text-gray-500">{message}</p>
      <Button as={Link} to={homePath}>
        Về trang chủ
      </Button>
    </div>
  );
}
