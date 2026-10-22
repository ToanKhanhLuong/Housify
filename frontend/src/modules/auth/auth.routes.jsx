// Route của module auth: đăng nhập (UC-01), đổi mật khẩu (UC-03). Quên mật khẩu, hồ sơ thêm vào đây khi làm tới
import { ROLE } from '../../constants/enums';
import LoginPage from './LoginPage';
import ChangePasswordPage from './ChangePasswordPage';

const authRoutes = [
  { path: '/login', element: <LoginPage />, guestOnly: true },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    roles: [ROLE.ADMIN, ROLE.MANAGER, ROLE.CUSTOMER],
  },
];

export default authRoutes;
