// Ô chọn có nhãn + dòng lỗi. options = [{ value, label }]; lấy từ bảng nhãn thì dùng toOptions()
// <Select label="Trạng thái" name="status" options={toOptions(ROOM_STATUS_LABEL)} value={...} onChange={...} />
import { Form } from 'react-bootstrap';

const Select = ({
    label,
    name,
    options = [],
    placeholder = '-- Chọn --',
    error,
    required = false,
    className = 'mb-3',
    ...props
}) => (
    <Form.Group className={className} controlId={name}>
        {label && (
            <Form.Label>
                {label}
                {required && <span className="text-danger ms-1">*</span>}
            </Form.Label>
        )}
        <Form.Select name={name} isInvalid={Boolean(error)} {...props}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </Form.Select>
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    </Form.Group>
);

export default Select;