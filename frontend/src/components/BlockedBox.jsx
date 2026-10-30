// Khung lý do bị chặn (BlockedBox) theo mockup
// Hiển thị alert nền đỏ nhạt, viền đỏ, icon cảnh báo khi một thao tác nghiệp vụ bị chặn
import { BiErrorCircle } from 'react-icons/bi';

const BlockedBox = ({ title, reasons = [], message, children, className = '' }) => {
    return (
        <div className={`hf-blocked-box ${className}`} role="alert">
            <BiErrorCircle size={20} className="shrink-0 text-[#a3241b] mt-0.5" />
            <div className="flex-1 min-w-0">
                {title && <div className="font-semibold mb-1 text-sm">{title}</div>}
                {message && <div className="text-xs text-[#a3241b]">{message}</div>}
                {reasons.length > 0 && (
                    <ul className="list-disc list-inside text-xs space-y-1 mb-0 mt-1 pl-1">
                        {reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                        ))}
                    </ul>
                )}
                {children}
            </div>
        </div>
    );
};

export default BlockedBox;
