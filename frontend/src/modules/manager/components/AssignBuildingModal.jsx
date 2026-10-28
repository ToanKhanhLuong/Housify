// UC-11: phân công Manager đang hoạt động, chưa có tòa vào một tòa.
// Tòa đã có Manager: BE trả 409 kèm câu hỏi → hiện câu hỏi trong modal, đồng ý thì gửi lại kèm confirmReplace (UC-11 A1)
import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Select from '../../../components/Select';
import Loading from '../../../components/Loading';
import { hasErrors } from '../../../utils/formErrors';
import managerApi from '../manager.api';
import { validateAssignBuilding } from '../manager.validate';

const AssignBuildingModal = ({ manager, onHide, onDone }) => {
  const [buildings, setBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [buildingId, setBuildingId] = useState('');
  const [replaceQuestion, setReplaceQuestion] = useState(''); // câu hỏi BE trả khi tòa đã có Manager
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    managerApi
      .listBuildings()
      .then((response) => setBuildings(response.data?.items ?? response.data ?? []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingBuildings(false));
  }, []);

  // tòa đã có người phụ trách thì ghi chú để Admin biết trước (managerId theo docs/database.md)
  const options = buildings.map((building) => ({
    value: building._id,
    label: building.managerId ? `${building.name} (đã có Manager)` : building.name,
  }));

  const handleChangeBuilding = (event) => {
    setBuildingId(event.target.value);
    setReplaceQuestion(''); // đổi tòa thì bỏ câu hỏi thay người của tòa trước
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateAssignBuilding({ buildingId });
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const response = await managerApi.assignBuilding(buildingId, {
        managerId: manager._id,
        ...(replaceQuestion && { confirmReplace: true }),
      });
      // gửi mail lỗi: phân công vẫn thành công, thông báo trong ứng dụng vẫn có (UC-11)
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Phân công tòa nhà thành công');
      onDone();
    } catch (error) {
      if (error.status === 409 && !replaceQuestion) setReplaceQuestion(error.message);
      else toast.error(error.message); // vd Manager không còn hoạt động
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="h5">Phân công tòa nhà</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Chọn tòa cho <strong>{manager.name}</strong>. Mỗi tòa chỉ có một Manager.
          </p>
          {loadingBuildings ? (
            <Loading />
          ) : (
            <Select
              label="Tòa nhà"
              name="buildingId"
              options={options}
              value={buildingId}
              onChange={handleChangeBuilding}
              error={errors.buildingId}
              className={replaceQuestion ? 'mb-3' : 'mb-0'}
              required
            />
          )}
          {replaceQuestion && (
            <Alert variant="warning" className="mb-0">
              {replaceQuestion}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button type="submit" variant="primary" disabled={submitting || loadingBuildings}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            {replaceQuestion ? 'Thay Manager' : 'Phân công'}
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
