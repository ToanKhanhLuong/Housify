// Ô nhập có nhãn + lỗi đỏ ngay dưới ô. Truyền options thì thành ô chọn, as="textarea" thành ô văn bản
// Ví dụ: <FormInput label="Tên dịch vụ" name="name" value={form.name} onChange={handleChange} error={errors.name} required />
import { Form } from 'react-bootstrap';

export default function FormInput({
  label,
  name,
  error,
  required = false, // chỉ hiện dấu *, không bật kiểm tra của trình duyệt
  options,
  placeholder,
  hint,
  className = 'mb-3',
  ...props
}) {
  return (
    <Form.Group className={className} controlId={props.id || name}>
      {label && (
        <Form.Label>
          {label}
          {required && <span className="text-danger"> *</span>}
        </Form.Label>
      )}

      {options ? (
        <Form.Select name={name} isInvalid={Boolean(error)} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Form.Select>
      ) : (
        <Form.Control name={name} isInvalid={Boolean(error)} placeholder={placeholder} {...props} />
      )}

      {hint && !error && <Form.Text muted>{hint}</Form.Text>}
      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    </Form.Group>
  );
}
