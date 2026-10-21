// Tiêu đề trang + nút hành động bên phải (vd "Thêm mới"). Dùng đầu mỗi trang cho đồng bộ
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="mb-1">{title}</h4>
        {subtitle && <div className="text-gray-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
