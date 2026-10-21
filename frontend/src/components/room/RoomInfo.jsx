// Thông tin phòng (UC-19, iter 1): các trường của phòng + ảnh. Dùng chung Admin và Manager
// Iter 3 thêm bên dưới: hợp đồng đang hiệu lực, cư dân đang ở, lịch sử hợp đồng (module contract, occupant)
import { Card } from 'react-bootstrap';
import ImageGallery from '../common/ImageGallery.jsx';
import MoneyText from '../common/MoneyText.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';

function Fact({ label, children }) {
  return (
    <div className="border border-gray-200 bg-white px-3 py-2">
      <div className="small text-muted">{label}</div>
      <div className="mt-1 fw-semibold">{children}</div>
    </div>
  );
}

export default function RoomInfo({ room }) {
  return (
    <Card>
      <Card.Body className="grid gap-4 md:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <Fact label="Giá thuê / tháng">
              <MoneyText value={room.rentPrice} />
            </Fact>
            <Fact label="Tiền cọc">
              <MoneyText value={room.deposit} />
            </Fact>
            <Fact label="Trạng thái">
              <StatusBadge group="ROOM_STATUS" value={room.status} />
            </Fact>
            <Fact label="Tầng">Tầng {room.floorNumber}</Fact>
            <Fact label="Diện tích">{room.area} m²</Fact>
            <Fact label="Sức chứa tối đa">{room.capacity} người</Fact>
          </div>
          <dl className="m-0 grid grid-cols-[140px_1fr] gap-y-2">
            <dt className="fw-normal text-muted">Loại phòng</dt>
            <dd className="m-0">{room.roomTypeId?.name}</dd>
            <dt className="fw-normal text-muted">Tòa nhà</dt>
            <dd className="m-0">{room.buildingId?.name}</dd>
            <dt className="fw-normal text-muted">Ngày tạo</dt>
            <dd className="m-0">{formatDate(room.createdAt)}</dd>
          </dl>
        </div>
        <ImageGallery images={room.images} emptyText="Phòng chưa có ảnh" />
      </Card.Body>
    </Card>
  );
}
