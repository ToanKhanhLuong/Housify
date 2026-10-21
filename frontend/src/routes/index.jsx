// Khai báo route toàn app, chia khối theo role. Trang ↔ UC xem docs/use_case.md
// Mỗi người thêm route trang mình vào đúng khối role, không sửa khối của người khác
import { Routes, Route } from 'react-router-dom';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';
import ForbiddenPage from '../pages/public/ForbiddenPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import HomePage from '../pages/common/HomePage.jsx';
import { ROLE } from '../constants/enums.js';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Tạm thời để kiểm tra app chạy. Có LoginPage thì đổi thành chuyển hướng về /login */}
      <Route path="/" element={<div className="p-4">Housify đang chạy</div>} />

      {/* --- public: không cần đăng nhập (đăng nhập, quên mật khẩu, kích hoạt) --- */}

      {/* Mọi trang sau đăng nhập dùng chung MainLayout, menu tự đổi theo role */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* --- common: mọi role đã đăng nhập (hồ sơ, đổi mật khẩu, thông báo) --- */}

        {/* --- admin: /admin/... --- */}
        <Route path="/admin" element={<ProtectedRoute roles={[ROLE.ADMIN]} />}>
          <Route index element={<HomePage />} />
        </Route>

        {/* --- manager: /manager/... --- */}
        <Route path="/manager" element={<ProtectedRoute roles={[ROLE.MANAGER]} />}>
          <Route index element={<HomePage />} />
          <Route element={<ProtectedRoute requireBuilding />}>
            {/* Trang cần tòa (tòa nhà, hợp đồng, hóa đơn...) đặt trong khối này – BR-023 */}
          </Route>
        </Route>

        {/* --- customer: /customer/... --- */}
        <Route path="/customer" element={<ProtectedRoute roles={[ROLE.CUSTOMER]} />}>
          <Route index element={<HomePage />} />
        </Route>
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
