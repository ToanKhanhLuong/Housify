// Ô chọn lọc có icon phễu nằm trong ô, dùng ở thanh lọc trang danh sách (UC-09). Không nhãn, không báo lỗi
// <FilterSelect name="status" options={STATUS_OPTIONS} placeholder="Tất cả trạng thái" value={filters.status} onChange={handleFilterChange} />
import { Form } from 'react-bootstrap';
import { BiFilterAlt } from 'react-icons/bi';

const FilterSelect = ({ options = [], placeholder, className = 'w-60', ...props }) => (
  <div className={`relative ${className}`}>
    {/* icon đè lên ô, không nhận click để bấm vào icon vẫn mở được danh sách; ps-5 chừa chỗ cho icon */}
    <BiFilterAlt
      size={18}
      className="absolute top-1/2 -translate-y-1/2 start-0 ms-3 text-secondary pointer-events-none"
    />
    <Form.Select aria-label={placeholder} className="ps-5" {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Form.Select>
  </div>
);

export default FilterSelect;
