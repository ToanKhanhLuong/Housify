// Ô mật khẩu có con mắt hiện/ẩn nằm trong ô. Props giống Input (không cần type, luôn là ô mật khẩu)
// <PasswordInput label="Mật khẩu mới" name="newPassword" value={form.newPassword} onChange={handleChange} error={errors.newPassword} required />
import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { BiHide, BiShow } from 'react-icons/bi';

const PasswordInput = ({ label, name, error, required = false, helpText, disabled, className = 'mb-3', ...props }) => {
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';

    return (
        <Form.Group className={className} controlId={name}>
            {label && (
                <Form.Label>
                    {label}
                    {required && <span className="text-danger ms-1">*</span>}
                </Form.Label>
            )}
            {/* thẻ input không chứa được phần tử con nên con mắt đặt đè lên góc phải bên trong ô */}
            <div className="relative">
                {/* pe-5: chừa chỗ cho con mắt; bg-none!: bỏ icon chấm than đỏ khi lỗi để không đè con mắt;
                    [&::-ms-reveal]:hidden: ẩn con mắt sẵn có của Edge để không bị 2 con mắt */}
                <Form.Control
                    name={name}
                    type={visible ? 'text' : 'password'}
                    isInvalid={Boolean(error)}
                    disabled={disabled}
                    className="pe-5 bg-none! [&::-ms-reveal]:hidden"
                    {...props}
                />
                {/* nút secondary (đúng 4 kiểu nút) nhưng trong suốt, không viền để nằm gọn trong ô, ăn theo màu nền của ô */}
                <Button
                    variant="secondary"
                    className="absolute end-0 top-0 h-full flex items-center px-3 bg-transparent border-0 text-secondary"
                    onClick={() => setVisible(!visible)}
                    disabled={disabled}
                    aria-label={toggleLabel}
                    title={toggleLabel}
                >
                    {visible ? <BiHide size={20} /> : <BiShow size={20} />}
                </Button>
            </div>
            {helpText && !error && <Form.Text className="text-secondary">{helpText}</Form.Text>}
            {/* ô nằm trong div bọc nên dòng lỗi không tự hiện theo .is-invalid, phải bật d-block */}
            {error && (
                <Form.Control.Feedback type="invalid" className="d-block">
                    {error}
                </Form.Control.Feedback>
            )}
        </Form.Group>
    );
};

export default PasswordInput;
