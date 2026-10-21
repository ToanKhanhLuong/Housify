// Trang 404. Đã đăng nhập thì hiện trong khung chính (vẫn còn sidebar) để biết mình chưa bị đăng xuất
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';

const NotFoundPage = () => {
    const { user } = useAuth();

    const content = (
        <div className="flex flex-col items-center justify-center gap-3 py-5">
            <h1 className="display-4 fw-bold">404</h1>
            <p className="text-secondary">Không tìm thấy trang</p>
            <Button as={Link} to="/" variant="primary">
                Về trang chủ
            </Button>
        </div>
    );

    return user ? <MainLayout>{content}</MainLayout> : content;
};

export default NotFoundPage;