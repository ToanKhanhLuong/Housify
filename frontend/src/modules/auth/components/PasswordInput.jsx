// Ô mật khẩu có nút con mắt để hiện/ẩn (UC-01, 03, 04). Cùng props với Input dùng chung, chỉ dùng trong module auth
// <PasswordInput label="Mật khẩu mới" name="newPassword" value={form.newPassword} onChange={handleChange} error={errors.newPassword} required />
import { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { BiHide, BiShow } from 'react-icons/bi';

const PasswordInput = ({
  label,
  name,
  error,
  required = false,
  helpText,
  size,
  disabled,
  className = 'mb-3',
  ...props
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <Form.Group className={className} controlId={name}>
      {label && (
        <Form.Label>
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
      )}
      {/* hasValidation: dòng lỗi nằm trong InputGroup mới hiện và bo góc đúng; size đặt ở nhóm để nút cao bằng ô */}
      <InputGroup size={size} hasValidation>
        {/* ẩn con mắt riêng của Edge để không bị 2 con mắt */}
        <Form.Control
          name={name}
          type={visible ? 'text' : 'password'}
          isInvalid={Boolean(error)}
          disabled={disabled}
          className="[&::-ms-reveal]:hidden"
          {...props}
        />
        <Button
          variant="outline-secondary"
          onClick={() => setVisible(!visible)}
          disabled={disabled}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <BiHide /> : <BiShow />}
        </Button>
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      </InputGroup>
      {helpText && !error && <Form.Text className="text-secondary">{helpText}</Form.Text>}
    </Form.Group>
  );
};

export default PasswordInput;
