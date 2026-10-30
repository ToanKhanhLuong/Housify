// UC-13 (Manager): xem tòa mình phụ trách – dải số liệu, sơ đồ tầng, nội quy, chỉ đọc
// Tòa lấy từ /auth/me (user.building). Manager chưa được phân công thì layout đã chặn trước (BR-023)
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';
import BuildingDetailPage from './BuildingDetailPage';

const MyBuildingPage = () => {
  const { user } = useAuth();

  if (!user.building?._id) {
    return <EmptyState message="Bạn chưa được cấp quyền quản lý tòa nhà" />;
  }

  // key: đổi tòa (Admin phân công lại) thì trang tải lại từ đầu
  return <BuildingDetailPage key={user.building._id} buildingId={user.building._id} />;
};

export default MyBuildingPage;
