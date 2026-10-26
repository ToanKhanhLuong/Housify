// UC-21: form thêm / sửa dịch vụ. service = {} là thêm mới, có _id là sửa
import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import Select from '../../../components/Select';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import serviceApi from '../service.api';
import { validateService } from '../service.validate';

// isFixed là Boolean, Select chỉ giữ chuỗi nên đổi qua lại 'true' / 'false'
const CALC_OPTIONS = [
    { value: 'false', label: 'Theo chỉ số (điện, nước)' },
    { value: 'true', label: 'Cố định (gửi xe, wifi…)' },
];

const ServiceFormModal = ({ service, onHide, onSaved, onDelete }) => {
    const isEdit = Boolean(service._id);
    const [form, setForm] = useState({
        name: service.name ?? '',
        unit: service.unit ?? '',
        isFixed: isEdit ? String(service.isFixed) : '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

    const handleSubmit = async (event) => {
        event.preventDefault();
        // kiểm tra nhanh ở FE để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại
        const clientErrors = validateService(form);
        setErrors(clientErrors);
        if (hasErrors(clientErrors)) return;

        const data = {
            name: form.name.trim(),
            unit: form.unit.trim(),
            isFixed: form.isFixed === 'true',
        };
        setSubmitting(true);
        try {
            if (isEdit) await serviceApi.update(service._id, data);
            else await serviceApi.create(data);
            toast.success(isEdit ? 'Cập nhật dịch vụ thành công' : 'Thêm dịch vụ thành công');
            onSaved();
        } catch (error) {
            setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
            if (!error.errors) toast.error(error.message); // lỗi khác (vd tên trùng): toast
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show onHide={onHide} centered backdrop="static">
            <Form onSubmit={handleSubmit} noValidate>
                <Modal.Header closeButton={!submitting}>
                    <Modal.Title className="h5">
                        {isEdit ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Input
                        label="Tên dịch vụ"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        error={errors.name}
                        required
                    />
                    <Input
                        label="Đơn vị tính"
                        name="unit"
                        value={form.unit}
                        onChange={handleChange}
                        error={errors.unit}
                        helpText="Chỉ để hiển thị, ví dụ kWh, m³, tháng, người"
                        required
                    />
                    <Select
                        label="Cách tính"
                        name="isFixed"
                        options={CALC_OPTIONS}
                        value={form.isFixed}
                        onChange={handleChange}
                        error={errors.isFixed}
                        required
                        className={isEdit ? 'mb-3' : 'mb-0'}
                    />
                    {isEdit && (
                        <div className="small text-secondary">
                            Thay đổi chỉ áp dụng cho hóa đơn lập sau này, hóa đơn đã lập giữ nguyên.
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="justify-content-start">
                    <Button type="submit" variant="primary" disabled={submitting}>
                        {submitting && <Spinner animation="border" size="sm" className="me-2" />}
                        Lưu
                    </Button>
                    <Button variant="secondary" onClick={onHide} disabled={submitting}>
                        Hủy
                    </Button>
                    {isEdit && (
                        <Button
                            variant="danger"
                            className="ms-auto"
                            onClick={onDelete}
                            disabled={submitting}
                        >
                            Xóa
                        </Button>
                    )}
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default ServiceFormModal;
