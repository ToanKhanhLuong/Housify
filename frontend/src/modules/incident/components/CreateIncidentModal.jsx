// UC-43: Customer tạo báo cáo sự cố – loại, tiêu đề, mô tả chi tiết, ảnh đính kèm (tùy chọn, ảnh công khai, tải lên ngay)
// Gửi xong báo cho cha (mở chi tiết đơn). BE chặn nếu khách không có hợp đồng đang hiệu lực
import { useState } from 'react';
import { Button, Form, Image, Modal, Spinner } from 'react-bootstrap';
import { BiSend, BiX } from 'react-icons/bi';
import { toast } from 'react-toastify';
import ImageUpload from '../../../components/ImageUpload';
import Input from '../../../components/Input';
import Select from '../../../components/Select';
import { INCIDENT_TYPE_LABEL, toOptions } from '../../../constants/statusLabels';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import incidentApi from '../incident.api';
import { validateIncident } from '../incident.validate';

const EMPTY_FORM = { type: '', title: '', description: '', images: [] };

const CreateIncidentModal = ({ onHide, onCreated }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // đổi key để ô tải ảnh trống lại sau mỗi lần thêm
  const [uploadKey, setUploadKey] = useState(0);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setErrors((prev) => ({ ...prev, [event.target.name]: undefined }));
  };
  // ảnh tải lên xong mới gọi về nên dùng prev để không ghi đè ô vừa nhập
  const handleAddImage = (url) => {
    setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
    setUploadKey((key) => key + 1);
  };
  const handleRemoveImage = (url) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((item) => item !== url) }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateIncident(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const response = await incidentApi.create({
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        images: form.images,
      });
      toast.success(response.message || 'Đã gửi báo cáo sự cố');
      onCreated(response.data);
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd không có hợp đồng đang hiệu lực
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={submitting ? undefined : onHide} centered backdrop="static" size="lg">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <div>
            <Modal.Title className="h5">Tạo báo cáo sự cố</Modal.Title>
            <div className="small text-secondary">Quản lý tòa nhận thông báo ngay sau khi bạn gửi.</div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Select
            label="Loại sự cố"
            name="type"
            options={toOptions(INCIDENT_TYPE_LABEL)}
            value={form.type}
            onChange={handleChange}
            error={errors.type}
            disabled={submitting}
            required
          />
          <Input
            label="Tiêu đề"
            name="title"
            value={form.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="Vd: Vòi nước phòng tắm bị rò"
            disabled={submitting}
            required
          />
          <Input
            label="Mô tả chi tiết"
            name="description"
            as="textarea"
            rows={4}
            value={form.description}
            onChange={handleChange}
            error={errors.description}
            placeholder="Mô tả sự cố, vị trí, thời điểm phát hiện"
            disabled={submitting}
            required
          />

          <Form.Label>Ảnh đính kèm</Form.Label>
          {form.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              {form.images.map((url) => (
                <div key={url} className="relative h-24 overflow-hidden rounded border bg-body-tertiary">
                  <Image src={url} alt="Ảnh sự cố" className="h-full w-full object-cover" />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-0 end-0 m-1 p-0 flex"
                    onClick={() => handleRemoveImage(url)}
                    disabled={submitting}
                    aria-label="Bỏ ảnh"
                  >
                    <BiX size={18} />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <ImageUpload key={uploadKey} onChange={handleAddImage} disabled={submitting} />
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" className="flex items-center gap-2" disabled={submitting}>
            {submitting ? <Spinner animation="border" size="sm" /> : <BiSend />}
            Gửi báo cáo
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateIncidentModal;
