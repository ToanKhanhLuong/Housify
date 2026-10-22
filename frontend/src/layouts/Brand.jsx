// Logo + tên app, dùng ở Sidebar và trang đăng nhập
const Brand = () => (
    <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-white fw-bold">H</div>
        <div className="leading-tight">
            <div className="fw-semibold">Housify</div>
            <div className="small text-secondary">Quản lý nhà trọ</div>
        </div>
    </div>
);

export default Brand;