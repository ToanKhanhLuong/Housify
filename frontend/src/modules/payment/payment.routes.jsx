// Route của module payment (UC-39). Path gốc theo constants/menus.js: Manager /payments, Customer /my-payments
// Chi tiết biên lai thanh toán: /payments/:id (Manager) và /my-payments/:id (Customer)
import { ROLE } from '../../constants/enums';
import PaymentListPage from './PaymentListPage';
import PaymentDetailPage from './PaymentDetailPage';

const paymentRoutes = [
  { path: '/payments', element: <PaymentListPage />, roles: [ROLE.MANAGER] },
  { path: '/payments/:id', element: <PaymentDetailPage />, roles: [ROLE.MANAGER] },
  { path: '/my-payments', element: <PaymentListPage />, roles: [ROLE.CUSTOMER] },
  { path: '/my-payments/:id', element: <PaymentDetailPage />, roles: [ROLE.CUSTOMER] },
];

export default paymentRoutes;
