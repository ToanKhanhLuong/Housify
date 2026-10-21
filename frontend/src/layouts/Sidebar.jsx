// Menu bên trái theo role (constants/menus.js). Màn hình nhỏ thì thành ngăn trượt, mở bằng nút trên Topbar
import { NavLink } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';
import { getMenuSections } from '../constants/menus.js';

function MenuList({ onNavigate }) {
  const { user } = useAuth();

  return (
    <nav className="flex flex-col gap-3 p-2">
      {getMenuSections(user).map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <div className="px-3 text-xs font-semibold uppercase text-gray-400">{section.title}</div>
          {section.items.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-decoration-none ${
                  isActive ? 'bg-primary text-white' : 'text-body hover:bg-gray-100'
                }`
              }
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return <span className="text-xl font-bold text-primary">Housify</span>;
}

export default function Sidebar({ show, onHide }) {
  return (
    <>
      {/* Màn hình từ md trở lên: cột cố định */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white md:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-gray-200 px-3">
          <Brand />
        </div>
        <MenuList />
      </aside>

      {/* Điện thoại: ngăn trượt */}
      <Offcanvas show={show} onHide={onHide} className="md:hidden" style={{ width: 260 }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <Brand />
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <MenuList onNavigate={onHide} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
