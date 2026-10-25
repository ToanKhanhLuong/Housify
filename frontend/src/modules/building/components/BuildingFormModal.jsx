// UC-12 thêm / UC-13 sửa tòa nhà. building = {} là thêm mới, có _id là sửa
// Số tầng chỉ nhập lúc tạo; sau đó đổi ở tab Tầng (UC-15). Manager phụ trách đổi ở chức năng phân công (UC-11)
import { useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import buildingApi from '../building.api';
import { validateBuilding } from '../building.validate';
import BuildingImagesInput from './BuildingImagesInput';

const BuildingFormModal = ({ building, onHide, onSaved }) => {
  const isEdit = Boolean(building._id);
  const [form, setForm] = useState({
    name: building.name ?? '',
    address: building.address ?? '',
    floorCount: building.floorCount ?? '',
    description: building.description ?? '',
    images: building.images ?? [],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateBuilding(form, isEdit);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    const data = {
      name: form.name.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
      images: form.images,
      ...(!isEdit && { floorCount: Number(form.floorCount) }),
    };

    setSubmitting(true);
    try {
      const response = isEdit
        ? await buildingApi.update(building._id, data)
        : await buildingApi.create(data);
      toast.success(isEdit ? 'Cập nhật tòa nhà thành công' : 'Tạo tòa nhà thành công');
      onSaved(response.data);
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd UC-12 E01 trùng tên tòa
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered size="lg" backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">{isEdit ? 'Chỉnh sửa tòa nhà' : 'Thêm tòa nhà'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={isEdit ? 12 : 8}>
              <Input
                label="Tên tòa nhà"
                name="name"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                required
              />
            </Col>
            {!isEdit && (
              <Col md={4}>
                <Input
                  label="Số tầng"
                  name="floorCount"
                  type="number"
                  min={1}
                  step={1}
                  value={form.floorCount}
                  onChange={handleChange}
                  error={errors.floorCount}
                  required
                />
              </Col>
            )}
            <Col xs={12}>
              <Input
                label="Địa chỉ"
                name="address"
                value={form.address}
                onChange={handleChange}
                error={errors.address}
                required
              />
            </Col>
            <Col xs={12}>
              <Input
                label="Mô tả"
                name="description"
                as="textarea"
                rows={3}
                value={form.description}
                onChange={handleChange}
                error={errors.description}
              />
            </Col>
            <Col xs={12}>
              <BuildingImagesInput
                value={form.images}
                onChange={(images) => setForm({ ...form, images })}
                disabled={submitting}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            {isEdit ? 'Lưu' : 'Tạo'}
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default BuildingFormModal;
