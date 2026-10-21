// Khung cho trang chưa đăng nhập: đăng nhập, quên mật khẩu, kích hoạt
// Trang tự đặt Card và độ rộng, ví dụ: <Card className="w-full max-w-sm"><Card.Body className="p-4">…
import { Outlet } from 'react-router-dom';
import Brand from './Brand';

const AuthLayout = () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-body-tertiary p-3">
        <Brand />
        <div className="w-full flex justify-center">
            <Outlet />
        </div>
        <div className="small text-secondary">© 2026 Housify</div>
    </div>
);

export default AuthLayout;