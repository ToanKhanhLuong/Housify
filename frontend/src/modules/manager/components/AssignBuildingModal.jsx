// UC-11: phân công Manager đang hoạt động, chưa có tòa vào một tòa. Mỗi tòa chỉ có một Manager
// GET /buildings trả kèm manager: { _id, name } | null → ghi rõ tòa nào đang do ai phụ trách
// Chọn tòa đã có Manager: báo trước "Lưu sẽ thay Manager cũ" và gửi kèm confirmReplace (UC-11 A1)
// BE vẫn trả 409 nếu tòa vừa có người khác nhận trong lúc mở modal → hiện câu hỏi của BE, đồng ý thì gửi lại
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Select from '../../../components/Select';
import Loading from '../../../components/Loading';
import ErrorState from '../../../components/ErrorState';
import { hasErrors } from '../../../utils/formErrors';
import managerApi from '../manager.api';
import { validateAssignBuilding } from '../manager.validate';

const AssignBuildingModal = ({ manager, onHide, onDone }) => {
  const [buildings, setBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [loadError, setLoadError] = useState(''); // tải danh sách tòa lỗi: ErrorState có nút Thử lại
  const [buildingId, setBuildingId] = useState('');
  const [replaceQuestion, setReplaceQuestion] = useState(''); // câu hỏi BE trả (409) khi tòa vừa có người nhận
  const [confirmedReplace, setConfirmedReplace] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadBuildings = useCallback(
    () =>
      managerApi
        .listBuildings()
        .then((response) => {
          setBuildings(Array.isArray(response.data) ? response.data : []);
          setLoadError('');
        })
        .catch((error) => setLoadError(error.message))
        .finally(() => setLoadingBuildings(false)),
    [],
  );

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  const handleRetry = () => {
    setLoadingBuildings(true);
    loadBuildings();
  };

  // ghi rõ tình trạng từng tòa trong ô chọn
  const options = buildings.map((building) => ({
    value: building._id,
    label: building.manager
      ? `${building.name} — đang do ${building.manager.name} phụ trách`
      : `${building.name} — chưa có Manager`,
  }));

  const selected = buildings.find((building) => building._id === buildingId);
  // Manager đang phụ trách tòa đã chọn (nếu có) → sẽ bị thay
  const currentManager = selected?.manager ?? null;
  const willReplace = Boolean(currentManager) || Boolean(replaceQuestion);

  const handleChangeBuilding = (event) => {
    setBuildingId(event.target.value);
    setReplaceQuestion(''); // đổi tòa thì bỏ câu hỏi thay người của tòa trước
    setConfirmedReplace(false);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateAssignBuilding({ buildingId });
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    if (willReplace && !confirmedReplace) return;

    setSubmitting(true);
    try {
      const response = await managerApi.assignBuilding(buildingId, {
        managerId: manager._id,
        // đã tích xác nhận thay Manager cũ → gửi kèm confirmReplace: true
        ...(willReplace && { confirmReplace: true }),
      });
      // gửi mail lỗi: phân công vẫn thành công, thông báo trong ứng dụng vẫn có (UC-11)
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success(willReplace ? 'Đã thay thế Manager phụ trách tòa nhà' : 'Phân công tòa nhà thành công');
      onDone();
    } catch (error) {
      if (error.status === 409 && !willReplace) {
        setReplaceQuestion(error.message);
        setConfirmedReplace(false);
      } else {
        toast.error(error.message); // vd Manager không còn hoạt động
      }
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (loadingBuildings) return <Loading />;
    if (loadError)
      return (
        <ErrorState
          message="Không tải được danh sách tòa nhà"
          detail={loadError}
          onRetry={handleRetry}
        />
      );

    return (
      <>
        <Select
          label="Tòa nhà"
          name="buildingId"
          options={options}
          value={buildingId}
          onChange={handleChangeBuilding}
          error={errors.buildingId}
          className={buildingId ? 'mb-3' : 'mb-0'}
          required
        />
        {buildingId && !willReplace && (
          <Alert variant="info" className="mb-0 small">
            Hệ thống sẽ ghi nhật ký thao tác, gửi thông báo và email phân công cho{' '}
            <strong>{manager.name}</strong>.
          </Alert>
        )}
        {currentManager && (
          <>
            <Alert variant="warning" className="mb-3">
              <div className="fw-semibold mb-1">
                Lưu ý khi thay thế Manager phụ trách {selected?.name}:
              </div>
              <ul className="mb-0 ps-3 small">
                <li>
                  Tòa này hiện đang do <strong>{currentManager.name}</strong> phụ trách.
                </li>
                <li>
                  Hệ thống sẽ gỡ quyền quản lý tòa của <strong>{currentManager.name}</strong> và
                  chuyển giao ngay cho <strong>{manager.name}</strong>.
                </li>
                <li>
                  Nhật ký hệ thống sẽ ghi lại thay đổi và gửi thông báo + email cho{' '}
                  <strong>cả 2 Manager</strong>.
                </li>
              </ul>
            </Alert>
            <Form.Check
              type="checkbox"
              id="confirm-replace-manager"
              checked={confirmedReplace}
              onChange={(event) => setConfirmedReplace(event.target.checked)}
              label={`Tôi xác nhận thay thế ${currentManager.name} bằng ${manager.name} phụ trách ${selected?.name}`}
            />
          </>
        )}
        {!currentManager && replaceQuestion && (
          <>
            <Alert variant="warning" className="mb-3">
              {replaceQuestion}
            </Alert>
            <Form.Check
              type="checkbox"
              id="confirm-replace-manager-race"
              checked={confirmedReplace}
              onChange={(event) => setConfirmedReplace(event.target.checked)}
              label="Tôi xác nhận đồng ý thay thế Manager hiện tại của tòa nhà"
            />
          </>
        )}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">Phân công tòa cho {manager.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-secondary">Mỗi Manager phụ trách đúng một tòa. Chọn tòa:</p>
          {renderBody()}
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button
            type="submit"
            variant="primary"
            disabled={
              submitting ||
              loadingBuildings ||
              Boolean(loadError) ||
              !buildingId ||
              (willReplace && !confirmedReplace)
            }
          >
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            {willReplace ? 'Xác nhận thay Manager' : 'Phân công'}
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AssignBuildingModal;
