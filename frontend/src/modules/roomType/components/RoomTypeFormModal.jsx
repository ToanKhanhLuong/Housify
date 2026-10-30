// UC-20: form thêm / sửa loại phòng. roomType = {} là thêm mới, có _id là sửa; nút "Xóa" nằm trong form sửa
// Tên và Sức chứa (capacity ≥ 1) là bắt buộc
import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import roomTypeApi from '../roomType.api';
import { validateRoomType } from '../roomType.validate';

const RoomTypeFormModal = ({ roomType = {}, onHide, onSaved, onDelete }) => {
  const isEdit = Boolean(roomType._id);
  const [form, setForm] = useState({
    name: roomType.name ?? '',
    capacity: roomType.capacity !== undefined ? String(roomType.capacity) : '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateRoomType(form);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const data = {
        name: form.name.trim(),
        capacity: Number(form.capacity),
      };
      if (isEdit) {
        await roomTypeApi.update(roomType._id, data);
      } else {
        await roomTypeApi.create(data);
      }
      toast.success(isEdit ? 'Cập nhật loại phòng thành công' : 'Thêm loại phòng thành công');
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới ô
      if (error.status === 409) {
        // Trùng tên loại phòng (409) -> hiện dưới ô tên
        setErrors((prev) => ({ ...prev, name: error.message }));
      } else if (!error.errors) {
        // 400: sửa sức chứa nhỏ hơn số người đang ở, v.v.
        toast.error(error.message);
      }
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">{isEdit ? 'Sửa loại phòng' : 'Thêm loại phòng'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Input
            label="Tên loại phòng"
            name="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
            helpText={
              isEdit
                ? 'Tên mới hiện ngay ở mọi phòng đang dùng loại này'
                : 'Ví dụ: Phòng đơn, Studio'
            }
            required
            autoFocus
          />
          <Input
            label="Sức chứa tối đa (người)"
            name="capacity"
            type="number"
            min={1}
            step={1}
            value={form.capacity}
            onChange={(event) => setForm({ ...form, capacity: event.target.value })}
            error={errors.capacity}
            helpText="Sức chứa tối đa cho phép của mọi phòng thuộc loại này"
            required
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
          {isEdit && (
            <Button variant="danger" className="ms-auto" onClick={onDelete} disabled={submitting}>
              Xóa
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RoomTypeFormModal;
