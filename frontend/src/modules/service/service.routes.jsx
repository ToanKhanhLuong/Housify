// Route của module service: UC-21 danh mục dịch vụ, UC-22 giá dịch vụ theo tòa (Admin)
import { ROLE } from '../../constants/enums';
import ServiceListPage from './ServiceListPage';
import ServicePricePage from './ServicePricePage';

const serviceRoutes = [
    { path: '/services', element: <ServiceListPage />, roles: [ROLE.ADMIN] },
    { path: '/services/prices', element: <ServicePricePage />, roles: [ROLE.ADMIN] },
];

export default serviceRoutes;
