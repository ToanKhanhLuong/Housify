// Route của module building: tòa nhà, tầng, nội quy (UC-12..15, 23)
// Admin: /buildings, /buildings/:id · Manager: /my-building (tòa mình phụ trách, chỉ xem) · Customer: /rules (nội quy tòa đang ở)
import { ROLE } from '../../constants/enums';
import BuildingListPage from './BuildingListPage';
import BuildingDetailPage from './BuildingDetailPage';
import MyBuildingPage from './MyBuildingPage';
import RulesPage from './RulesPage';

const buildingRoutes = [
  { path: '/buildings', element: <BuildingListPage />, roles: [ROLE.ADMIN] },
  { path: '/buildings/:id', element: <BuildingDetailPage />, roles: [ROLE.ADMIN] },
  { path: '/my-building', element: <MyBuildingPage />, roles: [ROLE.MANAGER] },
  { path: '/rules', element: <RulesPage />, roles: [ROLE.CUSTOMER] },
];

export default buildingRoutes;
