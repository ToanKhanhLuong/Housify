// Khung trang sau đăng nhập, dùng chung cho Admin, Manager, Customer: sidebar (menu tự đổi theo role) + topbar + nội dung
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function MainLayout() {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar show={showMenu} onHide={() => setShowMenu(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setShowMenu(true)} />
        <main className="flex-1 p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
