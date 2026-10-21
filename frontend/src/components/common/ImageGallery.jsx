// Xem ảnh ở trang chi tiết (tòa nhà, phòng): 1 ảnh lớn + dải ảnh nhỏ để chọn. Không có ảnh thì hiện ô trống
import { useState } from 'react';
import { FaImage } from 'react-icons/fa';

export default function ImageGallery({ images = [], emptyText = 'Chưa có ảnh' }) {
  const [active, setActive] = useState(0);
  const current = images[active] || images[0];

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border border-dashed border-gray-300 bg-gray-50 text-gray-500">
        <FaImage size={28} />
        {emptyText}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[4/3] w-full overflow-hidden border border-gray-200 bg-gray-50">
        <img src={current} alt="" className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`aspect-[4/3] overflow-hidden border-2 bg-transparent p-0 ${
                url === current ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
