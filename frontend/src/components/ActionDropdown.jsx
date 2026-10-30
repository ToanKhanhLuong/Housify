// Nút "Thao tác ▾" (Action Dropdown) ở trang chi tiết theo BuildingDetail.dc.html
// Gom các hành động phụ / nguy hiểm (xóa, khóa, gỡ phân công) để trang gọn gàng.
import { Dropdown } from 'react-bootstrap';
import { BiChevronDown } from 'react-icons/bi';

const ActionDropdown = ({
    title = 'Thao tác',
    items = [],
    align = 'start',
    size = 'sm',
    className = '',
    children,
}) => {
    return (
        <Dropdown align={align} className={`inline-block ${className}`}>
            <Dropdown.Toggle
                variant="secondary"
                size={size}
                className="flex items-center gap-1.5"
                id="action-dropdown-toggle"
            >
                <span>{title}</span>
                <BiChevronDown size={16} />
            </Dropdown.Toggle>

            <Dropdown.Menu className="shadow-lg border-[#e1e3e6] min-w-[180px] py-1 text-sm">
                {items.length > 0
                    ? items.map((item, idx) => {
                          if (item.divider) {
                              return <Dropdown.Divider key={`div-${idx}`} className="my-1 border-gray-100" />;
                          }
                          const Icon = item.icon;
                          const isDanger = item.danger || item.variant === 'danger';
                          return (
                              <Dropdown.Item
                                  key={item.label || idx}
                                  onClick={item.onClick}
                                  disabled={item.disabled}
                                  className={`flex items-center gap-2 py-2 px-3 ${
                                      isDanger
                                          ? 'text-[#a3241b] hover:bg-red-50 hover:text-[#a3241b]'
                                          : 'text-gray-700'
                                  }`}
                              >
                                  {Icon && <Icon size={16} />}
                                  <span>{item.label}</span>
                              </Dropdown.Item>
                          );
                      })
                    : children}
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default ActionDropdown;
