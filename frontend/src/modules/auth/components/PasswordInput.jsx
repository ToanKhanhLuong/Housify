// Ô mật khẩu có nút con mắt để hiện/ẩn (UC-01, 03, 04). Cùng props với Input dùng chung, chỉ dùng trong module auth
// <PasswordInput label="Mật khẩu mới" name="newPassword" value={form.newPassword} onChange={handleChange} error={errors.newPassword} required />
import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { BiHide, BiShow } from 'react-icons/bi';

const PasswordInput = ({
  label,
  name,
  error,
  required = false,
  helpText,
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
      {/* me-4: ô ngắn lại so với các phần khác của form; con mắt nằm trong ô, góc phải */}
      <div className="relative me-4">
        {/* pe-5: chừa chỗ cho con mắt; bg-none!: bỏ icon chấm than đỏ của Bootstrap để không đè con mắt;
            [&::-ms-reveal]:hidden: ẩn con mắt riêng của Edge để không bị 2 con mắt */}
        <Form.Control
          name={name}
          type={visible ? 'text' : 'password'}
          isInvalid={Boolean(error)}
          disabled={disabled}
          className="pe-5 bg-none! [&::-ms-reveal]:hidden"
          {...props}
        />
        <Button
          variant="link"
          className="absolute end-0 top-0 h-full flex items-center px-3 text-secondary"
          onClick={() => setVisible(!visible)}
          disabled={disabled}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <BiHide /> : <BiShow />}
        </Button>
      </div>
      {helpText && !error && <Form.Text className="text-secondary">{helpText}</Form.Text>}
      {/* ô nằm trong div bọc nên dòng lỗi không còn tự hiện theo .is-invalid, phải bật d-block */}
      {error && (
        <Form.Control.Feedback type="invalid" className="d-block">
          {error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export default PasswordInput;
