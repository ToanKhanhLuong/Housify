// Menu bên trái lấy theo role từ constants/menus.js. Màn hình nhỏ thì thành ngăn kéo, mở bằng nút ở header
// Màn hình lớn có nút 3 gạch cạnh logo để thu gọn còn icon / mở rộng. Thu gọn chỉ áp dụng từ 992px:
// dùng min-[992px]: và d-lg-* cho khớp điểm đổi của Offcanvas responsive="lg" (lg: của Tailwind là 1024px)
import { Button, Nav, Offcanvas } from 'react-bootstrap';
import { NavLink, useLocation } from 'react-router-dom';
import { BiMenu } from 'react-icons/bi';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../constants/enums';
import { MENUS } from '../constants/menus';
import Brand from './Brand';

// Xác định menu item có đang active không (kể cả các trang con không trùng tiền tố URL như /rooms/:id)
const isMenuLinkActive = (menuPath, currentPath, role) => {
    if (currentPath === menuPath || currentPath.startsWith(`${menuPath}/`)) {
        return true;
    }
    // Chi tiết phòng (/rooms/:id):
    // - Manager: thuộc mục "Tòa của tôi" (/my-building)
    // - Admin: thuộc mục "Tòa nhà" (/buildings)
    if (currentPath.startsWith('/rooms')) {
        if (role === ROLE.MANAGER && menuPath === '/my-building') return true;
        if (role === ROLE.ADMIN && menuPath === '/buildings') return true;
    }
    // Đơn chấm dứt hợp đồng (/terminations, /terminations/new, /terminations/:id):
    // - Manager: thuộc mục "Hợp đồng" (/contracts)
    if (currentPath.startsWith('/terminations') && role === ROLE.MANAGER && menuPath === '/contracts') {
        return true;
    }
    // - Customer: /my-terminations/:id thuộc mục "Hợp đồng của tôi" (/my-contract)
    if (currentPath.startsWith('/my-terminations') && role === ROLE.CUSTOMER && menuPath === '/my-contract') {
        return true;
    }
    return false;
};

const Sidebar = ({ show, onHide, collapsed, onToggleCollapse }) => {
    const { user } = useAuth();
    const location = useLocation();
    const items = MENUS[user?.role] || [];
    // Manager chưa được phân công tòa (BR-023): mọi mục menu đều mờ không bấm được
    const isManagerNoBuilding = user?.role === ROLE.MANAGER && !user?.building;

    // Thu gọn / mở rộng: chữ nằm trên 1 dòng, cắt phần thừa khi thu gọn (min-w-0 overflow-hidden),
    // chữ mờ dần theo bề rộng sidebar; icon giữ nguyên vị trí.
    // Ngăn kéo trên điện thoại luôn hiện đủ chữ (chỉ áp dụng từ 992px)
    const itemClass = 'min-w-0 overflow-hidden whitespace-nowrap';
    const labelClass = `transition-opacity duration-200 ${collapsed ? 'min-[992px]:opacity-0' : ''}`;

    return (
        <Offcanvas
            show={show}
            onHide={onHide}
            responsive="lg"
            className={`print:hidden w-64 shrink-0 border-end bg-white lg:sticky lg:top-0 lg:h-screen overflow-x-hidden lg:overflow-x-hidden lg:overflow-y-auto min-[992px]:transition-[width] min-[992px]:duration-200 ${collapsed ? 'min-[992px]:w-16' : ''}`}
        >
            <Offcanvas.Header closeButton className="border-bottom">
                <Brand />
            </Offcanvas.Header>
            <Offcanvas.Body className="flex-column p-0 overflow-x-hidden">
                {/* màn hình lớn ẩn Offcanvas.Header nên đặt logo ở đây, cao bằng header (h-14) */}
                <div
                    className={`d-none d-lg-flex items-center gap-2 h-14 px-3 border-bottom ${itemClass}`}
                >
                    <Button
                        variant="secondary"
                        size="sm"
                        className="hf-btn-ghost flex shrink-0 border-0 text-secondary"
                        onClick={onToggleCollapse}
                        aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                    >
                        <BiMenu size={20} />
                    </Button>
                    {/* logo mờ dần khi thu gọn */}
                    <div className={labelClass} aria-hidden={collapsed}>
                        <Brand />
                    </div>
                </div>
                <Nav variant="pills" className="flex-column gap-1 p-2 overflow-x-hidden">
                    {items.map(({ label, path, icon: Icon, disabled }) => {
                        const isOff = disabled || isManagerNoBuilding;

                        if (isOff) {
                            return (
                                // .hf-nav-off không nhận chuột nên title đặt ở thẻ bọc ngoài
                                <div
                                    key={path || label}
                                    title={
                                        collapsed
                                            ? `${label} – chức năng đang phát triển`
                                            : 'Chức năng đang phát triển'
                                    }
                                >
                                    <div
                                        className={`hf-nav-off flex items-center gap-2 rounded px-3 py-2 ${itemClass}`}
                                    >
                                        <Icon size={18} className="shrink-0" />
                                        <span className={labelClass}>{label}</span>
                                    </div>
                                </div>
                            );
                        }

                        const isActive = isMenuLinkActive(path, location.pathname, user?.role);

                        return (
                            <Nav.Link
                                key={path}
                                as={NavLink}
                                to={path}
                                active={isActive}
                                onClick={onHide}
                                className={`flex items-center gap-2 ${itemClass}`}
                                aria-label={label}
                                title={collapsed ? label : undefined}
                            >
                                <Icon size={18} className="shrink-0" />
                                <span className={labelClass}>{label}</span>
                            </Nav.Link>
                        );
                    })}
                </Nav>
            </Offcanvas.Body>
        </Offcanvas>
    );
};

export default Sidebar;
