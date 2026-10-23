// Ảnh CCCD 2 mặt ở chế độ chỉ xem (hồ sơ Manager, Customer). Link xem do API hồ sơ trả: cccdFrontUrl, cccdBackUrl
import { Image } from 'react-bootstrap';

const CccdImage = ({ label, url }) => (
  <div>
    <div className="fw-semibold mb-2">{label}</div>
    <div className="flex items-center justify-center h-40 overflow-hidden rounded border bg-body-tertiary">
      {url ? (
        <Image src={url} alt={label} className="h-full w-full object-contain" />
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
