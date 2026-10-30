// Thẻ hiển thị một đối tượng kiểu Odoo Kanban (Building, Room, Manager...)
// Bấm được cả khối, hover viền đổi sang màu tím mận #714B67.
import { Link } from 'react-router-dom';

const ItemCard = ({
    to,
    onClick,
    image,
    placeholderText = 'Chưa có ảnh',
    title,
    badge,
    subtitle,
    stats,
    footer,
    children,
    className = '',
}) => {
    const cardContent = (
        <>
            {/* Ảnh đại diện hoặc khung placeholder */}
            {image !== undefined && (
                <div className="w-full h-32 overflow-hidden border-b border-[#e1e3e6] shrink-0 bg-gray-50 flex items-center justify-center">
                    {image ? (
                        <img
                            src={image}
                            alt={title || ''}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `<div class="hf-ph w-full h-full border-0">${placeholderText}</div>`;
                            }}
                        />
                    ) : (
                        <div className="hf-ph w-full h-full border-0 rounded-none text-xs text-gray-400">
                            {placeholderText}
                        </div>
                    )}
                </div>
            )}

            {/* Nội dung bên trong thẻ */}
            <div className="p-3.5 flex flex-col gap-2 flex-1">
                {/* Header thẻ: Tiêu đề + Badge */}
                {(title || badge) && (
                    <div className="flex items-start justify-between gap-2">
                        {title && <span className="font-bold text-base text-gray-900 leading-snug">{title}</span>}
                        {badge && <span className="shrink-0">{badge}</span>}
                    </div>
                )}

                {/* Dòng phụ (Địa chỉ, vai trò...) */}
                {subtitle && <div className="text-xs text-gray-500 leading-relaxed">{subtitle}</div>}

                {/* Các chỉ số thống kê dạng chấm (stats) */}
                {stats && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700 pt-1">
                        {stats}
                    </div>
                )}

                {children}

                {/* Chân thẻ (phân cách bằng đường kẻ mảnh) */}
                {footer && (
                    <div className="pt-2 mt-auto border-t border-[#eef0f2] text-xs text-gray-600 flex items-center justify-between">
                        {footer}
                    </div>
                )}
            </div>
        </>
    );

    const baseClass = `hf-tcard p-0 overflow-hidden flex flex-col ${className}`;

    if (to) {
        return (
            <Link to={to} className={baseClass}>
                {cardContent}
            </Link>
        );
    }

    return (
        <div role="button" tabIndex={0} onClick={onClick} className={baseClass}>
            {cardContent}
        </div>
    );
};

export default ItemCard;
