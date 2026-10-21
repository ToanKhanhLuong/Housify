// Khung cho trang chưa đăng nhập: đăng nhập, quên mật khẩu, kích hoạt
// Trang tự đặt Card và độ rộng, ví dụ: <Card className="w-full max-w-md shadow-sm">
import { Outlet } from 'react-router-dom';

const AuthLayout = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-body-tertiary p-3">
        <h1 className="h3 fw-bold text-primary mb-4">Housify</h1>
        <div className="w-full flex justify-center">
            <Outlet />
        </div>
    </div>
);

export default AuthLayout;