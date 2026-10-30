// Ô chọn lọc ở thanh lọc trang danh sách. Không báo lỗi, không dấu *
// Có label: nhãn nằm trong ô bên trái  →  [ Tòa nhà | Housify Cầu Giấy ▾ ]
//   <FilterSelect label="Tòa nhà" icon={BiBuildings} name="buildingId" options={...} placeholder="Tất cả" value={...} onChange={...} />
// Không label: icon phễu nằm trong ô (giống bản đầu ở module manager)
//   <FilterSelect name="status" options={...} placeholder="Tất cả trạng thái" value={...} onChange={...} />
import { Form, InputGroup } from 'react-bootstrap';
import { BiFilterAlt } from 'react-icons/bi';

const FilterSelect = ({
  label,
  icon: Icon,
  options = [],
  placeholder,
  className = 'w-60',
  ...props
}) => {
  const choices = (
    <>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );

  if (label) {
    return (
      <InputGroup className={className}>
        <InputGroup.Text className="flex items-center gap-1 text-secondary">
          {Icon && <Icon size={16} />}
          {label}
        </InputGroup.Text>
        <Form.Select aria-label={label} {...props}>
          {choices}
        </Form.Select>
      </InputGroup>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* icon đè lên ô, không nhận click để bấm vào icon vẫn mở được danh sách; ps-5 chừa chỗ cho icon */}
      <BiFilterAlt
        size={18}
        className="absolute top-1/2 -translate-y-1/2 start-0 ms-3 text-secondary pointer-events-none"
      />
      <Form.Select aria-label={placeholder} className="ps-5" {...props}>
        {choices}
      </Form.Select>
    </div>
  );
};

export default FilterSelect;
