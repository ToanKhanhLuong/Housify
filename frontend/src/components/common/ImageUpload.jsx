// Ô chọn ảnh dùng chung: chọn xong tải lên BE ngay (trước khi bấm Lưu form), kết quả trả qua onChange
// kind="public" (tòa, phòng, sự cố): value là url, hoặc mảng url khi multiple
// kind="cccd" (ảnh bảo vệ): value là publicId; xem lại ảnh cũ bằng previewUrl (signed URL do API hồ sơ trả)
// Ví dụ: <ImageUpload multiple value={form.images} onChange={(images) => setForm({ ...form, images })} error={errors.images} />
import { useEffect, useRef, useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { FaCamera, FaTimes } from 'react-icons/fa';
import uploadApi from '../../api/upload.api.js';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB, khớp giới hạn của BE

export default function ImageUpload({
  kind = 'public',
  multiple = false,
  max = 10,
  value,
  onChange,
  label,
  required = false,
  error,
  disabled = false,
  previewUrl,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState(null); // ảnh CCCD vừa chọn, xem tại máy

  const isCccd = kind === 'cccd';
  const allowMultiple = multiple && !isCccd;

  // Giải phóng ảnh xem trước cũ khi đổi ảnh / rời trang
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  // Ảnh đang hiện: [{ key, src }]
  let images = [];
  if (isCccd) {
    if (value) images = [{ key: value, src: localPreview || previewUrl }];
  } else if (allowMultiple) {
    images = (value || []).map((url) => ({ key: url, src: url }));
  } else if (value) {
    images = [{ key: value, src: value }];
  }
  const canAdd = !disabled && !uploading && (allowMultiple ? images.length < max : images.length === 0);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = ''; // chọn lại đúng file đó vẫn chạy
    if (files.length === 0) return;

    if (files.some((file) => !file.type.startsWith('image/'))) {
      setUploadError('Chỉ chấp nhận file ảnh');
      return;
    }
    if (files.some((file) => file.size > MAX_SIZE)) {
      setUploadError('Ảnh vượt quá 5MB, vui lòng nén hoặc chọn ảnh khác');
      return;
    }
    if (allowMultiple && images.length + files.length > max) {
      setUploadError(`Chỉ được tải tối đa ${max} ảnh`);
      return;
    }

    setUploadError('');
    setUploading(true);
    try {
      if (isCccd) {
        const res = await uploadApi.uploadCccd(files[0]);
        setLocalPreview(URL.createObjectURL(files[0]));
        onChange(res.data.publicId);
      } else {
        const results = await Promise.all(files.map((file) => uploadApi.uploadPublic(file)));
        const urls = results.map((res) => res.data.url);
        onChange(allowMultiple ? [...(value || []), ...urls] : urls[0]);
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (key) => {
    setUploadError('');
    if (allowMultiple) {
      onChange((value || []).filter((url) => url !== key));
    } else {
      setLocalPreview(null);
      onChange('');
    }
  };

  const shownError = uploadError || error;

  return (
    <Form.Group className="mb-3">
      {label && (
        <Form.Label>
          {label}
          {required && <span className="text-danger"> *</span>}
        </Form.Label>
      )}

      <div className="flex flex-wrap gap-2">
        {images.map((image) => (
          <div key={image.key} className="relative h-24 w-24 overflow-hidden border bg-gray-100">
            {image.src ? (
              <img src={image.src} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-1 text-center text-xs text-gray-500">
                Đã có ảnh
              </div>
            )}
            {!disabled && (
              <Button
                variant="danger"
                size="sm"
                className="absolute top-0 end-0 flex items-center px-1 py-1 leading-none"
                onClick={() => handleRemove(image.key)}
                aria-label="Bỏ ảnh"
              >
                <FaTimes size={10} />
              </Button>
            )}
          </div>
        ))}

        {canAdd && (
          <Button
            variant="light"
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 border text-gray-500"
            onClick={() => inputRef.current?.click()}
          >
            <FaCamera />
            <span className="text-xs">Chọn ảnh</span>
          </Button>
        )}

        {uploading && (
          <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 border text-gray-500">
            <Spinner animation="border" size="sm" />
            <span className="text-xs">Đang tải...</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={allowMultiple}
        className="hidden"
        onChange={handleFiles}
      />

      {shownError ? (
        <div className="invalid-feedback d-block">{shownError}</div>
      ) : (
        <Form.Text muted>Ảnh JPG, PNG… tối đa 5MB{allowMultiple ? `, tối đa ${max} ảnh` : ''}</Form.Text>
      )}
    </Form.Group>
  );
}
