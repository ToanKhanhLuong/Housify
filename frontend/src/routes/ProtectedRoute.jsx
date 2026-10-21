// Chặn route: chưa đăng nhập → /login, sai role → /403
// requireBuilding: Manager chưa được phân công tòa chỉ dùng Hồ sơ, Đổi mật khẩu, Thông báo (BR-023)
// Bọc layout: <ProtectedRoute><MainLayout /></ProtectedRoute> · Làm route cha: <Route element={<ProtectedRoute roles={[ROLE.ADMIN]} />}>
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE } from '../constants/enums.js';
import Loading from '../components/common/Loading.jsx';
import ForbiddenPage from '../pages/public/ForbiddenPage.jsx';

export default function ProtectedRoute({ roles, requireBuilding = false, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loading fullScreen text="Đang kiểm tra đăng nhập..." />;

  // state.from: đăng nhập xong quay lại đúng trang đang mở
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />;

  if (requireBuilding && user.role === ROLE.MANAGER && !user.building) {
    return <ForbiddenPage embedded message="Bạn chưa được cấp quyền quản lý tòa nhà" />;
  }

  return children ?? <Outlet />;
}
