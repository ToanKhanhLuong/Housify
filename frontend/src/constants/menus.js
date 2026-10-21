// Menu sidebar và trang chủ theo role. Path ở đây là CHUẨN: module khai báo route phải dùng đúng path này
import {
    BiBarChartAlt2, BiBell, BiBook, BiBuildings, BiCategory, BiDoorOpen, BiErrorCircle,
    BiFile, BiGridAlt, BiGroup, BiHistory, BiIdCard, BiPlug, BiReceipt, BiSend, BiXCircle,
} from 'react-icons/bi';
import { ROLE } from './enums';

// Trang mở ra ngay sau khi đăng nhập (UC-01 bước 4)
export const HOME_PATH = {
    [ROLE.ADMIN]: '/dashboard',
    [ROLE.MANAGER]: '/dashboard',
    [ROLE.CUSTOMER]: '/my-contract',
};

// BR-023: Manager chưa được phân công tòa chỉ dùng được các trang này
export const NO_BUILDING_PATHS = ['/profile', '/change-password', '/notifications'];

export const MENUS = {
    [ROLE.ADMIN]: [
        { label: 'Tổng quan', path: '/dashboard', icon: BiGridAlt }, // UC-07
        { label: 'Tòa nhà', path: '/buildings', icon: BiBuildings }, // UC-12→15, 22, 23
        { label: 'Phòng', path: '/rooms', icon: BiDoorOpen }, // UC-16→19
        { label: 'Loại phòng', path: '/room-types', icon: BiCategory }, // UC-20
        { label: 'Dịch vụ', path: '/services', icon: BiPlug }, // UC-21
        { label: 'Quản lý Manager', path: '/managers', icon: BiIdCard }, // UC-08→11
        { label: 'Đơn chấm dứt', path: '/terminations', icon: BiXCircle }, // UC-29
        { label: 'Báo cáo', path: '/reports', icon: BiBarChartAlt2 }, // UC-48
        { label: 'Thông báo', path: '/notifications', icon: BiBell }, // UC-41
    ],
    [ROLE.MANAGER]: [
        { label: 'Tổng quan', path: '/dashboard', icon: BiGridAlt }, // UC-47
        { label: 'Tòa nhà', path: '/my-building', icon: BiBuildings }, // UC-13 chỉ xem
        { label: 'Phòng', path: '/rooms', icon: BiDoorOpen }, // UC-19
        { label: 'Hợp đồng', path: '/contracts', icon: BiFile }, // UC-24→29, 45, 46
        { label: 'Cư dân', path: '/occupants', icon: BiGroup }, // UC-30→33
        { label: 'Hóa đơn', path: '/invoices', icon: BiReceipt }, // UC-34→37
        { label: 'Lịch sử thanh toán', path: '/payments', icon: BiHistory }, // UC-39
        { label: 'Sự cố', path: '/incidents', icon: BiErrorCircle }, // UC-44
        { label: 'Gửi thông báo', path: '/announcements', icon: BiSend }, // UC-40
        { label: 'Báo cáo', path: '/reports', icon: BiBarChartAlt2 }, // UC-48
        { label: 'Thông báo', path: '/notifications', icon: BiBell }, // UC-41
    ],
    [ROLE.CUSTOMER]: [
        { label: 'Hợp đồng', path: '/my-contract', icon: BiFile }, // UC-25
        { label: 'Thành viên phòng', path: '/my-room', icon: BiGroup }, // UC-31
        { label: 'Hóa đơn', path: '/my-invoices', icon: BiReceipt }, // UC-36, 38
        { label: 'Lịch sử thanh toán', path: '/my-payments', icon: BiHistory }, // UC-39
        { label: 'Sự cố', path: '/my-incidents', icon: BiErrorCircle }, // UC-43
        { label: 'Nội quy', path: '/rules', icon: BiBook }, // UC-23
        { label: 'Thông báo', path: '/notifications', icon: BiBell }, // UC-41
    ],
};