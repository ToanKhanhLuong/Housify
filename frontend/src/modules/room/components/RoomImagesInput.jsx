// Ảnh phòng (UC-16, UC-17): danh sách ảnh đã có + ô tải thêm ảnh. value là mảng url, ảnh công khai
// Bỏ ảnh chỉ bỏ khỏi danh sách, không xóa file trên Cloudinary (module upload)
import { useState } from 'react';
import { Button, Form, Image } from 'react-bootstrap';
import { BiX } from 'react-icons/bi';
import ImageUpload from '../../../components/ImageUpload';

const RoomImagesInput = ({ value = [], onChange, disabled = false }) => {
  // đổi key để ô tải ảnh trống lại sau mỗi lần thêm
  const [uploadKey, setUploadKey] = useState(0);

  const handleAdd = (url) => {
    onChange([...value, url]);
    setUploadKey((key) => key + 1);
  };

  const handleRemove = (url) => onChange(value.filter((item) => item !== url));

  return (
    <div>
      <Form.Label>Ảnh phòng</Form.Label>
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          {value.map((url) => (
            <div
              key={url}
              className="relative h-24 overflow-hidden rounded border bg-body-tertiary"
            >
              <Image src={url} alt="Ảnh phòng" className="h-full w-full object-cover" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-0 end-0 m-1 p-0 flex"
                onClick={() => handleRemove(url)}
                disabled={disabled}
                aria-label="Bỏ ảnh"
              >
                <BiX size={18} />
              </Button>
            </div>
          ))}
        </div>
      )}
      <ImageUpload key={uploadKey} onChange={handleAdd} disabled={disabled} />
    </div>
  );
};

export default RoomImagesInput;
