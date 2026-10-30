// Ảnh thu nhỏ của phòng trong danh sách (UC-19): ảnh đầu tiên của phòng
// Chưa có ảnh thì ô xám trơn giữ chỗ, để mã phòng các dòng vẫn thẳng một mép
import { Image } from 'react-bootstrap';

const RoomThumb = ({ room }) => {
  const url = room.images?.[0];

  return (
    <div className="flex-none w-10 h-10 overflow-hidden rounded bg-body-tertiary">
      {url && <Image src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
};

export default RoomThumb;
