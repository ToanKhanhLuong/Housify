// Khai báo route toàn app, chia khối theo role. Trang ↔ UC xem docs/use-cases.md
// Mỗi người thêm route trang mình vào đúng khối role, không sửa khối của người khác
import { Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import LandingPage from '../pages/public/LandingPage/LandingPage.jsx';
import RoomListPage from '../pages/public/RoomList/RoomListPage.jsx';
import RoomDetailPage from '../pages/public/RoomDetail/RoomDetailPage.jsx';
import LoginPage from '../pages/public/LoginPage/LoginPage.jsx';
import DocsPage from '../pages/public/Docs/DocsPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* --- public: không cần đăng nhập (trang chủ, danh sách phòng, chi tiết phòng, đăng nhập, điều khoản) --- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/rooms" element={<RoomListPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:slug" element={<DocsPage />} />
      </Route>

      {/* --- common: mọi role đã đăng nhập (hồ sơ, đổi mật khẩu, thông báo) --- */}

      {/* --- admin: /admin/... --- */}

      {/* --- manager: /manager/... --- */}

      {/* --- customer: /customer/... --- */}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
