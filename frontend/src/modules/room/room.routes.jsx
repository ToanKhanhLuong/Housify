// Route của module room: chỉ giữ chi tiết phòng (UC-19). Danh sách phòng đã chuyển vào chi tiết tòa
import { ROLE } from '../../constants/enums';
import RoomDetailPage from './RoomDetailPage';

const roomRoutes = [
  { path: '/rooms/:id', element: <RoomDetailPage />, roles: [ROLE.ADMIN, ROLE.MANAGER] },
];

export default roomRoutes;
