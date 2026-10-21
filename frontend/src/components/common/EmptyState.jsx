// Khối báo danh sách rỗng. children: nút hành động nếu cần (vd "Thêm dịch vụ")
import { FaInbox } from 'react-icons/fa';

export default function EmptyState({ message = 'Chưa có dữ liệu', icon: Icon = FaInbox, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-gray-500">
      <Icon size={32} />
      <div>{message}</div>
      {children}
    </div>
  );
}
