// Tạo phòng (UC-16) và cập nhật phòng (UC-17) – Admin
// /admin/buildings/:buildingId/rooms/new → tạo, phòng mới luôn Trống
// /admin/rooms/:id/edit                  → sửa, mã phòng bị khóa, trạng thái chỉ Trống / Bảo trì
import { useState } from 'react';
import { Alert, Breadcrumb, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { buildingApi } from '../../../api/building.api.js';
import { roomApi } from '../../../api/room.api.js';
import { roomTypeApi } from '../../../api/roomType.api.js';
import useFetch from '../../../hooks/useFetch.js';
import { hasFieldErrors, toFieldErrors } from '../../../utils/apiError.js';
import { ROOM_STATUS } from '../../../constants/enums.js';
import { STATUS_LABELS } from '../../../constants/statusLabels.js';
import PageHeader from '../../../components/common/PageHeader.jsx';
import FormInput from '../../../components/common/FormInput.jsx';
import MoneyInput from '../../../components/common/MoneyInput.jsx';
import ImageUpload from '../../../components/common/ImageUpload.jsx';
import Loading from '../../../components/common/Loading.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';

const ROOM_LABELS = STATUS_LABELS.ROOM_STATUS;

const validate = (form, isEdit) => {
  const errors = {};
  if (!isEdit && !form.roomNumber.trim()) errors.roomNumber = 'Vui lòng nhập mã phòng';
  if (!form.floorNumber) errors.floorNumber = 'Vui lòng chọn tầng';
  if (!form.roomTypeId) errors.roomTypeId = 'Vui lòng chọn loại phòng';
  if (!(Number(form.area) > 0)) errors.area = 'Diện tích phải lớn hơn 0';
  if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1) {
    errors.capacity = 'Sức chứa phải là số nguyên từ 1 trở lên';
  }
  if (!(Number(form.rentPrice) > 0)) errors.rentPrice = 'Giá thuê phải lớn hơn 0';
  if (!(Number(form.deposit) > 0)) errors.deposit = 'Tiền cọc phải lớn hơn 0';
  return errors;
};

