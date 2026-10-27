// Route của module notification: UC-41 xem thông báo (cả 3 role)
import { ROLE } from '../../constants/enums';
import NotificationsPage from './NotificationsPage';

const notificationRoutes = [
    {
        path: '/notifications',
        element: <NotificationsPage />,
        roles: [ROLE.ADMIN, ROLE.MANAGER, ROLE.CUSTOMER],
    },
];

export default notificationRoutes;
