// Ô nhập tiền: gõ 3500000 hiện "3 500 000", onChange trả về số (hoặc '' khi trống). Nhãn + lỗi giống FormInput
// Ví dụ: <MoneyInput label="Giá thuê" required value={form.rentPrice} onChange={(v) => setField('rentPrice', v)} error={errors.rentPrice} />
import { Form, InputGroup } from 'react-bootstrap';
import { formatMoney } from '../../utils/format.js';

const toNumber = (text) => {
  const digits = String(text ?? '').replace(/\D/g, '');
  return digits === '' ? '' : Number(digits);
};

export default function MoneyInput({ label, name, value, onChange, error, required = false, hint, className = 'mb-3', size, placeholder }) {
  return (
    <Form.Group className={className} controlId={name}>
      {label && (
        <Form.Label>
          {label}
          {required && <span className="text-danger"> *</span>}
        </Form.Label>
      )}
      <InputGroup hasValidation size={size}>
        <Form.Control
          inputMode="numeric"
          placeholder={placeholder}
          value={formatMoney(value)}
          onChange={(e) => onChange(toNumber(e.target.value))}
          isInvalid={Boolean(error)}
        />
        <InputGroup.Text>đ</InputGroup.Text>
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      </InputGroup>
      {hint && !error && <Form.Text muted>{hint}</Form.Text>}
    </Form.Group>
  );
}
