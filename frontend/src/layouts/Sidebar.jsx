// Menu bên trái lấy theo role từ constants/menus.js. Màn hình nhỏ thì thành ngăn kéo, mở bằng nút ở header
// Màn hình lớn có nút 3 gạch cạnh logo để thu gọn còn icon / mở rộng. Thu gọn chỉ áp dụng từ 992px:
// dùng min-[992px]: và d-lg-* cho khớp điểm đổi của Offcanvas responsive="lg" (lg: của Tailwind là 1024px)
// Mục có children (vd Đơn chấm dứt của Admin) sổ xuống các mục con kiểu sidebar compact: bấm cả dòng mục cha để mở / thu
// (mũi tên bên phải chỉ báo trạng thái), mục con thụt vào, mục con đang xem tô nền, mục cha in đậm khi đang ở trang của nhóm
import { useState } from 'react';
import { Button, Nav, Offcanvas } from 'react-bootstrap';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BiChevronDown, BiChevronRight, BiMenu } from 'react-icons/bi';
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

// mục con (vd /terminations?type=MUTUAL) sáng khi đúng pathname và đủ các tham số ?query của nó
const isChildActive = (childPath, location) => {
    const [childPathname, childQuery = ''] = childPath.split('?');
    if (location.pathname !== childPathname) return false;
    const current = new URLSearchParams(location.search);
    return [...new URLSearchParams(childQuery)].every(([key, value]) => current.get(key) === value);
};

const Sidebar = ({ show, onHide, collapsed, onToggleCollapse }) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const items = MENUS[user?.role] || [];
    // nhóm có mục con đang mở / đóng theo path; chưa bấm thì tự mở khi đang ở trang của nhóm
    const [openGroups, setOpenGroups] = useState({});
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
                    {items.map(({ label, path, icon: Icon, disabled, children }) => {
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

                        if (children?.length) {
                            const activeChild = children.find((child) => isChildActive(child.path, location));
                            const isOpen = openGroups[path] ?? isActive;
                            const toggleGroup = () => setOpenGroups((prev) => ({ ...prev, [path]: !isOpen }));
                            // thu gọn (từ 992px) chỉ còn icon: ẩn mũi tên và mục con
                            const hideWhenCollapsed = collapsed ? 'min-[992px]:hidden' : '';
                            return (
                                <div key={path} className="flex flex-col gap-1">
                                    {/* cả dòng là nút mở / thu mục con; mũi tên bên phải chỉ để báo đang mở hay đóng.
                                        Thu gọn còn icon (từ 992px) thì không thấy mục con → bấm icon đi thẳng tới danh sách */}
                                    <Nav.Link
                                        as="button"
                                        type="button"
                                        onClick={() => {
                                            if (collapsed && window.matchMedia('(min-width: 992px)').matches) {
                                                navigate(path);
                                                return;
                                            }
                                            toggleGroup();
                                        }}
                                        className={`w-full flex items-center gap-2 text-start ${itemClass} ${
                                            isActive ? 'fw-semibold text-body' : ''
                                        }`}
                                        aria-expanded={isOpen}
                                        aria-label={label}
                                        title={collapsed ? label : undefined}
                                    >
                                        <Icon size={18} className="shrink-0" />
                                        <span className={`flex-1 ${labelClass}`}>{label}</span>
                                        <span className={`flex shrink-0 text-secondary ${labelClass} ${hideWhenCollapsed}`}>
                                            {isOpen ? <BiChevronDown size={16} /> : <BiChevronRight size={16} />}
                                        </span>
                                    </Nav.Link>
                                    {isOpen && (
                                        <div className={`flex flex-col gap-1 ms-4 ${hideWhenCollapsed}`}>
                                            {children.map((child) => (
                                                <Nav.Link
                                                    key={child.path}
                                                    as={Link}
                                                    to={child.path}
                                                    active={child === activeChild}
                                                    onClick={onHide}
                                                    className={`flex items-center gap-2 py-1 ${itemClass}`}
                                                >
                                                    {child.icon && <child.icon size={16} className="shrink-0" />}
                                                    {child.label}
                                                </Nav.Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

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
