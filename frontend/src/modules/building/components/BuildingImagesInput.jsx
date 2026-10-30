// Ảnh tòa nhà (UC-12, UC-13): danh sách ảnh đã có + ô tải thêm ảnh. value là mảng url, ảnh công khai
// Bỏ ảnh chỉ bỏ khỏi danh sách, không xóa file trên Cloudinary (module upload)
import { useState } from 'react';
import { Button, Form, Image } from 'react-bootstrap';
import { BiX } from 'react-icons/bi';
import ImageUpload from '../../../components/ImageUpload';

const BuildingImagesInput = ({ value = [], onChange, disabled = false }) => {
  // đổi key để ô tải ảnh trống lại sau mỗi lần thêm
  const [uploadKey, setUploadKey] = useState(0);

  const handleAdd = (url) => {
    onChange([...value, url]);
    setUploadKey((key) => key + 1);
  };

  const handleRemove = (url) => onChange(value.filter((item) => item !== url));

  return (
    <div>
      <Form.Label>Ảnh tòa nhà</Form.Label>
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          {value.map((url) => (
            <div
              key={url}
              className="group relative h-24 overflow-hidden rounded border bg-body-tertiary"
            >
              <Image
                src={url}
                alt="Ảnh tòa nhà"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-0 end-0 m-1 p-0 flex transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
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

export default BuildingImagesInput;
