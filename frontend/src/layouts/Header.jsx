// Thanh trên cùng: nút mở menu (điện thoại), tiêu đề trang (hỗ trợ đường dẫn), chuông thông báo, menu tài khoản
import { useState } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BiChevronDown, BiKey, BiLogOut, BiMenu, BiUser } from 'react-icons/bi';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../constants/enums';
import { MENUS } from '../constants/menus';
import { ROLE_LABEL } from '../constants/statusLabels';
import ConfirmModal from '../components/ConfirmModal';
import NotificationBell from '../modules/notification/components/NotificationBell';

// Chữ cái viết tắt cho avatar: "Trần Văn Tùng" → "VT", "Admin" → "A"
const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Header = ({ onToggleMenu, title }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [showLogout, setShowLogout] = useState(false);

    // Xác định tiêu đề mặc định nếu không truyền từ prop
    const current = (MENUS[user?.role] || []).find(
        (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    );
    const displayTitle = title || current?.label || 'Housify';

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

            {/* Tiêu đề trang bên trái, hỗ trợ dạng đường dẫn hoặc chuỗi */}
            <div className="font-semibold text-base text-gray-900 truncate">
                {displayTitle}
            </div>

            <div className="flex items-center gap-2 ms-auto">
                {/* UC-41: chuông có số thông báo chưa đọc (giữ nguyên logic NotificationBell của Hiếu) */}
                <NotificationBell />

                <div className="w-[1px] h-6 bg-[#e1e3e6] mx-1" />

                {/* Nút tài khoản theo Topbar.dc.html */}
                <Dropdown align="end">
                    <Dropdown.Toggle
                        as="button"
                        className="flex items-center gap-2 h-10 px-2 border-0 bg-transparent rounded hover:bg-gray-100 transition-colors text-gray-800"
                        id="user-menu-toggle"
                    >
                        <span className="hf-av w-8 h-8 text-xs font-bold">
                            {getInitials(user?.name)}
                        </span>
                        <span className="d-none d-sm-flex flex-col text-left leading-tight">
                            <span className="text-xs font-semibold text-gray-900">{user?.name}</span>
                            <span className="text-[11px] text-gray-500">{ROLE_LABEL[user?.role] || 'Người dùng'}</span>
                        </span>
                        <BiChevronDown size={16} className="text-gray-500" />
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="shadow-lg border-[#e1e3e6] min-w-[200px] py-1">
                        {user?.role !== ROLE.ADMIN && (
                            <Dropdown.Item as={Link} to="/profile" className="flex items-center gap-2 py-2 text-sm text-gray-700">
                                <BiUser size={16} />
                                <span>Hồ sơ cá nhân</span>
                            </Dropdown.Item>
                        )}
                        <Dropdown.Item as={Link} to="/change-password" className="flex items-center gap-2 py-2 text-sm text-gray-700">
                            <BiKey size={16} />
                            <span>Đổi mật khẩu</span>
                        </Dropdown.Item>
                        <Dropdown.Divider className="my-1 border-gray-100" />
                        <Dropdown.Item
                            onClick={() => setShowLogout(true)}
                            className="flex items-center gap-2 py-2 text-sm text-[#a3241b] hover:bg-red-50"
                        >
                            <BiLogOut size={16} />
                            <span>Đăng xuất</span>
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </div>

            <ConfirmModal
                show={showLogout}
                title="Đăng xuất"
                message="Bạn có chắc muốn đăng xuất? Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống."
                confirmText="Đăng xuất"
                variant="danger"
                onConfirm={handleLogout}
                onCancel={() => setShowLogout(false)}
            />
        </header>
    );
};

export default Header;
