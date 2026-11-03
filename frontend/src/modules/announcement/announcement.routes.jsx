// Route của module announcement (UC-40). Path gốc theo constants/menus.js: Manager /announcements
import { ROLE } from '../../constants/enums';
import AnnouncementPage from './AnnouncementPage';

const announcementRoutes = [
  { path: '/announcements', element: <AnnouncementPage />, roles: [ROLE.MANAGER] },
];

export default announcementRoutes;
