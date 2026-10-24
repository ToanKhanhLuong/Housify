// Ô mật khẩu có nút con mắt ẩn/hiện. Props giống Input; nút mắt riêng của Edge đã ẩn trong index.css để không ra 2 con mắt
// <PasswordInput label="Mật khẩu" name="password" value={form.password} onChange={handleChange} error={errors.password} required />
import { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { BiHide, BiShow } from 'react-icons/bi';

const PasswordInput = ({ label, name, error, required = false, helpText, className = 'mb-3', size, disabled, ...props }) => {
    const [visible, setVisible] = useState(false);

    return (
        <Form.Group className={className} controlId={name}>
            {label && (
                <Form.Label>
                    {label}
                    {required && <span className="text-danger ms-1">*</span>}
                </Form.Label>
            )}
            <InputGroup size={size} hasValidation>
                <Form.Control
                    name={name}
                    type={visible ? 'text' : 'password'}
                    isInvalid={Boolean(error)}
                    disabled={disabled}
                    {...props}
                />
                {/* tabIndex -1: bấm Tab đi thẳng sang ô kế tiếp, không dừng ở nút mắt */}
                <Button
                    variant="secondary"
                    onClick={() => setVisible(!visible)}
                    disabled={disabled}
                    tabIndex={-1}
                    aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
