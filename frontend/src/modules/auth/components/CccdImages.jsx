// Ảnh CCCD 2 mặt ở chế độ chỉ xem (hồ sơ Manager, Customer). Link xem do API hồ sơ trả: cccdFrontUrl, cccdBackUrl
// Bấm vào ảnh để mở ảnh gốc ở tab mới (link xem có hạn, tải lại trang là có link mới)
import { Image } from 'react-bootstrap';

const CccdImage = ({ label, url }) => (
  <div>
    <div className="fw-semibold mb-2">{label}</div>
    <div className="flex items-center justify-center h-64 overflow-hidden rounded border bg-body-tertiary">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block h-full w-full"
          title="Xem ảnh gốc"
        >
          <Image src={url} alt={label} className="h-full w-full object-contain" />
        </a>
      ) : (
        <span className="text-secondary">Chưa có ảnh</span>
      )}
    </div>
  </div>
);

const CccdImages = ({ frontUrl, backUrl }) => (
  <div className="grid md:grid-cols-2 gap-3">
    <CccdImage label="Ảnh CCCD mặt trước" url={frontUrl} />
    <CccdImage label="Ảnh CCCD mặt sau" url={backUrl} />
  </div>
);

export default CccdImages;
