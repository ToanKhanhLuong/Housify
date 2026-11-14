// UC-10: ngưng hoạt động Manager đang rảnh (chưa phụ trách tòa), bắt buộc nhập lý do và tích xác nhận
import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import BlockedBox from '../../../components/BlockedBox';
import Input from '../../../components/Input';
import { hasErrors } from '../../../utils/formErrors';
import managerApi from '../manager.api';
import { validateLockReason } from '../manager.validate';

const LockManagerModal = ({ manager, onHide, onDone }) => {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { building } = manager;
  const isAssignedToBuilding = Boolean(building);

  const handleDeactivate = async (event) => {
    event.preventDefault();
    if (isAssignedToBuilding) return;

    const clientErrors = validateLockReason({ reason });
    setErrors(clientErrors);
    if (hasErrors(clientErrors) || !confirmed) return;

    setSubmitting(true);
    try {
      const response = await managerApi.lock(manager._id, { reason: reason.trim() });
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Đã chuyển Manager sang trạng thái Ngưng hoạt động');
      onDone();
    } catch (error) {
      if (error.errors) setErrors({ reason: error.errors[0]?.message });
      else toast.error(error.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleDeactivate} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">Ngưng hoạt động tài khoản Manager</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isAssignedToBuilding ? (
            <BlockedBox title="Không thể ngưng hoạt động khi đang phụ trách tòa nhà">
              <div>
                <strong>{manager.name}</strong> hiện đang phụ trách tòa{' '}
                <strong>{building.name}</strong>.
              </div>
              <div className="mt-1">
                {building.canUnassign === false ? (
                  <>
                    Tòa này đang có hợp đồng / cư dân hoạt động nên không được để trống Manager. Vui
                    lòng vào trang của một <strong>Manager đang hoạt động và chưa có tòa</strong> để
                    phân công thay thế vào <strong>{building.name}</strong> trước.
                  </>
                ) : (
                  <>
                    Tòa này hiện chưa có cư dân ở. Vui lòng bấm <strong>Gỡ phân công</strong> để gỡ{' '}
                    {manager.name} khỏi <strong>{building.name}</strong> trước khi cho ngưng hoạt
                    động.
                  </>
                )}
              </div>
            </BlockedBox>
          ) : (
            <>
              <Alert variant="warning" className="mb-3">
                <div className="fw-semibold mb-1">Lưu ý trước khi ngưng hoạt động:</div>
                <ul className="mb-0 ps-3 small">
                  <li>
                    <strong>{manager.name}</strong> sẽ bị đăng xuất khỏi hệ thống ngay lập tức và
                    không thể đăng nhập cho đến khi được kích hoạt lại.
                  </li>
                  <li>
                    Hệ thống sẽ ghi lại nhật ký thao tác và gửi email thông báo kèm lý do tới{' '}
                    <strong>{manager.email}</strong>.
                  </li>
                </ul>
              </Alert>
              <Input
                label="Lý do ngưng hoạt động"
                name="reason"
                as="textarea"
                rows={3}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (errors.reason) setErrors((prev) => ({ ...prev, reason: '' }));
                }}
                error={errors.reason}
                helpText="Lý do được lưu vào nhật ký hệ thống và gửi qua email cho Manager."
                className="mb-3"
                required
              />
              <Form.Check
                type="checkbox"
                id="confirm-deactivate-manager"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                label={`Tôi xác nhận cho ${manager.name} chuyển sang trạng thái Ngưng hoạt động`}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          {!isAssignedToBuilding && (
            <Button
              type="submit"
              variant="danger"
              disabled={submitting || !confirmed || !reason.trim()}
            >
              {submitting && <Spinner animation="border" size="sm" className="me-2" />}
              Ngưng hoạt động
            </Button>
          )}
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            {isAssignedToBuilding ? 'Đã hiểu' : 'Hủy'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default LockManagerModal;
