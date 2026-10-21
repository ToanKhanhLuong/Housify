// Hiện khi không có dữ liệu. message lấy đúng câu trong UC, vd UC-19 A1: "Không tìm thấy phòng phù hợp"
import { BiFolderOpen } from 'react-icons/bi';

const EmptyState = ({ message = 'Chưa có dữ liệu', children }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-5 text-secondary">
        <BiFolderOpen size={40} />
        <p className="mb-0">{message}</p>
        {children}
    </div>
);

export default EmptyState;