// UC-31: sửa thông tin cư dân. Manager sửa mọi cư dân trong tòa (kể cả họ tên, CCCD người đại diện);
// người đại diện (Customer) chỉ sửa người ở cùng – BE tự chặn sai quyền. Chỉ gửi những ô đã đổi
import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { toDateInput } from '../../../utils/format';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import occupantApi from '../occupant.api';
import { validateOccupant } from '../occupant.validate';
import OccupantFields from './OccupantFields';

const initialForm = (occupant) => ({
  name: occupant.name ?? '',
  cccd: occupant.cccd ?? '',
  phone: occupant.phone ?? '',
  dateOfBirth: toDateInput(occupant.dateOfBirth),
  address: occupant.address ?? '',
  relationship: occupant.relationship ?? '',
  cccdFrontImage: '', // chỉ có giá trị khi chọn ảnh mới (publicId)
  cccdBackImage: '',
});

const TEXT_FIELDS = ['name', 'cccd', 'phone', 'dateOfBirth', 'address', 'relationship'];

const EditOccupantModal = ({ occupant, onHide, onSaved }) => {
  const [original] = useState(() => initialForm(occupant));
  const [form, setForm] = useState(original);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  // ảnh tải lên xong mới gọi về nên dùng prev để không ghi đè ô vừa nhập
  const handleImage = (field) => (publicId) => setForm((prev) => ({ ...prev, [field]: publicId }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateOccupant(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    // chỉ gửi ô đã đổi (BE kiểm trùng CCCD / SĐT theo giá trị gửi lên); ảnh chỉ gửi khi chọn ảnh mới
    const data = {};
    TEXT_FIELDS.forEach((field) => {
      const value = form[field].trim();
      if (value !== original[field].trim()) data[field] = value;
    });
    if (form.cccdFrontImage) data.cccdFrontImage = form.cccdFrontImage;
    if (form.cccdBackImage) data.cccdBackImage = form.cccdBackImage;
    if (Object.keys(data).length === 0) {
      toast.info('Không có thông tin nào thay đổi');
      onHide();
      return;
    }

    setSubmitting(true);
    try {
      const response = await occupantApi.update(occupant._id, data);
      toast.success(response.message || 'Đã cập nhật thông tin cư dân');
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd CCCD trùng trong phòng, SĐT đã có người dùng
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={submitting ? undefined : onHide} centered backdrop="static" size="lg">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <div>
            <Modal.Title className="h5">Sửa thông tin cư dân</Modal.Title>
            <div className="small text-secondary">
              {occupant.roleLabel} · Phòng {occupant.room?.roomNumber ?? '—'}
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          {occupant.isRepresentative && (
            <Alert variant="warning" className="small">
              Số CCCD của người đại diện là tên đăng nhập của khách. Đổi CCCD thì khách phải đăng nhập
              bằng số mới; hợp đồng vẫn giữ số CCCD lúc ký.
            </Alert>
          )}
          <OccupantFields
            form={form}
            errors={errors}
            onChange={handleChange}
            onImage={handleImage}
            previews={{ front: occupant.cccdFrontUrl, back: occupant.cccdBackUrl }}
            showRelationship={!occupant.isRepresentative}
            disabled={submitting}
          />
        </Modal.Body>
        {/* chân modal theo quy định nhóm: nút chính → Hủy bên trái */}
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Lưu thay đổi
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditOccupantModal;
