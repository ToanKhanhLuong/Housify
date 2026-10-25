// UC-15: quản lý tầng (Admin). Tầng 1..N sinh từ tổng số tầng, kèm số phòng theo trạng thái
// Chỉ xóa được tầng trên cùng và tầng đó không có phòng (A2), = giảm tổng số tầng đi 1
import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import Input from '../../../components/Input';
import ConfirmModal from '../../../components/ConfirmModal';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import buildingApi from '../building.api';
import { validateFloorCount } from '../building.validate';

const STATUS_COLUMNS = [ROOM_STATUS.AVAILABLE, ROOM_STATUS.OCCUPIED, ROOM_STATUS.MAINTENANCE];

const BuildingFloorsTab = ({ building, onChanged }) => {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floorCount, setFloorCount] = useState(String(building.floorCount));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState(null); // tầng trên cùng đang chờ xác nhận xóa

  const loadFloors = useCallback(
    () =>
      buildingApi
        .floors(building._id)
        .then((response) => setFloors(response.data))
        .catch((error) => toast.error(error.message))
        .finally(() => setLoading(false)),
    [building._id],
  );

  useEffect(() => {
    loadFloors();
  }, [loadFloors]);

  // gửi tổng số tầng mới; dùng chung cho "Lưu" và "Xóa tầng"
  const saveFloorCount = async (value) => {
    setSubmitting(true);
    try {
      const response = await buildingApi.updateFloorCount(building._id, { floorCount: value });
      toast.success('Cập nhật số tầng thành công');
      setFloorCount(String(value));
      setErrors({});
      onChanged(response.data);
      loadFloors();
      return true;
    } catch (error) {
      setErrors(toFieldErrors(error.errors));
      if (!error.errors) toast.error(error.message); // vd BR-042 còn phòng ở tầng bị bỏ
      return false;
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

  const handleDeleteFloor = async () => {
    const saved = await saveFloorCount(deletingFloor.floorNumber - 1);
    if (saved) setDeletingFloor(null);
  };

  const topFloor = floors[floors.length - 1]?.floorNumber;

  const columns = [
    {
      key: 'floorNumber',
      title: 'Tầng',
      className: 'fw-semibold',
      render: (row) => `Tầng ${row.floorNumber}`,
    },
    { key: 'roomCount', title: 'Số phòng', align: 'end' },
    ...STATUS_COLUMNS.map((status) => ({
      key: status,
      title: ROOM_STATUS_LABEL[status].label,
      align: 'end',
      render: (row) => row.statusCounts?.[status] ?? 0,
    })),
    {
      key: 'actions',
      title: '',
      align: 'end',
      // A2: chỉ tầng trên cùng, không có phòng, và tòa còn ít nhất 1 tầng sau khi xóa
      render: (row) =>
        row.floorNumber === topFloor &&
        row.floorNumber > 1 &&
        row.roomCount === 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDeletingFloor(row)}
            disabled={submitting}
          >
            Xóa tầng
          </Button>
        ),
    },
  ];

  return (
    <>
      <Form onSubmit={handleSubmit} noValidate className="mb-3">
        <Form.Label htmlFor="floorCount">
          Tổng số tầng
          <span className="text-danger ms-1">*</span>
        </Form.Label>
        <div className="flex items-start gap-2">
          <Input
            name="floorCount"
            type="number"
            min={1}
            step={1}
            value={floorCount}
            onChange={(event) => setFloorCount(event.target.value)}
            error={errors.floorCount}
            helpText="Không giảm được xuống dưới tầng cao nhất đang có phòng"
            className="mb-0 w-full max-w-xs"
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && !deletingFloor && (
              <Spinner animation="border" size="sm" className="me-2" />
            )}
            Lưu
          </Button>
        </div>
      </Form>

      <DataTable
        columns={columns}
        data={floors}
        rowKey="floorNumber"
        loading={loading}
        emptyMessage="Tòa nhà chưa có tầng nào"
      />

      <ConfirmModal
        show={Boolean(deletingFloor)}
        title="Xóa tầng"
        message={`Bạn chắc chắn muốn xóa Tầng ${deletingFloor?.floorNumber}?`}
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
        onConfirm={handleDeleteFloor}
        onCancel={() => setDeletingFloor(null)}
      />
    </>
  );
};

export default BuildingFloorsTab;
