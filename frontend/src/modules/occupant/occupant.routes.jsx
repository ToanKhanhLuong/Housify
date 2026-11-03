// Route của module occupant (UC-30..33). Path gốc theo constants/menus.js: Manager /occupants, Customer /my-room
import { ROLE } from '../../constants/enums';
import MyRoomPage from './MyRoomPage';
import OccupantDetailPage from './OccupantDetailPage';
import OccupantListPage from './OccupantListPage';

const occupantRoutes = [
  { path: '/occupants', element: <OccupantListPage />, roles: [ROLE.MANAGER] },
  { path: '/occupants/:id', element: <OccupantDetailPage />, roles: [ROLE.MANAGER] },
  { path: '/my-room', element: <MyRoomPage />, roles: [ROLE.CUSTOMER] },
];

export default occupantRoutes;
