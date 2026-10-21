// Trang chủ tạm sau đăng nhập cho cả 3 role. Iter 3 thay bằng dashboard (UC-07 Admin, UC-47 Manager)
import { Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE } from '../../constants/enums.js';
import PageHeader from '../../components/common/PageHeader.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const isManager = user.role === ROLE.MANAGER;

  return (
    <div>
      <PageHeader title={`Xin chào, ${user.name}`} />

      {isManager && !user.building && (
        <Alert variant="warning">
          Bạn chưa được cấp quyền quản lý tòa nhà. Hiện bạn chỉ dùng được Hồ sơ, Đổi mật khẩu và Thông báo.
        </Alert>
      )}
      {isManager && user.building && (
        <p>
          Tòa nhà đang quản lý: <strong>{user.building.name}</strong>
          {user.building.address && ` – ${user.building.address}`}
        </p>
      )}
    </div>
  );
}
