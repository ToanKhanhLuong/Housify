// Khung chung cho cả 3 role sau khi đăng nhập: sidebar trái, header trên, nội dung ở giữa
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../constants/enums';
import { NO_BUILDING_PATHS } from '../constants/menus';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = ({ children }) => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const [showMenu, setShowMenu] = useState(false); // mở sidebar trên điện thoại

    // BR-023, UC-08 A3: Manager chưa được phân công tòa chỉ dùng được vài trang
    const blocked =
        user.role === ROLE.MANAGER && !user.building && !NO_BUILDING_PATHS.includes(pathname);

    return (
        <div className="flex min-h-screen">
            <Sidebar show={showMenu} onHide={() => setShowMenu(false)} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header onToggleMenu={() => setShowMenu(true)} />
                <main className="flex-1 p-4 bg-body-tertiary">
                    {blocked ? (
                        <Alert variant="warning">Bạn chưa được cấp quyền quản lý tòa nhà</Alert>
                    ) : (
                        children ?? <Outlet />
                    )}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;