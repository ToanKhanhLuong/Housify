// Ô quản lý nhiều ảnh (ImageGalleryPicker) theo Main.dc.html và BuildingDetail.dc.html
// Gồm: Ảnh đại diện lớn, hàng ảnh thu nhỏ bên dưới, nút "+ Tải ảnh lên"
import { useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { BiPlus, BiTrash, BiStar } from 'react-icons/bi';
import { toast } from 'react-toastify';
import uploadApi from '../api/upload.api';

const ImageGalleryPicker = ({
    images = [],
    onChange,
    label = 'Ảnh',
    hint = 'Ảnh đầu tiên là ảnh đại diện của tòa. Mỗi ảnh tối đa 5MB.',
    disabled = false,
    maxImages = 10,
    className = '',
}) => {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        if (images.length + files.length > maxImages) {
            toast.warning(`Tối đa ${maxImages} ảnh.`);
            return;
        }

        setUploading(true);
        try {
            const newUrls = [];
            for (const file of files) {
                if (file.size > 5 * 1024 * 1024) {
                    toast.error(`Ảnh ${file.name} vượt quá 5MB`);
                    continue;
                }
                const res = await uploadApi.uploadPublic(file);
                if (res.data?.url) {
                    newUrls.push(res.data.url);
                }
            }
            if (newUrls.length > 0 && onChange) {
                onChange([...images, ...newUrls]);
            }
        } catch (err) {
            toast.error(err.message || 'Tải ảnh lên thất bại');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input để có thể chọn lại file cùng tên
        }
    };

    const handleRemoveImage = (index) => {
        if (disabled || !onChange) return;
        const next = images.filter((_, i) => i !== index);
        onChange(next);
    };

    const handleSetCover = (index) => {
        if (disabled || !onChange || index === 0) return;
        const target = images[index];
        const next = [target, ...images.filter((_, i) => i !== index)];
        onChange(next);
    };

    const coverImage = images[0];

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && <label className="text-xs font-semibold text-gray-700">{label}</label>}

            {/* Ảnh đại diện lớn */}
            <div className="w-full h-44 rounded border border-[#e1e3e6] overflow-hidden bg-gray-50 flex items-center justify-center relative">
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt="Ảnh đại diện"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="hf-ph w-full h-full border-0 rounded-none text-xs text-gray-400">
                        Chưa có ảnh đại diện
                    </div>
                )}
                {coverImage && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[11px] font-semibold bg-black/60 text-white">
                        Ảnh đại diện
                    </span>
                )}
            </div>

            {/* Hàng ảnh nhỏ bên dưới + Nút thêm ảnh */}
            <div className="flex flex-wrap gap-2 pt-1 items-center">
                {images.map((url, idx) => (
                    <div
                        key={url + idx}
                        className="relative group w-20 h-16 rounded border border-[#e1e3e6] overflow-hidden bg-gray-100 shrink-0"
                    >
                        <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />

                        {/* Thao tác khi hover: đặt làm cover, xóa */}
                        {!disabled && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                                {idx !== 0 && (
                                    <button
                                        type="button"
                                        className="p-1 hover:text-yellow-400 border-0 bg-transparent text-white"
                                        title="Đặt làm ảnh đại diện"
                                        onClick={() => handleSetCover(idx)}
                                    >
                                        <BiStar size={14} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="p-1 hover:text-red-400 border-0 bg-transparent text-white"
                                    title="Xóa ảnh"
                                    onClick={() => handleRemoveImage(idx)}
                                >
                                    <BiTrash size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Nút + Tải ảnh lên */}
                {!disabled && images.length < maxImages && (
                    <label className="hf-ph w-20 h-16 cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-colors shrink-0 m-0">
                        {uploading ? (
                            <Spinner animation="border" size="sm" className="text-gray-500" />
                        ) : (
                            <>
                                <BiPlus size={18} className="text-gray-600" />
                                <span className="text-[11px] text-gray-600 font-medium">+ Thêm ảnh</span>
                            </>
                        )}
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                            disabled={uploading}
                        />
                    </label>
                )}
            </div>

            {hint && <span className="text-xs text-gray-500">{hint}</span>}
        </div>
    );
};

export default ImageGalleryPicker;
