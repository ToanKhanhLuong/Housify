// Menu sidebar theo role + trang chủ của từng role. Có trang mới thì thêm mục vào đúng role
// needBuilding: true → Manager chưa được phân công tòa không thấy mục này (BR-023)
import {
  FaHome,
  FaUserTie,
  FaBuilding,
  FaDoorOpen,
  FaConciergeBell,
  FaMoneyBillWave,
  FaClipboardList,
  FaBell,
  FaUser,
  FaKey,
} from 'react-icons/fa';
import { ROLE } from './enums.js';

export const HOME_PATH = {
  [ROLE.ADMIN]: '/admin',
  [ROLE.MANAGER]: '/manager',
  [ROLE.CUSTOMER]: '/customer',
};

const ROLE_MENUS = {
  [ROLE.ADMIN]: [
    { label: 'Tổng quan', path: '/admin', icon: FaHome, end: true },
    { label: 'Quản lý Manager', path: '/admin/managers', icon: FaUserTie },
    { label: 'Tòa nhà', path: '/admin/buildings', icon: FaBuilding },
    { label: 'Loại phòng', path: '/admin/room-types', icon: FaDoorOpen },
    { label: 'Dịch vụ', path: '/admin/services', icon: FaConciergeBell },
    { label: 'Giá dịch vụ', path: '/admin/service-prices', icon: FaMoneyBillWave },
  ],
  [ROLE.MANAGER]: [
    { label: 'Tổng quan', path: '/manager', icon: FaHome, end: true },
    { label: 'Tòa nhà của tôi', path: '/manager/building', icon: FaBuilding, needBuilding: true },
  ],
  [ROLE.CUSTOMER]: [
    { label: 'Trang chủ', path: '/customer', icon: FaHome, end: true },
    { label: 'Nội quy', path: '/customer/rules', icon: FaClipboardList },
  ],
};

// Mục chung cho mọi role (BR-023: Manager chưa có tòa vẫn dùng được)
const ACCOUNT_MENU = [
  { label: 'Thông báo', path: '/notifications', icon: FaBell },
  { label: 'Hồ sơ', path: '/profile', icon: FaUser },
  { label: 'Đổi mật khẩu', path: '/change-password', icon: FaKey },
];

// Trả về các nhóm menu cho user đang đăng nhập: [{ title, items }]
export const getMenuSections = (user) => {
  if (!user) return [];
  const items = (ROLE_MENUS[user.role] || []).filter((item) => !item.needBuilding || user.building);
  return [
    { title: 'Quản lý', items },
    { title: 'Tài khoản', items: ACCOUNT_MENU },
  ];
};
