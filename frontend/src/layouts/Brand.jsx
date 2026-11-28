// Logo + tên app, dùng ở Sidebar và trang đăng nhập. logoClass: cỡ logo (mặc định nhỏ cho Sidebar, trang đăng nhập truyền cỡ lớn hơn)
const Brand = ({ logoClass = 'w-9 h-9' }) => (
    <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Housify" className={`${logoClass} object-contain`} />
        <div className="leading-tight">
            {/* <div className="fw-semibold">Housify</div> */}
            {/* <div className="small text-secondary">Quản lý nhà trọ</div> */}
        </div>
    </div>
);

export default Brand;