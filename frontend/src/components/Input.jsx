// Ô nhập có nhãn + dòng lỗi. Dùng cho text, số, ngày, mật khẩu; textarea thì thêm as="textarea" rows={4}
// <Input label="Tên tòa" name="name" value={form.name} onChange={handleChange} error={errors.name} required />
import { Form } from 'react-bootstrap';

const Input = ({ label, name, error, required = false, helpText, className = 'mb-3', ...props }) => (
    <Form.Group className={className} controlId={name}>
        {label && (
            <Form.Label>
                {label}
                {required && <span className="text-danger ms-1">*</span>}
            </Form.Label>
        )}
        <Form.Control name={name} isInvalid={Boolean(error)} {...props} />
        {helpText && !error && <Form.Text className="text-secondary">{helpText}</Form.Text>}
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    </Form.Group>
);

export default Input;