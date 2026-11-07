// UC-12 thêm / UC-13 sửa tòa nhà theo mockup docs/mock/Main.dc.html. building = {} là thêm mới, có _id là sửa
// Số tầng chỉ nhập lúc tạo; sau đó đổi trong chi tiết tòa (UC-15). Manager phụ trách đổi ở chức năng phân công (UC-11)
// Ảnh: ảnh đầu tiên là ảnh đại diện của tòa (chốt 30/10), dùng ô ảnh của module (BuildingImagesInput)
// Giới hạn độ dài lấy theo BE (building.validation.js): tên 2–100, địa chỉ 5–255, mô tả ≤ 1000 ký tự
import { useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import buildingApi from '../building.api';
import { validateBuilding } from '../building.validate';
import BuildingImagesInput from './BuildingImagesInput';

const DESCRIPTION_MAX = 1000;

// building mặc định {}: trang danh sách mở "Thêm tòa nhà" không truyền building
const BuildingFormModal = ({ building = {}, onHide, onSaved }) => {
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };
  // ảnh tải lên xong mới gọi về nên dùng prev để không ghi đè ô vừa nhập
  const handleImages = (images) => {
    setForm((prev) => ({ ...prev, images }));
    if (errors.images) {
      setErrors((prev) => ({ ...prev, images: undefined }));
    }
  };

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
      if (!error.errors) toast.error(error.message); // vd UC-12 E01 "Tên tòa nhà đã tồn tại"
      setSubmitting(false);
    }
  };

  return (
    // cỡ mặc định của Bootstrap (~500px) như mockup: form ngắn, khung hẹp cho gọn
    <Modal show onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">{isEdit ? 'Chỉnh sửa tòa nhà' : 'Thêm tòa nhà'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* tên và số tầng chung một hàng cho modal ngắn lại */}
          <Row>
            <Col xs={isEdit ? 12 : 8}>
              <Input
                label="Tên tòa nhà"
                name="name"
                placeholder="VD: Housify Cầu Giấy"
                maxLength={100}
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                disabled={submitting}
                autoFocus
                required
              />
            </Col>
            {/* số tầng chỉ nhập lúc tạo; sau đó đổi trong chi tiết tòa */}
            {!isEdit && (
              <Col xs={4}>
                <Input
                  label="Số tầng"
                  name="floorCount"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={form.floorCount}
                  onChange={handleChange}
                  error={errors.floorCount}
                  disabled={submitting}
                  title="Tầng 1 đến N, sửa được sau trong chi tiết tòa."
                  required
                />
              </Col>
            )}
            <Col xs={12}>
              <Input
                label="Địa chỉ"
                name="address"
                placeholder="Số nhà, đường, quận, thành phố"
                maxLength={255}
                value={form.address}
                onChange={handleChange}
                error={errors.address}
                disabled={submitting}
                required
              />
            </Col>
            <Col xs={12}>
              <Input
                label="Mô tả"
                name="description"
                as="textarea"
                rows={2}
                maxLength={DESCRIPTION_MAX}
                placeholder="Tiện ích, giờ giấc, lưu ý cho khách thuê…"
                value={form.description}
                onChange={handleChange}
                error={errors.description}
                helpText={`${form.description.length}/${DESCRIPTION_MAX} ký tự`}
                disabled={submitting}
              />
            </Col>
            <Col xs={12}>
              <BuildingImagesInput
                value={form.images}
                onChange={handleImages}
                disabled={submitting}
              />
            </Col>
          </Row>
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

export default BuildingFormModal;
