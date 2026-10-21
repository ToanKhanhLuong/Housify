// Menu bên trái lấy theo role từ constants/menus.js. Màn hình nhỏ thì thành ngăn kéo, mở bằng nút ở header
import { Nav, Offcanvas } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENUS } from '../constants/menus';

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
            <Offcanvas.Header closeButton>
                <Offcanvas.Title className="fw-bold text-primary">Housify</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="flex-column p-3">
                <div className="d-none d-lg-block h4 fw-bold text-primary mb-4 px-2">Housify</div>
                <Nav variant="pills" className="flex-column gap-1">
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