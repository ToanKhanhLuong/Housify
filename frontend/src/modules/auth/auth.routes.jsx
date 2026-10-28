// Route của module auth: đăng nhập (UC-01), đổi mật khẩu (UC-03), quên mật khẩu (UC-04), hồ sơ (UC-05 + Customer)
import { ROLE } from '../../constants/enums';
import LoginPage from './LoginPage';
import ChangePasswordPage from './ChangePasswordPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ProfilePage from './ProfilePage';

const authRoutes = [
  { path: '/login', element: <LoginPage />, guestOnly: true },
  { path: '/forgot-password', element: <ForgotPasswordPage />, guestOnly: true },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    roles: [ROLE.ADMIN, ROLE.MANAGER, ROLE.CUSTOMER],
  },
  { path: '/profile', element: <ProfilePage />, roles: [ROLE.MANAGER, ROLE.CUSTOMER] },
];

export default authRoutes;
