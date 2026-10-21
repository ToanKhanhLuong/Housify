// Gom route của mọi module. Module KHÔNG sửa file này, chỉ khai báo trong <module>.routes.jsx của mình:
//   { path, element, roles }            trang trong hệ thống (có sidebar); roles = mảng ROLE được vào
//   { path, element, guestOnly: true }  trang cho người chưa đăng nhập (đăng nhập, quên mật khẩu)
//   { path, element }                   trang công khai (link kích hoạt)
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HOME_PATH } from '../constants/menus';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';
import NotFoundPage from './NotFoundPage';
import authRoutes from '../modules/auth/auth.routes';
import activationRoutes from '../modules/activation/activation.routes';
import managerRoutes from '../modules/manager/manager.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import buildingRoutes from '../modules/building/building.routes';
import roomRoutes from '../modules/room/room.routes';
import roomTypeRoutes from '../modules/roomType/roomType.routes';
import serviceRoutes from '../modules/service/service.routes';
import contractRoutes from '../modules/contract/contract.routes';
import occupantRoutes from '../modules/occupant/occupant.routes';
import invoiceRoutes from '../modules/invoice/invoice.routes';
import paymentRoutes from '../modules/payment/payment.routes';
import announcementRoutes from '../modules/announcement/announcement.routes';
import incidentRoutes from '../modules/incident/incident.routes';
import terminationRoutes from '../modules/termination/termination.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';




const allRoutes = [
    ...authRoutes,
    ...activationRoutes,
    ...managerRoutes,
    ...notificationRoutes,
    ...buildingRoutes,
    ...roomRoutes,
    ...roomTypeRoutes,
    ...serviceRoutes,
    ...contractRoutes,
    ...occupantRoutes,
    ...invoiceRoutes,
    ...paymentRoutes,
    ...announcementRoutes,
    ...incidentRoutes,
    ...terminationRoutes,
    ...dashboardRoutes,
];

const privateRoutes = allRoutes.filter((route) => route.roles);
const guestRoutes = allRoutes.filter((route) => route.guestOnly);
const publicRoutes = allRoutes.filter((route) => !route.roles && !route.guestOnly);

const renderRoute = ({ path, element }) => <Route key={path} path={path} element={element} />;

// "/" → trang chủ theo role (UC-01 bước 4)
const HomeRedirect = () => {
    const { user } = useAuth();
    return <Navigate to={HOME_PATH[user.role]} replace />;
};

const AppRoutes = () => (
    <Routes>
        <Route element={<AuthLayout />}>
            <Route element={<GuestRoute />}>{guestRoutes.map(renderRoute)}</Route>
            {publicRoutes.map(renderRoute)}
        </Route>

        <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
                <Route path="/" element={<HomeRedirect />} />
                {privateRoutes.map(({ path, element, roles }) => (
                    <Route key={path} element={<ProtectedRoute roles={roles} />}>
                        <Route path={path} element={element} />
                    </Route>
                ))}
            </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
    </Routes>
);

export default AppRoutes;