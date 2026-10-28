// Thẻ "Hình ảnh CCCD" ở trang hồ sơ (Manager, Customer), chỉ xem. Link xem do API hồ sơ trả: cccdFrontUrl, cccdBackUrl
// Bấm vào ảnh để mở ảnh gốc ở tab mới (link xem có hạn, tải lại trang là có link mới)
import { Card, Image } from 'react-bootstrap';
import { BiIdCard } from 'react-icons/bi';

// khung 16 : 10 ≈ tỉ lệ thẻ CCCD 85,6 × 54 mm: ảnh CCCD phủ kín khung (object-cover) mà gần như không bị cắt
// rê chuột lên ảnh: con trỏ kính lúp + ảnh mờ nhẹ để biết bấm được (xem ảnh gốc ở tab mới)
const CccdImage = ({ label, url }) => (
  <Card>
    <Card.Body className="p-3">
      <div className="small fw-semibold mb-2">{label}</div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block aspect-[16/10] overflow-hidden rounded border cursor-zoom-in"
          title="Xem ảnh gốc"
        >
          <Image
            src={url}
            alt={label}
            className="h-full w-full object-cover transition-opacity hover:opacity-75"
          />
        </a>
      ) : (
        <div className="aspect-[16/10] rounded border border-dashed bg-body-tertiary flex flex-col items-center justify-center gap-2 text-secondary">
          <BiIdCard size={32} />
          <span className="small">Chưa có ảnh</span>
        </div>
      )}
    </Card.Body>
  </Card>
);

const CccdImages = ({ frontUrl, backUrl }) => (
  <Card>
    <Card.Body className="p-4">
      <div className="mb-3">
        <h2 className="h6 fw-semibold mb-1">Hình ảnh CCCD</h2>
        <div className="small text-secondary">
          Lưu giữ ảnh mặt trước và mặt sau trong hồ sơ của bạn.
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <CccdImage label="CCCD mặt trước" url={frontUrl} />
        <CccdImage label="CCCD mặt sau" url={backUrl} />
      </div>
    </Card.Body>
  </Card>
);

export default CccdImages;
