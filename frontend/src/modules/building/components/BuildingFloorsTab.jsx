// UC-15: sơ đồ tầng. Mỗi tầng một hàng (tầng cao nhất ở trên), mỗi phòng một ô tô màu theo trạng thái, bấm ô mở phòng
// Admin sửa tổng số tầng; chỉ xóa được tầng trên cùng khi tầng đó không có phòng (A2) = giảm tổng số tầng đi 1
// rooms do trang chi tiết tải và truyền xuống (dùng chung với dải số liệu); null = đang tải, error = lỗi tải phòng
import { useState } from 'react';
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ConfirmModal from '../../../components/ConfirmModal';
import ErrorState from '../../../components/ErrorState';
import SkeletonRows from '../../../components/SkeletonRows';
import StatusBadge from '../../../components/StatusBadge';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import buildingApi from '../building.api';
import { validateFloorCount } from '../building.validate';

const LEGEND = [ROOM_STATUS.AVAILABLE, ROOM_STATUS.OCCUPIED, ROOM_STATUS.MAINTENANCE];

const BuildingFloorsTab = ({ building, rooms, error, canEdit, onRetry, onChanged }) => {
  const [floorCount, setFloorCount] = useState(String(building.floorCount));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState(null); // tầng trên cùng đang chờ xác nhận xóa

  // tầng N..1, mỗi tầng kèm phòng của nó (sắp theo mã phòng)
  const floors = Array.from({ length: building.floorCount }, (_, index) => {
    const floorNumber = building.floorCount - index;
    const floorRooms = (rooms ?? [])
      .filter((room) => room.floorNumber === floorNumber)
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true }));
    return { floorNumber, roomCount: floorRooms.length, rooms: floorRooms };
  });

  // gửi tổng số tầng mới; dùng chung cho "Lưu" và "Xóa tầng"
  const saveFloorCount = async (value) => {
    setSubmitting(true);
    try {
      const response = await buildingApi.updateFloorCount(building._id, { floorCount: value });
      toast.success('Cập nhật số tầng thành công');
      setFloorCount(String(value));
      setErrors({});
      onChanged(response.data);
      return true;
    } catch (saveError) {
      setErrors(toFieldErrors(saveError.errors));
      if (!saveError.errors) toast.error(saveError.message); // vd BR-042 còn phòng ở tầng bị bỏ
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const clientErrors = validateFloorCount({ floorCount }, [...floors].reverse());
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    saveFloorCount(Number(floorCount));
  };

  const handleDeleteFloor = async () => {
    const saved = await saveFloorCount(deletingFloor.floorNumber - 1);
    if (saved) setDeletingFloor(null);
  };

  if (error) {
    return <ErrorState message="Không tải được sơ đồ tầng." detail={error} onRetry={onRetry} />;
  }

  return (
    <>
      {/* hàng trên: sửa số tầng (Admin) bên trái, chú thích màu bên phải */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        {canEdit ? (
          <Form onSubmit={handleSubmit} noValidate>
            <InputGroup className="w-64" hasValidation>
              <InputGroup.Text className="text-secondary">Số tầng</InputGroup.Text>
              <Form.Control
                name="floorCount"
                type="number"
                min={1}
                step={1}
                value={floorCount}
                onChange={(event) => setFloorCount(event.target.value)}
                isInvalid={Boolean(errors.floorCount)}
                aria-label="Tổng số tầng"
              />
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting && !deletingFloor && (
                  <Spinner animation="border" size="sm" className="me-2" />
                )}
                Lưu
              </Button>
            </InputGroup>
            {errors.floorCount ? (
              <div className="invalid-feedback d-block">{errors.floorCount}</div>
            ) : (
              <div className="form-text text-secondary">
                Không giảm được xuống dưới tầng cao nhất đang có phòng
              </div>
            )}
          </Form>
        ) : (
          <span className="text-secondary">{building.floorCount} tầng</span>
        )}
        <div className="flex flex-wrap items-center gap-2" aria-label="Chú thích màu">
          {LEGEND.map((status) => (
            <StatusBadge key={status} map={ROOM_STATUS_LABEL} value={status} />
          ))}
        </div>
      </div>

      {rooms === null ? (
        <SkeletonRows rows={Math.min(building.floorCount, 5)} columns={4} />
      ) : (
        <div className="border rounded">
          {floors.map((floor, index) => {
            const canDelete =
              canEdit && index === 0 && floor.floorNumber > 1 && floor.roomCount === 0;
            return (
              <div
                key={floor.floorNumber}
                className={`flex flex-col sm:flex-row gap-2 sm:gap-3 px-3 py-3 ${index < floors.length - 1 ? 'border-bottom' : ''}`}
              >
                <div className="flex-none sm:w-28">
                  <div className="fw-semibold">Tầng {floor.floorNumber}</div>
                  <div className="small text-secondary">{floor.roomCount} phòng</div>
                </div>

                {floor.roomCount > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {floor.rooms.map((room) => {
                      const { label, variant } = ROOM_STATUS_LABEL[room.status] ?? {};
                      return (
                        <Link
                          key={room._id}
                          to={`/rooms/${room._id}`}
                          title={`Phòng ${room.roomNumber} · ${label}`}
                          className={`flex flex-col justify-center w-24 h-14 px-2 rounded border border-${variant}-subtle bg-${variant}-subtle text-${variant}-emphasis hover:no-underline transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none`}
                        >
                          <span className="fw-semibold">{room.roomNumber}</span>
                          <span className="small">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-secondary">
                    <span>Chưa có phòng</span>
                    {canDelete && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeletingFloor(floor)}
                        disabled={submitting}
                      >
                        Xóa tầng
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
