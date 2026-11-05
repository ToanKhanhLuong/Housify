// UC-27: gia hạn hợp đồng đang hiệu lực – số tháng (mặc định 12), ghi chú tùy chọn
// Chỉ dời ngày kết thúc nối tiếp từ ngày kết thúc hiện tại; giá, cọc, cư dân giữ nguyên. Khách nhận chuông + email
import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import { formatDate } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import contractApi from '../contract.api';
import { validateRenew } from '../contract.validate';

// ngày kết thúc mới = ngày kết thúc hiện tại + số tháng
const renewedEnd = (endDate, months) => {
  if (!endDate || !Number(months)) return null;
  const end = new Date(endDate);
  end.setMonth(end.getMonth() + Number(months));
  return end;
};

const RenewContractModal = ({ contract, onHide, onSaved }) => {
  const [form, setForm] = useState({ months: '12', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };
  const newEnd = renewedEnd(contract.endDate, form.months);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateRenew(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const data = { months: Number(form.months) };
      if (form.notes.trim()) data.notes = form.notes.trim();
      const response = await contractApi.renew(contract._id, data);
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Gia hạn hợp đồng thành công');
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors));
      if (!error.errors) toast.error(error.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={submitting ? undefined : onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">
            Gia hạn hợp đồng phòng {contract.room?.roomNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            Hiện kết thúc ngày <b>{formatDate(contract.endDate)}</b>
            {newEnd && (
              <>
                {' '}
                → gia hạn đến <b>{formatDate(newEnd)}</b>
              </>
            )}
          </div>
          <Input
            label="Số tháng gia hạn"
            name="months"
            type="number"
            min={1}
            max={120}
            value={form.months}
            onChange={handleChange}
            error={errors.months}
            required
            autoFocus
          />
          <Input
            label="Ghi chú"
            name="notes"
            as="textarea"
            rows={2}
            value={form.notes}
            onChange={handleChange}
            error={errors.notes}
            maxLength={1000}
            className="mb-3"
          />
          <Alert variant="info" className="small mb-0">
            Giá thuê, tiền cọc và cư dân giữ nguyên. Khách nhận thông báo và email gia hạn.
          </Alert>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Gia hạn
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RenewContractModal;
