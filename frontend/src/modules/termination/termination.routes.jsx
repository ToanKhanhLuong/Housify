// Route của module termination (UC-28, 29). Path gốc theo constants/menus.js: Admin /terminations
// Link từ thông báo (notification.utils.js): Admin → /terminations/:id, Customer → /my-contract (trang đó dẫn sang đơn)
import { ROLE } from '../../constants/enums';
import TerminationCreatePage from './TerminationCreatePage';
import TerminationDetailPage from './TerminationDetailPage';
import TerminationListPage from './TerminationListPage';

const terminationRoutes = [
  { path: '/terminations', element: <TerminationListPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
  { path: '/terminations/new', element: <TerminationCreatePage />, roles: [ROLE.MANAGER] }, // ?contractId=
  { path: '/terminations/:id', element: <TerminationDetailPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
  { path: '/my-terminations/:id', element: <TerminationDetailPage />, roles: [ROLE.CUSTOMER] },
];

export default terminationRoutes;
