// Menu sidebar và trang chủ theo role. Path ở đây là CHUẨN: module khai báo route phải dùng đúng path này
import {
    BiBarChartAlt2, BiBook, BiBroadcast, BiBuildings, BiCategory, BiCreditCard, BiDoorOpen, BiErrorCircle,
    BiFile, BiGridAlt, BiGroup, BiIdCard, BiPlug, BiReceipt, BiXCircle,
} from 'react-icons/bi';
import { ROLE } from './enums';

// Trang mở ra ngay sau khi đăng nhập (UC-01 bước 4)
export const HOME_PATH = {
    [ROLE.ADMIN]: '/dashboard', // UC-07
    [ROLE.MANAGER]: '/dashboard', // UC-47
    [ROLE.CUSTOMER]: '/rules',
};

// BR-023: Manager chưa được phân công tòa chỉ dùng được các trang này
export const NO_BUILDING_PATHS = ['/profile', '/change-password', '/notifications'];

// Thông báo (UC-41) không nằm trong menu: vào bằng chuông trên Header → "Xem tất cả" (/notifications)
// Mục có disabled: true là thuộc Iter 2–3 (chưa làm, hiển thị mờ theo Sidebar.dc.html)
export const MENUS = {
    [ROLE.ADMIN]: [
        { label: 'Tổng quan', path: '/dashboard', icon: BiGridAlt, disabled: false }, // UC-07
        { label: 'Tòa nhà', path: '/buildings', icon: BiBuildings, disabled: false }, // UC-12→15, 23
        { label: 'Loại phòng', path: '/room-types', icon: BiCategory, disabled: false }, // UC-20
        { label: 'Dịch vụ', path: '/services', icon: BiPlug, disabled: false }, // UC-21, 22 (/services/prices)
        { label: 'Quản lý Manager', path: '/managers', icon: BiIdCard, disabled: false }, // UC-08→11
        { label: 'Đơn chấm dứt', path: '/terminations', icon: BiXCircle, disabled: false }, // UC-29
        { label: 'Báo cáo', path: '/reports', icon: BiBarChartAlt2, disabled: false }, // UC-48
    ],
    [ROLE.MANAGER]: [
        { label: 'Tổng quan', path: '/dashboard', icon: BiGridAlt, disabled: false }, // UC-47
        { label: 'Tòa của tôi', path: '/my-building', icon: BiBuildings, disabled: false }, // UC-13 chỉ xem
        { label: 'Hợp đồng', path: '/contracts', icon: BiFile, disabled: false }, // UC-24→29, 45, 46
        { label: 'Cư dân', path: '/occupants', icon: BiGroup, disabled: false }, // UC-30→33
        { label: 'Hóa đơn', path: '/invoices', icon: BiReceipt, disabled: false }, // UC-34→37
        { label: 'Thanh toán', path: '/payments', icon: BiCreditCard, disabled: false }, // UC-39
        { label: 'Sự cố', path: '/incidents', icon: BiErrorCircle, disabled: false }, // UC-44
        { label: 'Thông báo chung', path: '/announcements', icon: BiBroadcast, disabled: false }, // UC-40
        { label: 'Báo cáo', path: '/reports', icon: BiBarChartAlt2, disabled: false }, // UC-48
    ],
    [ROLE.CUSTOMER]: [
        { label: 'Hợp đồng của tôi', path: '/my-contract', icon: BiFile, disabled: false }, // UC-25
        { label: 'Phòng của tôi', path: '/my-room', icon: BiDoorOpen, disabled: false }, // UC-31
        { label: 'Hóa đơn', path: '/my-invoices', icon: BiReceipt, disabled: false }, // UC-36, 38
        { label: 'Thanh toán', path: '/my-payments', icon: BiCreditCard, disabled: false }, // UC-39
        { label: 'Sự cố', path: '/my-incidents', icon: BiErrorCircle, disabled: false }, // UC-43
        { label: 'Nội quy', path: '/rules', icon: BiBook, disabled: false }, // UC-23
    ],
};
