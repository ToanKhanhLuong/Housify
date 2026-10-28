// Trang chỉ dành cho người CHƯA đăng nhập (đăng nhập, quên mật khẩu). Đã đăng nhập → về trang chủ
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

const GuestRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return <Loading />;
    if (user) return <Navigate to="/" replace />;

    return <Outlet />;
};

export default GuestRoute;