// Thẻ "Hình ảnh CCCD" ở chi tiết Manager (UC-09), chỉ xem. Link xem do GET /managers/:id trả: cccdFrontUrl, cccdBackUrl
// Bấm vào ảnh để mở ảnh gốc ở tab mới (link xem có hạn, tải lại trang là có link mới)
import { Card, Image } from 'react-bootstrap';
import { BiIdCard } from 'react-icons/bi';

// mỗi mặt là một thẻ con rộng tối đa ~670px (48rem), nằm giữa nửa thẻ của nó; khung ảnh cao cố định ~315px
// (h-[22.5rem]) nên kéo rộng mà không cao thêm. Khung rộng hơn tỉ lệ thẻ CCCD nên ảnh dùng object-contain:
// hiện đủ cả thẻ, không bị cắt, 2 bên là nền xám
const CccdImage = ({ label, url }) => (
  <Card className="w-full max-w-[48rem] mx-auto">
    <Card.Body className="p-3">
      <div className="small fw-semibold mb-2">{label}</div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block h-[22.5rem] overflow-hidden rounded border bg-body-tertiary cursor-zoom-in"
          title="Xem ảnh gốc"
        >
          <Image
            src={url}
            alt={label}
            className="h-full w-full object-contain transition-opacity hover:opacity-75"
          />
        </a>
      ) : (
        <div className="h-[22.5rem] rounded border bg-body-tertiary flex flex-col items-center justify-center gap-2 text-secondary">
          <BiIdCard size={32} />
          <span className="small">Chưa có ảnh CCCD</span>
        </div>
      )}
    </Card.Body>
  </Card>
);

const CccdImages = ({ frontUrl, backUrl }) => (
  <Card>
    <Card.Header className="bg-transparent px-4 py-3">
      <h2 className="h6 fw-semibold mb-1 flex items-center gap-2">
        <BiIdCard className="text-secondary" />
        Hình ảnh CCCD
      </h2>
      <div className="small text-secondary">Lưu trữ ảnh căn cước để đối chiếu hồ sơ nhân sự.</div>
    </Card.Header>
    <Card.Body className="p-4">
      <div className="grid md:grid-cols-2 gap-4">
        <CccdImage label="CCCD mặt trước" url={frontUrl} />
        <CccdImage label="CCCD mặt sau" url={backUrl} />
      </div>
    </Card.Body>
  </Card>
);

export default CccdImages;
