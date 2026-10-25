// Route của module building: tòa nhà, tầng, nội quy (UC-12..15, 23) phía Admin
import { ROLE } from '../../constants/enums';
import BuildingListPage from './BuildingListPage';
import BuildingDetailPage from './BuildingDetailPage';

const buildingRoutes = [
  { path: '/buildings', element: <BuildingListPage />, roles: [ROLE.ADMIN] },
  { path: '/buildings/:id', element: <BuildingDetailPage />, roles: [ROLE.ADMIN] },
];

export default buildingRoutes;
