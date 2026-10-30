// Route của module building: tòa nhà, tầng, nội quy (UC-12..15, 23)
// Admin: /buildings, /buildings/:id · Manager: /my-building (tòa mình phụ trách, chỉ xem)
import { ROLE } from '../../constants/enums';
import BuildingListPage from './BuildingListPage';
import BuildingDetailPage from './BuildingDetailPage';
import MyBuildingPage from './MyBuildingPage';

const buildingRoutes = [
  { path: '/buildings', element: <BuildingListPage />, roles: [ROLE.ADMIN] },
  { path: '/buildings/:id', element: <BuildingDetailPage />, roles: [ROLE.ADMIN] },
  { path: '/my-building', element: <MyBuildingPage />, roles: [ROLE.MANAGER] },
];

export default buildingRoutes;
