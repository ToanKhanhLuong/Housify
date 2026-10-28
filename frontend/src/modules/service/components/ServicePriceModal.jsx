// UC-22: lịch sử mức giá của một dịch vụ ở một tòa + form nhập mức giá mới
// Trùng ngày bắt đầu với mức đã có thì BE sửa mức đó (A1). Mức giá không xóa được
import { useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import Input from '../../../components/Input';
import MoneyText from '../../../components/MoneyText';
import { formatDate, formatMoney, toDateInput } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import serviceApi from '../service.api';
import { validateServicePrice } from '../service.validate';
import { getCurrentPrice, sortPrices } from '../servicePrice.utils';

const ServicePriceModal = ({ service, buildingId, buildingName, prices, onHide, onSaved }) => {
    const [form, setForm] = useState({ unitPrice: '', effectiveFrom: '' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const today = toDateInput(new Date());
    const currentPrice = getCurrentPrice(prices);
    const sameDatePrice = prices.find(
        (price) => toDateInput(price.effectiveFrom) === form.effectiveFrom,
    );

    const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

    const handleSubmit = async (event) => {
        event.preventDefault();
        // kiểm tra nhanh ở FE để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại
        const clientErrors = validateServicePrice(form);
        setErrors(clientErrors);
        if (hasErrors(clientErrors)) return;

        const data = {
            serviceId: service._id,
            unitPrice: Number(form.unitPrice),
            effectiveFrom: form.effectiveFrom,
        };
        setSubmitting(true);
        try {
            await serviceApi.savePrice(buildingId, data);
            toast.success(
                sameDatePrice ? 'Cập nhật mức giá thành công' : 'Thêm mức giá thành công',
            );
            onSaved();
        } catch (error) {
            setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
            if (!error.errors) toast.error(error.message); // lỗi khác (vd dịch vụ / tòa đã bị xóa): toast
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'effectiveFrom',
            title: 'Ngày bắt đầu áp dụng',
            render: (row) => formatDate(row.effectiveFrom),
        },
        {
            key: 'unitPrice',
            title: 'Đơn giá',
            align: 'end',
            render: (row) => <MoneyText value={row.unitPrice} />,
        },
        {
            key: 'state',
            title: '',
            render: (row) => {
                if (row._id === currentPrice?._id)
                    return <span className="text-success fw-semibold">Đang áp dụng</span>;
                if (toDateInput(row.effectiveFrom) > today)
                    return <span className="text-secondary">Chưa tới ngày</span>;
                return null;
            },
        },
    ];

    return (
        <Modal show onHide={onHide} centered backdrop="static" size="lg">
            <Form onSubmit={handleSubmit} noValidate>
                <Modal.Header closeButton={!submitting}>
                    <Modal.Title className="h5">
                        Giá {service.name} · {buildingName}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="fw-semibold mb-2">Lịch sử mức giá</div>
                    <DataTable
                        columns={columns}
                        data={sortPrices(prices)}
                        emptyMessage="Dịch vụ chưa có mức giá nào ở tòa này"
                    />

                    <div className="fw-semibold mt-4 mb-2">Mức giá mới</div>
                    <Row>
                        <Col md={6}>
                            <Input
                                label="Đơn giá"
                                name="unitPrice"
                                type="number"
                                min="1"
                                value={form.unitPrice}
                                onChange={handleChange}
                                error={errors.unitPrice}
                                helpText={`Đồng / ${service.unit}`}
                                required
                            />
                        </Col>
                        <Col md={6}>
                            <Input
                                label="Ngày bắt đầu áp dụng"
                                name="effectiveFrom"
                                type="date"
                                value={form.effectiveFrom}
                                onChange={handleChange}
                                error={errors.effectiveFrom}
                                required
                            />
                        </Col>
                    </Row>
                    {sameDatePrice && (
                        <Alert variant="info" className="mb-2">
                            Ngày này đã có mức giá {formatMoney(sameDatePrice.unitPrice)}. Lưu sẽ
                            sửa mức giá đó, không tạo mức mới.
                        </Alert>
                    )}
                    {form.effectiveFrom && form.effectiveFrom < today && (
                        <Alert variant="warning" className="mb-0">
                            Ngày hiệu lực trong quá khứ — hóa đơn đã tạo sẽ không bị ảnh hưởng
                        </Alert>
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
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default ServicePriceModal;
