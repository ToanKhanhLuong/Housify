// Route của module roomType: quản lý loại phòng (UC-20), chỉ Admin
import { ROLE } from './frontend/src/constants/enums';
import RoomTypeListPage from './frontend/src/modules/roomType/RoomTypeListPage';

const roomTypeRoutes = [
  { path: '/room-types', element: <RoomTypeListPage />, roles: [ROLE.ADMIN] },
];

export default roomTypeRoutes;
