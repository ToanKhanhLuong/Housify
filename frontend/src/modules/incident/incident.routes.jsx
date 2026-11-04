// Route của module incident (UC-43, 44). Path gốc theo constants/menus.js: Manager /incidents, Customer /my-incidents
// Hai vai trò dùng chung trang danh sách và chi tiết, trang tự đổi theo user.role
import { ROLE } from '../../constants/enums';
import IncidentDetailPage from './IncidentDetailPage';
import IncidentListPage from './IncidentListPage';

const incidentRoutes = [
  { path: '/incidents', element: <IncidentListPage />, roles: [ROLE.MANAGER] },
  { path: '/incidents/:id', element: <IncidentDetailPage />, roles: [ROLE.MANAGER] },
  { path: '/my-incidents', element: <IncidentListPage />, roles: [ROLE.CUSTOMER] },
  { path: '/my-incidents/:id', element: <IncidentDetailPage />, roles: [ROLE.CUSTOMER] },
];

export default incidentRoutes;
