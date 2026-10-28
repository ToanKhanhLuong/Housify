// Route của module room: danh sách, chi tiết phòng (UC-16..19). Admin toàn quyền, Manager chỉ xem tòa mình
import { ROLE } from '../../constants/enums';
import RoomListPage from './RoomListPage';
import RoomDetailPage from './RoomDetailPage';

const roomRoutes = [
  { path: '/rooms', element: <RoomListPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
  { path: '/rooms/:id', element: <RoomDetailPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
];

export default roomRoutes;
