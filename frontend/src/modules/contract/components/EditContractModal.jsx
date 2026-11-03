// UC-26: sửa hợp đồng. Nháp: CCCD, email đại diện, ngày bắt đầu, số tháng (tự tính ngày kết thúc), ghi chú
// Đang hiệu lực: chỉ ghi chú. Chỉ gửi trường đã đổi – đổi CCCD / email thì link mời cũ hết hiệu lực (BE trả inviteInvalidated)
import { useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import { CONTRACT_STATUS } from '../../../constants/enums';
import { formatDate, toDateInput } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import contractApi from '../contract.api';
import { validateContractFields } from '../contract.validate';
import { endDateOf, monthsOf } from '../contractFormat';

const EditContractModal = ({ contract, onHide, onSaved }) => {
  const isDraft = contract.status === CONTRACT_STATUS.DRAFT;
  const initial = {
    representativeCccd: contract.representative?.cccd ?? '',
    representativeEmail: contract.representative?.email ?? '',
    startDate: toDateInput(contract.startDate),
    durationMonths: String(monthsOf(contract.startDate, contract.endDate) || ''),
    notes: contract.notes ?? '',
  };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const identityChanged =
    isDraft &&
    (form.representativeCccd.trim() !== initial.representativeCccd ||
      form.representativeEmail.trim().toLowerCase() !== initial.representativeEmail.toLowerCase());
  const newEnd = isDraft ? endDateOf(form.startDate, form.durationMonths) : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = isDraft
      ? validateContractFields(form)
      : form.notes.length > 1000
        ? { notes: 'Ghi chú tối đa 1000 ký tự' }
        : {};
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    // chỉ gửi trường đã đổi; hợp đồng đang hiệu lực chỉ gửi ghi chú
    const data = {};
    if (form.notes.trim() !== initial.notes.trim()) data.notes = form.notes.trim();
    if (isDraft) {
      if (form.representativeCccd.trim() !== initial.representativeCccd)
        data.representativeCccd = form.representativeCccd.trim();
      if (
        form.representativeEmail.trim().toLowerCase() !== initial.representativeEmail.toLowerCase()
      )
        data.representativeEmail = form.representativeEmail.trim();
      if (form.startDate !== initial.startDate) data.startDate = form.startDate;
      if (form.durationMonths !== initial.durationMonths)
        data.durationMonths = Number(form.durationMonths);
    }
    if (Object.keys(data).length === 0) {
      onHide();
      return;
    }

    setSubmitting(true);
    try {
      const response = await contractApi.update(contract._id, data);
      toast.success('Cập nhật hợp đồng thành công');
      if (response.data?.inviteInvalidated) {
        toast.info('Link mời cũ đã hết hiệu lực. Bấm "Gửi lại lời mời" để gửi link mới cho khách.');
      }
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors));
      if (!error.errors) toast.error(error.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show
      onHide={submitting ? undefined : onHide}
      centered
      backdrop="static"
      size={isDraft ? 'lg' : undefined}
    >
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">
            {isDraft ? 'Sửa hợp đồng nháp' : 'Sửa ghi chú hợp đồng'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!isDraft && (
            <Alert variant="info" className="small">
              Hợp đồng đang hiệu lực chỉ sửa được ghi chú. Giá thuê, tiền cọc, người đại diện, ngày
              bắt đầu và thời hạn đã khóa.
            </Alert>
          )}
          {isDraft && (
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Input
                  label="Số CCCD người đại diện"
                  name="representativeCccd"
                  value={form.representativeCccd}
                  onChange={handleChange}
                  error={errors.representativeCccd}
                  inputMode="numeric"
                  maxLength={12}
                  required
                  className="mb-0"
                />
              </Col>
              <Col md={6}>
                <Input
                  label="Email người đại diện"
                  name="representativeEmail"
                  type="email"
                  value={form.representativeEmail}
                  onChange={handleChange}
                  error={errors.representativeEmail}
                  required
                  className="mb-0"
                />
              </Col>
              <Col md={6}>
                <Input
                  label="Ngày bắt đầu"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  error={errors.startDate}
                  required
                  className="mb-0"
                />
              </Col>
              <Col md={6}>
                <Input
                  label="Thời hạn (tháng)"
                  name="durationMonths"
                  type="number"
                  min={1}
                  max={120}
                  value={form.durationMonths}
                  onChange={handleChange}
                  error={errors.durationMonths}
                  helpText={newEnd ? `Kết thúc ngày ${formatDate(newEnd)}` : undefined}
                  required
                  className="mb-0"
                />
              </Col>
            </Row>
          )}
          {identityChanged && (
            <Alert variant="warning" className="small">
              Đổi CCCD hoặc email người đại diện sẽ làm link mời cũ hết hiệu lực. Lưu xong bấm "Gửi
              lại lời mời".
            </Alert>
          )}
          <Input
            label="Ghi chú / điều khoản đặc biệt"
            name="notes"
            as="textarea"
            rows={4}
            value={form.notes}
            onChange={handleChange}
            error={errors.notes}
            maxLength={1000}
            helpText={`${form.notes.length}/1000 ký tự`}
            className="mb-0"
          />
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

export default EditContractModal;
