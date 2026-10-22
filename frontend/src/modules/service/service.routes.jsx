// Route của module service: UC-21 danh mục dịch vụ (Admin)
import { ROLE } from '../../constants/enums';
import ServiceListPage from './ServiceListPage';

const serviceRoutes = [{ path: '/services', element: <ServiceListPage />, roles: [ROLE.ADMIN] }];

export default serviceRoutes;
