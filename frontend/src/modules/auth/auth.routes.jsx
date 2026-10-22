// Route của module auth: đăng nhập (UC-01), đổi mật khẩu (UC-03), quên mật khẩu (UC-04). Hồ sơ thêm vào đây khi làm tới
import { ROLE } from '../../constants/enums';
import LoginPage from './LoginPage';
import ChangePasswordPage from './ChangePasswordPage';
import ForgotPasswordPage from './ForgotPasswordPage';

const authRoutes = [
  { path: '/login', element: <LoginPage />, guestOnly: true },
  { path: '/forgot-password', element: <ForgotPasswordPage />, guestOnly: true },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    roles: [ROLE.ADMIN, ROLE.MANAGER, ROLE.CUSTOMER],
  },
];

export default authRoutes;
