// Ô tìm kiếm có icon kính lúp nằm trong ô, dùng ở thanh lọc trang danh sách (UC-09). Không nhãn, không báo lỗi
// <SearchInput name="q" placeholder="Tìm theo tên Manager..." value={filters.q} onChange={handleFilterChange} />
import { Form } from 'react-bootstrap';
import { BiSearch } from 'react-icons/bi';

const SearchInput = ({ className = 'w-80', placeholder, ...props }) => (
  <div className={`relative ${className}`}>
    {/* icon đè lên ô, không nhận click để bấm vào icon vẫn gõ được; ps-5 chừa chỗ cho icon */}
    <BiSearch
      size={18}
      className="absolute top-1/2 -translate-y-1/2 start-0 ms-3 text-secondary pointer-events-none"
    />
    <Form.Control placeholder={placeholder} aria-label={placeholder} className="ps-5" {...props} />
  </div>
);

export default SearchInput;