function RoomForm({ building, roomTypes, room }) {
  const navigate = useNavigate();
  const isEdit = Boolean(room);
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          roomNumber: room.roomNumber,
          floorNumber: String(room.floorNumber),
          roomTypeId: room.roomTypeId?._id || '',
          area: String(room.area),
          capacity: String(room.capacity),
          rentPrice: room.rentPrice,
          deposit: room.deposit,
          status: room.status,
          images: room.images,
        }
      : { roomNumber: '', floorNumber: '', roomTypeId: '', area: '', capacity: '1', rentPrice: '', deposit: '', images: [] },
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const handleChange = (e) => setField(e.target.name, e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form, isEdit);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const body = {
      floorNumber: Number(form.floorNumber),
      roomTypeId: form.roomTypeId,
      area: Number(form.area),
      capacity: Number(form.capacity),
      rentPrice: form.rentPrice,
      deposit: form.deposit,
      images: form.images,
    };

    setSaving(true);
    try {
      if (isEdit) {
        const res = await roomApi.update(room._id, { ...body, status: form.status });
        toast.success(res.message);
        navigate(`/admin/rooms/${room._id}`, { replace: true });
      } else {
        const res = await roomApi.create(building._id, { ...body, roomNumber: form.roomNumber.trim() });
        toast.success(res.message);
        navigate(`/admin/buildings/${building._id}?tab=rooms`, { replace: true });
      }
    } catch (err) {
      if (hasFieldErrors(err)) setErrors(toFieldErrors(err));
      else toast.error(err.message);
      setSaving(false);
    }
  };

  const backTo = isEdit ? `/admin/rooms/${room._id}` : `/admin/buildings/${building._id}?tab=rooms`;
  const isOccupied = isEdit && room.status === ROOM_STATUS.OCCUPIED;

  const floorOptions = Array.from({ length: building.floorCount }, (_, i) => ({ value: String(i + 1), label: `Tầng ${i + 1}` }));
  const typeOptions = roomTypes.map((t) => ({ value: t._id, label: t.name }));
  const statusOptions = (isOccupied ? [ROOM_STATUS.OCCUPIED] : [])
    .concat([ROOM_STATUS.AVAILABLE, ROOM_STATUS.MAINTENANCE])
    .map((value) => ({ value, label: ROOM_LABELS[value].label }));

  return (
    <Form noValidate onSubmit={handleSubmit}>
      <Card className="max-w-3xl">
        <Card.Body className="grid gap-x-4 sm:grid-cols-2">
          <FormInput
            label="Mã phòng"
            name="roomNumber"
            required={!isEdit}
            disabled={isEdit}
            placeholder="VD: 101"
            value={form.roomNumber}
            onChange={handleChange}
            error={errors.roomNumber}
            hint={isEdit ? 'Mã phòng không sửa được sau khi tạo.' : 'Không trùng với phòng khác trong tòa.'}
          />
          <FormInput label="Tầng" name="floorNumber" required options={floorOptions} placeholder="Chọn tầng" value={form.floorNumber} onChange={handleChange} error={errors.floorNumber} />
          <FormInput label="Loại phòng" name="roomTypeId" required options={typeOptions} placeholder="Chọn loại phòng" value={form.roomTypeId} onChange={handleChange} error={errors.roomTypeId} />
          <FormInput label="Diện tích (m²)" name="area" type="number" min={0} step="0.1" required value={form.area} onChange={handleChange} error={errors.area} />
          <FormInput label="Sức chứa tối đa (người)" name="capacity" type="number" min={1} required value={form.capacity} onChange={handleChange} error={errors.capacity} />
          {isEdit && (
            <FormInput
              label="Trạng thái"
              name="status"
              options={statusOptions}
              disabled={isOccupied}
              value={form.status}
              onChange={handleChange}
              error={errors.status}
              hint={isOccupied ? 'Phòng đang thuê: trạng thái do hợp đồng quyết định.' : 'Chỉ chuyển giữa Trống và Bảo trì.'}
            />
          )}
          <MoneyInput label="Giá thuê / tháng" name="rentPrice" required value={form.rentPrice} onChange={(v) => setField('rentPrice', v)} error={errors.rentPrice} />
          <MoneyInput
            label="Tiền cọc"
            name="deposit"
            required
            value={form.deposit}
            onChange={(v) => setField('deposit', v)}
            error={errors.deposit}
            hint={isEdit ? 'Đổi giá, cọc chỉ áp dụng cho hợp đồng tạo sau này.' : undefined}
          />
          <div className="sm:col-span-2">
            <ImageUpload label="Ảnh phòng" multiple max={8} value={form.images} onChange={(images) => setField('images', images)} />
          </div>
        </Card.Body>
        <Card.Footer className="flex justify-end gap-2 bg-white">
          <Button variant="secondary" onClick={() => navigate(backTo)} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner animation="border" size="sm" className="me-2" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo phòng'}
          </Button>
        </Card.Footer>
      </Card>
    </Form>
  );
}

export default function RoomFormPage() {
  const { id, buildingId } = useParams();
  const isEdit = Boolean(id);

  const roomQuery = useFetch(() => (isEdit ? roomApi.get(id) : Promise.resolve({ data: null })), [id]);
  const buildingQuery = useFetch(() => (isEdit ? Promise.resolve({ data: null }) : buildingApi.get(buildingId)), [buildingId]);
  const typesQuery = useFetch(() => roomTypeApi.list(), []);

  const room = roomQuery.data;
  // Khi sửa, thông tin tòa lấy từ room.buildingId (đã populate { _id, name, floorCount })
  const building = isEdit ? room?.buildingId : buildingQuery.data;
  const loading = roomQuery.loading || buildingQuery.loading || typesQuery.loading;

  let content;
  if (loading) content = <Loading />;
  else if (!building || !typesQuery.data) content = <EmptyState message="Không tải được dữ liệu, vui lòng thử lại." />;
  else if (typesQuery.data.length === 0) {
    content = (
      <Alert variant="warning" className="max-w-3xl">
        Chưa có loại phòng nào. Hãy <Link to="/admin/room-types">thêm loại phòng</Link> trước khi tạo phòng.
      </Alert>
    );
  } else content = <RoomForm building={building} roomTypes={typesQuery.data} room={room} />;

  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/admin/buildings' }}>
          Tòa nhà
        </Breadcrumb.Item>
        {building && (
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/admin/buildings/${building._id}?tab=rooms` }}>
            {building.name}
          </Breadcrumb.Item>
        )}
        {isEdit && room && (
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/admin/rooms/${id}` }}>
            Phòng {room.roomNumber}
          </Breadcrumb.Item>
        )}
        <Breadcrumb.Item active>{isEdit ? 'Chỉnh sửa' : 'Thêm phòng'}</Breadcrumb.Item>
      </Breadcrumb>
      <PageHeader title={isEdit ? `Chỉnh sửa phòng ${room?.roomNumber || ''}` : 'Thêm phòng'} />
      {content}
    </div>
  );
}
