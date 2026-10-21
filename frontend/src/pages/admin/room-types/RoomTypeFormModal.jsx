// Hộp thêm / sửa loại phòng (UC-20): chỉ có ô tên. roomType = null là thêm mới
import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { roomTypeApi } from '../../../api/roomType.api.js';
import { toFieldErrors } from '../../../utils/apiError.js';
import FormInput from '../../../components/common/FormInput.jsx';

export default function RoomTypeFormModal({ roomType, onHide, onSaved }) {
  const isEdit = Boolean(roomType);
  const [name, setName] = useState(roomType?.name || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Tên loại phòng không được để trống');

    setSaving(true);
    try {
      const res = isEdit
        ? await roomTypeApi.update(roomType._id, { name: name.trim() })
        : await roomTypeApi.create({ name: name.trim() });
      toast.success(res.message);
      onSaved();
    } catch (err) {
      const fieldError = toFieldErrors(err).name;
      if (fieldError) setError(fieldError);
      else toast.error(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal show onHide={saving ? undefined : onHide} centered>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton={!saving}>
          <Modal.Title as="h5">{isEdit ? 'Sửa loại phòng' : 'Thêm loại phòng'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormInput
            label="Tên loại phòng"
            name="name"
            required
            autoFocus
            className="mb-0"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            error={error}
            hint={isEdit ? 'Mọi phòng đang dùng loại này sẽ hiện tên mới.' : 'VD: Phòng đơn, Phòng có gác xép.'}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner animation="border" size="sm" className="me-2" />}
            {isEdit ? 'Lưu' : 'Thêm'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
