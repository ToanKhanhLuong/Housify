// Route của module contract (UC-24..27, 46). Path gốc theo constants/menus.js: Manager /contracts, Customer /my-contract
import { ROLE } from '../../constants/enums';
import ContractListPage from './ContractListPage';
import ContractCreatePage from './ContractCreatePage';
import ContractDetailPage from './ContractDetailPage';
import MyContractPage from './MyContractPage';

const contractRoutes = [
  { path: '/contracts', element: <ContractListPage />, roles: [ROLE.MANAGER] },
  { path: '/contracts/new', element: <ContractCreatePage />, roles: [ROLE.MANAGER] }, // ?roomId= mở sẵn phòng
  { path: '/contracts/:id', element: <ContractDetailPage />, roles: [ROLE.MANAGER] },
  { path: '/my-contract', element: <MyContractPage />, roles: [ROLE.CUSTOMER] },
];

export default contractRoutes;
