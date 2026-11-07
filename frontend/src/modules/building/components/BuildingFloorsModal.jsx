// UC-15: modal "Quản lý tầng" trong tab Phòng của chi tiết tòa (chốt 30/10) theo mockup docs/mock/BuildingDetail.dc.html
// Sửa tổng số tầng; danh sách tầng kèm số phòng lấy từ GET /buildings/:id/floors
// "Xóa tầng" = giảm tổng số tầng đi 1, chỉ bỏ được tầng trên cùng khi tầng đó không có phòng (UC-15 A2, BR-042)
import { useCallback, useEffect, useState } from 'react';
import { Button, Form, ListGroup, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import ErrorState from '../../../components/ErrorState';
import SkeletonRows from '../../../components/SkeletonRows';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import buildingApi from '../building.api';
import { validateFloorCount } from '../building.validate';

const BuildingFloorsModal = ({ building, onHide, onChanged }) => {
  const [floors, setFloors] = useState([]); // [{ floorNumber, roomCount, statusCounts }] tầng 1..N
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [floorCount, setFloorCount] = useState(String(building.floorCount));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadFloors = useCallback(
    () =>
      buildingApi
        .floors(building._id)
        .then((response) => {
          setFloors(Array.isArray(response.data) ? response.data : []);
          setLoadError('');
        })
        .catch((error) => setLoadError(error.message))
        .finally(() => setLoading(false)),
    [building._id],
  );

  useEffect(() => {
    loadFloors();
  }, [loadFloors]);

  const handleRetry = () => {
    setLoading(true);
    loadFloors();
  };

  const topFloor = floors[floors.length - 1];
  const topBlocked = Boolean(topFloor && topFloor.roomCount > 0);
  // tầng cao nhất đang có phòng: không giảm xuống dưới tầng này
  const highestUsed = [...floors].reverse().find((floor) => floor.roomCount > 0)?.floorNumber ?? 1;

  // gửi tổng số tầng mới; dùng chung cho "Lưu" và "Xóa tầng trên cùng"
  const saveFloorCount = async (value) => {
    setSubmitting(true);
    try {
      const response = await buildingApi.updateFloorCount(building._id, { floorCount: value });
      toast.success('Cập nhật số tầng thành công');
      setFloorCount(String(value));
      setErrors({});
      onChanged(response.data);
      setLoading(true);
      loadFloors();
    } catch (error) {
      setErrors(toFieldErrors(error.errors));
      if (!error.errors) setErrors({ floorCount: error.message }); // vd BR-042 còn phòng ở tầng bị bỏ
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const clientErrors = validateFloorCount({ floorCount }, floors);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    saveFloorCount(Number(floorCount));
  };

  const renderFloors = () => {
    if (loading) return <SkeletonRows rows={3} columns={2} />;
    if (loadError) {
      return (
        <ErrorState
          message="Không tải được danh sách tầng"
          detail={loadError}
          onRetry={handleRetry}
        />
      );
    }
    return (
      <>
        {/* tầng cao nhất ở trên */}
        <ListGroup className="mb-3 max-h-64 overflow-y-auto">
          {[...floors].reverse().map((floor) => (
            <ListGroup.Item key={floor.floorNumber} className="flex items-center justify-between">
              <span className="fw-semibold">Tầng {floor.floorNumber}</span>
              <span className="small text-secondary">{floor.roomCount} phòng</span>
            </ListGroup.Item>
          ))}
        </ListGroup>
        {topFloor && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="danger"
              onClick={() => saveFloorCount(topFloor.floorNumber - 1)}
              disabled={submitting || topBlocked || topFloor.floorNumber <= 1}
            >
              Xóa tầng trên cùng (Tầng {topFloor.floorNumber})
            </Button>
            {topBlocked && (
              <span className="small text-danger">
                Tầng {topFloor.floorNumber} còn phòng, không xóa được.
              </span>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton={!submitting}>
        <Modal.Title className="h5">Quản lý tầng</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit} noValidate className="flex items-start gap-2 mb-3">
          <Input
            label="Tổng số tầng"
            name="floorCount"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={floorCount}
            onChange={(event) => {
              setFloorCount(event.target.value);
              if (errors.floorCount) {
                setErrors((prev) => ({ ...prev, floorCount: undefined }));
              }
            }}
            error={errors.floorCount}
            helpText={`Không giảm được xuống dưới tầng ${highestUsed} – tầng cao nhất đang có phòng.`}
            disabled={submitting}
            className="mb-0 flex-1"
            required
          />
          {/* căn nút ngang với ô nhập (bỏ qua chiều cao nhãn) */}
          <Button type="submit" variant="primary" className="mt-4" disabled={submitting || loading}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Lưu
          </Button>
        </Form>
        {renderFloors()}
      </Modal.Body>
      <Modal.Footer className="justify-content-start">
        <Button variant="secondary" onClick={onHide} disabled={submitting}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BuildingFloorsModal;
