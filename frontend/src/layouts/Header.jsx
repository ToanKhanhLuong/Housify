// Thanh trên cùng: nút mở menu (điện thoại), chuông thông báo, menu tài khoản
import { useState } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { BiBell, BiKey, BiLogOut, BiMenu, BiUser, BiUserCircle } from 'react-icons/bi';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../constants/enums';
import { ROLE_LABEL } from '../constants/statusLabels';
import ConfirmModal from '../components/ConfirmModal';

const Header = ({ onToggleMenu }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showLogout, setShowLogout] = useState(false);

    // UC-02: xóa phiên rồi về trang đăng nhập; A1: bấm Hủy thì giữ nguyên phiên
    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <header className="flex items-center gap-3 px-4 py-2 bg-white border-bottom">
            <Button
                variant="secondary"
                size="sm"
                className="d-lg-none"
                onClick={onToggleMenu}
                aria-label="Mở menu"
            >
                <BiMenu size={20} />
            </Button>

            <div className="flex items-center gap-3 ms-auto">
                {/* tạm thời: module notification (UC-41) thay bằng NotificationBell có số chưa đọc */}
                <Link to="/notifications" className="text-secondary" aria-label="Thông báo">
                    <BiBell size={22} />
                </Link>

                <Dropdown align="end">
                    <Dropdown.Toggle variant="secondary" size="sm">
                        <BiUserCircle size={18} className="me-1" />
                        {user.name}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Header>{ROLE_LABEL[user.role]}</Dropdown.Header>
                        {user.role !== ROLE.ADMIN && (
                            <Dropdown.Item as={Link} to="/profile">
                                <BiUser className="me-2" />
                                Hồ sơ cá nhân
                            </Dropdown.Item>
                        )}
                        <Dropdown.Item as={Link} to="/change-password">
                            <BiKey className="me-2" />
                            Đổi mật khẩu
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item onClick={() => setShowLogout(true)} className="text-danger">
                            <BiLogOut className="me-2" />
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