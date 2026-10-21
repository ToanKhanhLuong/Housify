// Chi tiết phòng – Manager (UC-19, chỉ đọc: không sửa, xóa, đổi trạng thái)
// Iter 2 (UC-24, Hưng): thêm nút "Tạo hợp đồng" khi phòng đang Trống
import { Breadcrumb } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { roomApi } from '../../../api/room.api.js';
import useFetch from '../../../hooks/useFetch.js';
import PageHeader from '../../../components/common/PageHeader.jsx';
import Loading from '../../../components/common/Loading.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import RoomInfo from '../../../components/room/RoomInfo.jsx';

export default function RoomDetailPage() {
  const { id } = useParams();
  const { data: room, loading, error } = useFetch(() => roomApi.get(id), [id]);

  if (loading) return <Loading />;
  if (error || !room) return <EmptyState message={error?.message || 'Phòng không tồn tại hoặc đã bị xóa.'} />;

  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/manager/building?tab=rooms' }}>
          Phòng
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Phòng {room.roomNumber}</Breadcrumb.Item>
      </Breadcrumb>
      <PageHeader title={`Phòng ${room.roomNumber}`} subtitle={`${room.roomTypeId?.name} | Tầng ${room.floorNumber}`} />
      <RoomInfo room={room} />
    </div>
  );
}
