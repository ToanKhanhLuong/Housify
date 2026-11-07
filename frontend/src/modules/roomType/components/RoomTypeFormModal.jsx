// UC-20: form thêm / sửa loại phòng. roomType = {} là thêm mới, có _id là sửa; nút "Xóa" nằm trong form sửa
// Tên và Sức chứa (capacity ≥ 1) là bắt buộc. Theo mockup docs/mock/RoomTypes.dc.html
import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { BiTrash } from 'react-icons/bi';
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

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
            onChange={handleChange}
            error={errors.name}
            placeholder="VD: Phòng đôi"
            helpText={isEdit ? 'Tên mới hiện ngay ở mọi phòng đang dùng loại này' : undefined}
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
            onChange={handleChange}
            error={errors.capacity}
            helpText={
              isEdit
                ? `${roomType.roomCount > 0 ? `Đang dùng ở ${roomType.roomCount} phòng` : 'Chưa có phòng nào dùng'}. Giảm sức chứa không được thấp hơn số người đang ở của phòng đông nhất thuộc loại này.`
                : 'Sức chứa tối đa cho phép của mọi phòng thuộc loại này'
            }
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
            // nút đỏ chỉ dùng ở hộp xác nhận; ở đây là nút thường đứng cuối
            <Button
              variant="secondary"
              className="ms-auto flex items-center gap-1"
              onClick={onDelete}
              disabled={submitting}
            >
              <BiTrash />
              Xóa
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RoomTypeFormModal;
