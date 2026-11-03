// Route của module invoice (UC-34..37). Path gốc theo constants/menus.js: Manager /invoices, Customer /my-invoices
// Hai vai trò dùng chung trang danh sách và chi tiết, trang tự đổi theo user.role
import { ROLE } from '../../constants/enums';
import InvoiceListPage from './InvoiceListPage';
import InvoiceDetailPage from './InvoiceDetailPage';
import InvoiceCreatePage from './InvoiceCreatePage';

const invoiceRoutes = [
  { path: '/invoices', element: <InvoiceListPage />, roles: [ROLE.MANAGER] },
  { path: '/invoices/new', element: <InvoiceCreatePage />, roles: [ROLE.MANAGER] }, // UC-34, ?contractId= mở sẵn phòng
  { path: '/invoices/:id', element: <InvoiceDetailPage />, roles: [ROLE.MANAGER] },
  { path: '/my-invoices', element: <InvoiceListPage />, roles: [ROLE.CUSTOMER] },
  { path: '/my-invoices/:id', element: <InvoiceDetailPage />, roles: [ROLE.CUSTOMER] },
];

export default invoiceRoutes;
