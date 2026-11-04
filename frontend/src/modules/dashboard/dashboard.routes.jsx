// Route của module dashboard (UC-07, 47, 48). Path gốc theo constants/menus.js: /dashboard, /reports; trang tự đổi theo user.role
import { ROLE } from '../../constants/enums';
import DashboardPage from './DashboardPage';
import ReportPage from './ReportPage';

const dashboardRoutes = [
  { path: '/dashboard', element: <DashboardPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
  { path: '/reports', element: <ReportPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
];

export default dashboardRoutes;
