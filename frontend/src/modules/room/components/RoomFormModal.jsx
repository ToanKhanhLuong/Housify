// UC-16 thêm / UC-17 sửa phòng. room = {} là thêm mới, có _id là sửa
// Mã phòng khóa sau khi tạo (BR-046). Trạng thái chỉ sửa khi phòng Trống / Bảo trì; Đang thuê do hợp đồng quyết định
import { useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import Select from '../../../components/Select';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import roomApi from '../room.api';
import { validateRoom } from '../room.validate';
import RoomImagesInput from './RoomImagesInput';

// UC-17 A2: Admin chỉ chọn được Trống hoặc Bảo trì
const STATUS_OPTIONS = [ROOM_STATUS.AVAILABLE, ROOM_STATUS.MAINTENANCE].map((status) => ({
  value: status,
  label: ROOM_STATUS_LABEL[status].label,
}));

const RoomFormModal = ({ room, building, roomTypes, onHide, onSaved }) => {
  const isEdit = Boolean(room._id);
  const isOccupied = room.status === ROOM_STATUS.OCCUPIED;
  const [form, setForm] = useState({
    roomNumber: room.roomNumber ?? '',
    floorNumber: room.floorNumber ? String(room.floorNumber) : '',
    roomTypeId: room.roomTypeId ?? '',
    area: room.area ?? '',
    capacity: room.capacity ?? '',
    rentPrice: room.rentPrice ?? '',
    deposit: room.deposit ?? '',
    status: room.status ?? ROOM_STATUS.AVAILABLE,
    images: room.images ?? [],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const floorOptions = Array.from({ length: building?.floorCount ?? 0 }, (_, index) => ({
    value: String(index + 1),
    label: `Tầng ${index + 1}`,
  }));
  const roomTypeOptions = roomTypes.map((type) => ({ value: type._id, label: type.name }));

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateRoom(form, isEdit);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    const data = {
      floorNumber: Number(form.floorNumber),
      roomTypeId: form.roomTypeId,
      area: Number(form.area),
      capacity: Number(form.capacity),
      rentPrice: Number(form.rentPrice),
      deposit: Number(form.deposit),
      images: form.images,
      ...(!isEdit && { roomNumber: form.roomNumber.trim() }),
      ...(isEdit && !isOccupied && { status: form.status }),
    };

    setSubmitting(true);
    try {
      const response = isEdit
        ? await roomApi.update(room._id, data)
        : await roomApi.create(building._id, data);
      toast.success(isEdit ? 'Cập nhật phòng thành công' : 'Tạo phòng thành công');
      onSaved(response.data);
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd UC-16 E01 trùng mã, UC-17 E02 sức chứa
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered size="lg" backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">
            {isEdit ? `Chỉnh sửa phòng ${room.roomNumber}` : `Thêm phòng · ${building?.name ?? ''}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={4}>
              <Input
                label="Mã phòng"
                name="roomNumber"
                value={form.roomNumber}
                onChange={handleChange}
                error={errors.roomNumber}
                helpText={isEdit ? 'Mã phòng không đổi được sau khi tạo' : undefined}
                disabled={isEdit}
                readOnly={isEdit}
                required
              />
            </Col>
            <Col md={4}>
              <Select
                label="Tầng"
                name="floorNumber"
                options={floorOptions}
                value={form.floorNumber}
                onChange={handleChange}
                error={errors.floorNumber}
                required
              />
            </Col>
            <Col md={4}>
              <Select
                label="Loại phòng"
                name="roomTypeId"
                options={roomTypeOptions}
                value={form.roomTypeId}
                onChange={handleChange}
                error={errors.roomTypeId}
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Diện tích (m²)"
                name="area"
                type="number"
                min={0}
                step="any"
                value={form.area}
                onChange={handleChange}
                error={errors.area}
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Sức chứa tối đa (người)"
                name="capacity"
                type="number"
                min={1}
                step={1}
                value={form.capacity}
                onChange={handleChange}
                error={errors.capacity}
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Giá thuê (đ/tháng)"
                name="rentPrice"
                type="number"
                min={0}
                value={form.rentPrice}
                onChange={handleChange}
                error={errors.rentPrice}
                helpText={isEdit ? 'Giá mới chỉ áp dụng cho hợp đồng tạo sau này' : undefined}
                required
              />
            </Col>
            <Col md={6}>
              <Input
                label="Tiền cọc (đ)"
                name="deposit"
                type="number"
                min={0}
                value={form.deposit}
                onChange={handleChange}
                error={errors.deposit}
                required
              />
            </Col>
            {isEdit && (
              <Col md={6}>
                {isOccupied ? (
                  <Input
                    label="Trạng thái"
                    name="status"
                    value={ROOM_STATUS_LABEL[ROOM_STATUS.OCCUPIED].label}
                    helpText="Phòng đang thuê: trạng thái do hợp đồng quyết định"
                    disabled
                    readOnly
                  />
                ) : (
                  <Select
                    label="Trạng thái"
                    name="status"
                    options={STATUS_OPTIONS}
                    placeholder={null}
                    value={form.status}
                    onChange={handleChange}
                    error={errors.status}
                    required
                  />
                )}
              </Col>
            )}
            <Col xs={12}>
              <RoomImagesInput
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

export default RoomFormModal;
