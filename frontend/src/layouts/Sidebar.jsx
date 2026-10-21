// Menu bên trái lấy theo role từ constants/menus.js. Màn hình nhỏ thì thành ngăn kéo, mở bằng nút ở header
import { Nav, Offcanvas } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENUS } from '../constants/menus';
import Brand from './Brand';

const Sidebar = ({ show, onHide }) => {
    const { user } = useAuth();
    const items = MENUS[user.role] || [];

    return (
        <Offcanvas
            show={show}
            onHide={onHide}
            responsive="lg"
            className="w-64 shrink-0 border-end bg-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto"
        >
            <Offcanvas.Header closeButton className="border-bottom">
                <Brand />
            </Offcanvas.Header>
            <Offcanvas.Body className="flex-column p-0">
                {/* màn hình lớn ẩn Offcanvas.Header nên đặt logo ở đây, cao bằng header (h-14) */}
                <div className="d-none d-lg-flex items-center h-14 px-3 border-bottom">
                    <Brand />
                </div>
                <Nav variant="pills" className="flex-column gap-1 p-2">
                    {items.map(({ label, path, icon: Icon }) => (
                        <Nav.Link
                            key={path}
                            as={NavLink}
                            to={path}
                            onClick={onHide}
                            className="flex items-center gap-2"
                        >
                            <Icon size={18} />
                            {label}
                        </Nav.Link>
                    ))}
                </Nav>
            </Offcanvas.Body>
        </Offcanvas>
    );
};

export default Sidebar;