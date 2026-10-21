// Thanh trên cùng: nút mở menu (điện thoại), tên + vai trò người dùng, nút đăng xuất có xác nhận (UC-02)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { FaBars, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../constants/statusLabels.js';
import ConfirmModal from '../components/common/ConfirmModal.jsx';

export default function Topbar({ onOpenMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-3">
      <div className="flex items-center gap-2">
        <Button variant="light" className="md:hidden" onClick={onOpenMenu} aria-label="Mở menu">
          <FaBars />
        </Button>
        <span className="font-semibold">{user.building?.name || ROLE_LABELS[user.role]}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* UC-41: chuông thông báo gắn ở đây */}
        <div className="hidden text-end leading-tight sm:block">
          <div className="font-semibold">{user.name}</div>
          <div className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</div>
        </div>
        <Button variant="light" size="sm" className="flex items-center gap-1" onClick={() => setConfirmLogout(true)}>
          <FaSignOutAlt />
          <span>Đăng xuất</span>
        </Button>
      </div>

      <ConfirmModal
        show={confirmLogout}
        title="Đăng xuất"
        message="Bạn có chắc muốn đăng xuất?"
        confirmText="Đăng xuất"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </header>
  );
}
