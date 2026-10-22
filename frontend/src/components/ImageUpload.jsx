// Chọn 1 ảnh, xem trước, mặc định tải lên ngay qua POST /uploads
// Ảnh công khai: <ImageUpload label="Ảnh phòng" value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
// Ảnh CCCD:      <ImageUpload label="CCCD mặt trước" kind="CCCD" previewUrl={cccdFrontUrl} onChange={(publicId) => ...} />
// Gửi kèm form multipart (UC-06 kích hoạt): thêm upload={false}, onChange nhận File
import { useEffect, useRef, useState } from 'react';
import { Button, Form, Image, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { BiImageAdd } from 'react-icons/bi';
import uploadApi from '../api/upload.api';

const MAX_SIZE = 5 * 1024 * 1024; // khớp giới hạn 5MB của backend

const ImageUpload = ({
    label,
    kind = 'PUBLIC',
    value,
    previewUrl,
    onChange,
    error,
    required = false,
    upload = true,
    disabled = false,
}) => {
    const inputRef = useRef(null);
    const [localPreview, setLocalPreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    // dọn link ảnh tạm khi đổi ảnh hoặc rời trang
    useEffect(
        () => () => {
            if (localPreview) URL.revokeObjectURL(localPreview);
        },
        [localPreview],
    );

    // ảnh CCCD không xem được bằng publicId, phải có previewUrl do BE cấp
    const shown = localPreview || previewUrl || (kind === 'PUBLIC' ? value : null);

    const handleSelect = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // cho phép chọn lại đúng file vừa chọn
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Chỉ chấp nhận file ảnh');
            return;
        }
        if (file.size > MAX_SIZE) {
            toast.error('Ảnh vượt quá 5MB');
            return;
        }

        setLocalPreview(URL.createObjectURL(file));
        if (!upload) {
            onChange(file);
            return;
        }

        setUploading(true);
        try {
            const res = await uploadApi.upload(file, kind);
            onChange(kind === 'CCCD' ? res.data.publicId : res.data.url);
        } catch (err) {
            setLocalPreview(null);
            toast.error(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Form.Group className="mb-3">
            {label && (
                <Form.Label>
                    {label}
                    {required && <span className="text-danger ms-1">*</span>}
                </Form.Label>
            )}
            <div
                className={`flex items-center justify-center h-40 overflow-hidden rounded border bg-body-tertiary ${error ? 'border-danger' : ''}`}
            >
                {shown ? (
                    <Image src={shown} alt={label} className="h-full w-full object-contain" />
                ) : (
                    <BiImageAdd size={36} className="text-secondary" />
                )}
            </div>
            <div className="flex items-center gap-2 mt-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled || uploading}
                >
                    {uploading && <Spinner animation="border" size="sm" className="me-2" />}
                    {shown ? 'Đổi ảnh' : 'Chọn ảnh'}
                </Button>
                <small className="text-secondary">Ảnh JPG, PNG, tối đa 5MB</small>
            </div>
            {/* ô chọn file thật bị ẩn, bấm nút ở trên để mở */}
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleSelect} />
            {error && <div className="invalid-feedback d-block">{error}</div>}
        </Form.Group>
    );
};

export default ImageUpload;