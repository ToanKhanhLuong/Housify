// Route của module activation: trang công khai mở từ link trong email (không roles, không guestOnly)
// Iter 1: Manager kích hoạt tài khoản (UC-08). Iter 2 thêm /activate/contract/:token (UC-06)
import ActivateManagerPage from './ActivateManagerPage';

const activationRoutes = [{ path: '/activate/manager/:token', element: <ActivateManagerPage /> }];

export default activationRoutes;
