// UC-19: khung ảnh ở trang chi tiết phòng. Ảnh lớn + hàng ảnh nhỏ; bấm ảnh lớn mở khung xem phóng to (← → để chuyển)
// Chưa có ảnh: khung trống, Admin có nút "Thêm ảnh" (mở form sửa phòng UC-17 để tải ảnh)
import { useEffect, useState } from 'react';
import { Button, Image, Modal } from 'react-bootstrap';
import { BiChevronLeft, BiChevronRight, BiImage, BiImageAdd } from 'react-icons/bi';

const RoomGallery = ({ images = [], name, onAdd }) => {
  const [current, setCurrent] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  const total = images.length;

  // khung xem đang mở: phím ← → chuyển ảnh (nghe ở cửa sổ vì Modal không nhận phím trực tiếp)
  useEffect(() => {
    if (!showViewer || total < 2) return undefined;
    const handleKey = (event) => {
      if (event.key === 'ArrowLeft') setCurrent((value) => (value - 1 + total) % total);
      if (event.key === 'ArrowRight') setCurrent((value) => (value + 1) % total);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showViewer, total]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-56 rounded border border-dashed bg-body-tertiary text-secondary">
        <BiImage size={40} />
        <span>Phòng chưa có ảnh</span>
        {onAdd && (
          <Button variant="secondary" size="sm" className="flex items-center gap-1" onClick={onAdd}>
            <BiImageAdd size={16} />
            Thêm ảnh
          </Button>
        )}
      </div>
    );
  }

  // ảnh vừa bị bỏ trong form sửa thì quay về ảnh đầu
  const index = current < images.length ? current : 0;
  const goTo = (next) => setCurrent((next + total) % total);

  return (
    <div>
      <Button
        variant="secondary"
        className="group block w-full h-56 p-0 overflow-hidden border bg-body-tertiary"
        onClick={() => setShowViewer(true)}
        aria-label="Xem ảnh lớn"
      >
        <Image
          src={images[index]}
          alt={`${name} – ảnh ${index + 1}`}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
        />
      </Button>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {images.map((url, position) => (
            <Button
              key={url}
              variant="secondary"
              className={`h-14 p-0 overflow-hidden border ${position === index ? 'border-primary border-2' : ''}`}
              onClick={() => setCurrent(position)}
              aria-label={`Ảnh ${position + 1}`}
            >
              <Image src={url} alt="" className="h-full w-full object-cover" />
            </Button>
          ))}
        </div>
      )}

      <Modal show={showViewer} onHide={() => setShowViewer(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">
            {name} · ảnh {index + 1}/{images.length}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 bg-body-tertiary">
          <Image
            src={images[index]}
            alt={`${name} – ảnh ${index + 1}`}
            className="block w-full aspect-video object-contain"
          />
        </Modal.Body>
        {images.length > 1 && (
          <Modal.Footer className="justify-content-start">
            <Button
              variant="secondary"
              className="flex items-center"
              onClick={() => goTo(index - 1)}
            >
              <BiChevronLeft size={18} />
              Ảnh trước
            </Button>
            <Button
              variant="secondary"
              className="flex items-center"
              onClick={() => goTo(index + 1)}
            >
              Ảnh sau
              <BiChevronRight size={18} />
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default RoomGallery;
