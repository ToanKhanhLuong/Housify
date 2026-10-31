// /profile: một trang cho 2 role. Manager → hồ sơ UC-05 (sửa nhiều lần); Customer → hồ sơ người đại diện (UC-05, họ tên và số CCCD Manager sửa ở UC-31). Admin không có hồ sơ
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import ManagerProfile from './components/ManagerProfile';
import CustomerProfile from './components/CustomerProfile';

const ProfilePage = () => {
  const { user } = useAuth();
  return user.role === ROLE.MANAGER ? <ManagerProfile /> : <CustomerProfile />;
};

export default ProfilePage;
