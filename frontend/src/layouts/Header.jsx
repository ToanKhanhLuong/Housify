// Thanh trên cùng: nút mở menu (điện thoại), tên mục đang mở, chuông thông báo, menu tài khoản
import { useState } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BiKey, BiLogOut, BiMenu, BiUser } from 'react-icons/bi';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../constants/enums';
import { MENUS } from '../constants/menus';
import { ROLE_LABEL } from '../constants/statusLabels';
import ConfirmModal from '../components/ConfirmModal';
import NotificationBell from '../modules/notification/components/NotificationBell';

// chữ cái đầu của tên gọi (chữ cuối trong họ tên): "Trần Văn Tùng" → "T"
const initialOf = (name = '') => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? '?';

const Header = ({ onToggleMenu }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [showLogout, setShowLogout] = useState(false);

    // mục menu đang mở, hiện tên ở đầu header
    const current = (MENUS[user.role] || []).find(
        (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    );

    // UC-02: xóa phiên rồi về trang đăng nhập; A1: bấm Hủy thì giữ nguyên phiên
    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <header className="flex items-center gap-3 h-14 px-4 bg-white border-bottom">
            <Button
                variant="secondary"
                size="sm"
                className="d-lg-none"
                onClick={onToggleMenu}
                aria-label="Mở menu"
            >
                <BiMenu size={20} />
            </Button>
            <span className="fw-semibold">{current?.label}</span>

            <div className="flex items-center gap-3 ms-auto">
                {/* UC-41: chuông có số thông báo chưa đọc */}
                <NotificationBell />
                <div className="vr" />
                <Dropdown align="end">
                    <Dropdown.Toggle
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2 bg-transparent border-0"
                    >
                        <span className="flex items-center justify-center w-7 h-7 rounded-circle bg-primary-subtle text-primary-emphasis fw-semibold">
                            {initialOf(user.name)}
                        </span>
                        <span className="d-none d-sm-block text-start leading-tight">
                            <span className="d-block fw-semibold">{user.name}</span>
                            <span className="d-block small text-secondary">{ROLE_LABEL[user.role]}</span>
                        </span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        {user.role !== ROLE.ADMIN && (
                            <Dropdown.Item as={Link} to="/profile" className="flex items-center gap-2">
                                <BiUser />
                                Hồ sơ cá nhân
                            </Dropdown.Item>
                        )}
                        <Dropdown.Item as={Link} to="/change-password" className="flex items-center gap-2">
                            <BiKey />
                            Đổi mật khẩu
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item
                            onClick={() => setShowLogout(true)}
                            className="flex items-center gap-2 text-danger"
                        >
                            <BiLogOut />
                            Đăng xuất
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </div>

            <ConfirmModal
                show={showLogout}
                title="Đăng xuất"
                message="Bạn có chắc muốn đăng xuất?"
                confirmText="Đăng xuất"
                variant="danger"
                onConfirm={handleLogout}
                onCancel={() => setShowLogout(false)}
            />
        </header>
    );
};

export default Header;