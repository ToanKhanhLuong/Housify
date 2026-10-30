// Khung xương khi đang tải danh sách: các thanh xám phẳng đúng chỗ của dữ liệu, bố cục không nhảy khi dữ liệu về
// <SkeletonRows rows={5} columns={4} media />   media: chừa ô ảnh 40px ở đầu mỗi dòng
import { Placeholder } from 'react-bootstrap';

const SkeletonRows = ({ rows = 5, columns = 4, media = false }) => (
  <div aria-busy="true" aria-label="Đang tải">
    {Array.from({ length: rows }, (_, row) => (
      <div key={row} className="flex items-center gap-3 px-3 py-3 border-bottom">
        {media && <Placeholder className="flex-none w-10 h-10 rounded bg-body-tertiary" />}
        {Array.from({ length: columns }, (_, column) => (
          // cột đầu rộng hơn (tên), các cột sau ngắn dần như số liệu thật
          <Placeholder
            key={column}
            className={`rounded bg-body-tertiary ${column === 0 ? 'flex-[2]' : 'flex-1'}`}
            size="lg"
          />
        ))}
      </div>
    ))}
  </div>
);

export default SkeletonRows;
