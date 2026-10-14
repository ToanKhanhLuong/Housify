// Khai báo route toàn app, chia khối theo role. Trang ↔ UC xem docs/use-cases.md
// Mỗi người thêm route trang mình vào đúng khối role, không sửa khối của người khác
import { Routes, Route } from 'react-router-dom';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Tạm thời để kiểm tra app chạy. Có LoginPage thì đổi thành chuyển hướng về /login */}
      <Route path="/" element={<div className="p-4">Housify đang chạy</div>} />

      {/* --- public: không cần đăng nhập (đăng nhập, quên mật khẩu, kích hoạt) --- */}

      {/* --- common: mọi role đã đăng nhập (hồ sơ, đổi mật khẩu, thông báo) --- */}

      {/* --- admin: /admin/... --- */}

      {/* --- manager: /manager/... --- */}

      {/* --- customer: /customer/... --- */}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
