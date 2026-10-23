// Logo + tên app, dùng ở Sidebar và trang đăng nhập
const Brand = () => (
    <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Housify" className="w-9 h-9 object-contain" />
        <div className="leading-tight">
            <div className="fw-semibold">Housify</div>
            <div className="small text-secondary">Quản lý nhà trọ</div>
        </div>
    </div>
);

export default Brand;