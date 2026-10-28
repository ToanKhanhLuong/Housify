// Route của module manager: quản lý tài khoản Manager (UC-08..11), chỉ Admin
import { ROLE } from '../../constants/enums';
import ManagerListPage from './ManagerListPage';
import ManagerDetailPage from './ManagerDetailPage';

const managerRoutes = [
  { path: '/managers', element: <ManagerListPage />, roles: [ROLE.ADMIN] },
  { path: '/managers/:id', element: <ManagerDetailPage />, roles: [ROLE.ADMIN] },
];

export default managerRoutes;
