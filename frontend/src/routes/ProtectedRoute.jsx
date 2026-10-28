// Chặn trang cần đăng nhập. roles: mảng ROLE được vào; bỏ trống = ai đăng nhập cũng vào được
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

const ProtectedRoute = ({ roles }) => {
    const { user, loading } = useAuth();

    if (loading) return <Loading />;
    if (!user) return <Navigate to="/login" replace />;
    // sai role → về trang chủ của role mình
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

    return <Outlet />;
};

export default ProtectedRoute;