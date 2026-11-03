// Route của module payment (UC-39). Path gốc theo constants/menus.js: Manager /payments, Customer /my-payments
// Hai vai trò dùng chung trang danh sách, trang tự đổi theo user.role. Chi tiết giao dịch mở dạng popup, không có trang riêng
import { ROLE } from '../../constants/enums';
import PaymentListPage from './PaymentListPage';

const paymentRoutes = [
  { path: '/payments', element: <PaymentListPage />, roles: [ROLE.MANAGER] },
  { path: '/my-payments', element: <PaymentListPage />, roles: [ROLE.CUSTOMER] },
];

export default paymentRoutes;
