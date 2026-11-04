// UC-24: tạo hợp đồng thuê (Manager) – chọn phòng Trống của tòa (giá thuê, tiền cọc lấy từ phòng, chỉ xem),
// ngày bắt đầu + số tháng (tự tính ngày kết thúc), CCCD + email người đại diện, Đơn / Nhóm, ghi chú
// Người ở cùng (Nhóm): Manager CÓ THỂ nhập trước, không bắt buộc – khách tự thêm khi kích hoạt lần đầu, sau đó chỉ Manager thêm (UC-32)
// Tạo xong: chuyển sang chi tiết, hiện thông báo đã gửi lời mời (kèm link thử khi chạy dev). Mở sẵn phòng: /contracts/new?roomId=
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { BiPlus, BiSend, BiTrash, BiUser } from 'react-icons/bi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FieldRow from '../../components/FieldRow';
import Input from '../../components/Input';
import MoneyText from '../../components/MoneyText';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { CONTRACT_TYPE, ROOM_STATUS } from '../../constants/enums';
import { CONTRACT_TYPE_LABEL } from '../../constants/statusLabels';
import { formatDate, toDateInput } from '../../utils/format';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import contractApi from './contract.api';
import { validateCreateContract } from './contract.validate';
import { endDateOf } from './contractFormat';

const TODAY = toDateInput(new Date()); // tính 1 lần khi nạp trang

const newPerson = () => ({
  id: `${Date.now()}-${Math.random()}`, // khóa React, không gửi lên BE
  name: '',
  cccd: '',
  phone: '',
  dateOfBirth: '',
  address: '',
});

const ContractCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const buildingId = user.building?._id;

  const [rooms, setRooms] = useState(null); // phòng Trống của tòa, null = đang tải
  const [draftRoomIds, setDraftRoomIds] = useState([]); // phòng Trống nhưng đã có hợp đồng nháp
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    roomId: searchParams.get('roomId') ?? '',
    contractType: CONTRACT_TYPE.SINGLE,
    startDate: TODAY,
    durationMonths: '12',
    representativeCccd: '',
    representativeEmail: '',
    notes: '',
    coOccupants: [],
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // phòng Trống + hợp đồng nháp (phòng có nháp thì BE từ chối tạo thêm → làm mờ trong ô chọn)
  useEffect(() => {
    if (!buildingId) return;
    Promise.all([
      contractApi.rooms(buildingId, { status: ROOM_STATUS.AVAILABLE }),
      contractApi.list({ status: 'DRAFT', limit: 50 }),
    ])
      .then(([roomsResponse, draftsResponse]) => {
        const list = Array.isArray(roomsResponse.data) ? roomsResponse.data : [];
        setRooms(list);
        setDraftRoomIds(
          (draftsResponse.data?.items ?? []).map((contract) => String(contract.roomId)),
        );
      })
      .catch((error) => {
        setRooms([]);
        setLoadError(error.message);
      });
  }, [buildingId]);

  const room = rooms?.find((item) => item._id === form.roomId) ?? null;
  const capacity = room?.roomType?.capacity ?? null;
  const isGroup = form.contractType === CONTRACT_TYPE.GROUP;
  const endDate = endDateOf(form.startDate, form.durationMonths);
  const total = 1 + (isGroup ? form.coOccupants.length : 0);
  const full = capacity !== null && total >= capacity;

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const handleChange = (event) => setField(event.target.name, event.target.value);
  const updatePerson = (index, field, value) =>
    setField(
      'coOccupants',
      form.coOccupants.map((person, position) =>
        position === index ? { ...person, [field]: value } : person,
      ),
    );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateCreateContract(form, capacity);
    setErrors(clientErrors);
    setSubmitError('');
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const response = await contractApi.create({
        roomId: form.roomId,
        startDate: form.startDate,
        durationMonths: Number(form.durationMonths),
        representativeCccd: form.representativeCccd.trim(),
        representativeEmail: form.representativeEmail.trim(),
        contractType: form.contractType,
        notes: form.notes.trim(),
        coOccupants: isGroup
          ? form.coOccupants.map(({ name, cccd, phone, dateOfBirth, address }) => ({
              name: name.trim(),
              cccd: cccd.trim(),
              phone: phone.trim(),
              dateOfBirth,
              address: address.trim(),
            }))
          : [],
      });
      const { _id, rawToken, warning } = response.data;
      navigate(`/contracts/${_id}`, { replace: true, state: { invite: { rawToken, warning } } });
    } catch (error) {
      setSubmitting(false);
      if (error.errors) setErrors(toFieldErrors(error.errors));
      else setSubmitError(error.message); // vd khách đang thuê phòng khác, vượt sức chứa, phòng không còn trống
    }
  };

  if (rooms === null) {
    return (
      <Card>
        <Card.Body>
          <SkeletonRows rows={6} columns={3} />
        </Card.Body>
      </Card>
    );
  }
  if (loadError)
    return <ErrorState message="Không tải được danh sách phòng trống" detail={loadError} />;
  if (rooms.length === 0) {
    return (
      <EmptyState message="Tòa chưa có phòng Trống nào để tạo hợp đồng.">
        <Button variant="secondary" onClick={() => navigate('/contracts')}>
          Về danh sách hợp đồng
        </Button>
      </EmptyState>
    );
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <PageHeader
        backTo="/contracts"
        breadcrumbs={[{ label: 'Hợp đồng', to: '/contracts' }, 'Tạo hợp đồng']}
        actions={
          <>
            <Button
              type="submit"
              variant="primary"
              className="flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? <Spinner animation="border" size="sm" /> : <BiSend />}
              Gửi lời mời ký hợp đồng
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/contracts')}
              disabled={submitting}
            >
              Hủy
            </Button>
          </>
        }
      />

      <Card className="hf-paper">
        {submitError && (
          <Alert variant="danger" className="mb-0">
            {submitError}
          </Alert>
        )}

        {/* phòng + giá cọc (chỉ xem) */}
        <Row className="g-3">
          <Col lg={6}>
            <Form.Group controlId="roomId">
              <Form.Label>
                Phòng<span className="text-danger ms-1">*</span>
              </Form.Label>
              <Form.Select
                name="roomId"
                value={form.roomId}
                onChange={handleChange}
                isInvalid={Boolean(errors.roomId)}
                disabled={submitting}
              >
                <option value="">-- Chọn phòng Trống --</option>
                {rooms.map((item) => {
                  const hasDraft = draftRoomIds.includes(String(item._id));
                  return (
                    <option key={item._id} value={item._id} disabled={hasDraft}>
                      Phòng {item.roomNumber} · Tầng {item.floorNumber} ·{' '}
                      {item.roomType?.name ?? '—'}
                      {hasDraft ? ' (đang có hợp đồng nháp)' : ''}
                    </option>
                  );
                })}
              </Form.Select>
              {errors.roomId && <div className="small text-danger mt-1">{errors.roomId}</div>}
            </Form.Group>
          </Col>
          <Col lg={6}>
            {room ? (
              <div className="rounded border bg-body-tertiary px-3 py-2">
                <FieldRow label="Giá thuê">
                  <span className="fw-semibold">
                    <MoneyText value={room.rentPrice} />
                  </span>{' '}
                  / tháng
                </FieldRow>
                <FieldRow label="Tiền cọc">
                  <MoneyText value={room.deposit} />
                </FieldRow>
                <FieldRow label="Sức chứa">
                  Tối đa {capacity ?? '—'} người · {room.area} m²
                </FieldRow>
              </div>
            ) : (
              <div className="small text-secondary pt-lg-4">
                Chọn phòng để xem giá thuê, tiền cọc và sức chứa.
              </div>
            )}
          </Col>
        </Row>

        <Row className="g-3">
          <Col md={4}>
            <Input
              label="Ngày bắt đầu"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              error={errors.startDate}
              required
              disabled={submitting}
              className="mb-0"
            />
          </Col>
          <Col md={4}>
            <Input
              label="Thời hạn (tháng)"
              name="durationMonths"
              type="number"
              min={1}
              max={120}
              value={form.durationMonths}
              onChange={handleChange}
              error={errors.durationMonths}
              helpText={endDate ? `Kết thúc ngày ${formatDate(endDate)}` : undefined}
              required
              disabled={submitting}
              className="mb-0"
            />
          </Col>
          <Col md={4}>
            <Form.Label>
              Loại hợp đồng<span className="text-danger ms-1">*</span>
            </Form.Label>
            <div className="flex gap-3 pt-1">
              {[CONTRACT_TYPE.SINGLE, CONTRACT_TYPE.GROUP].map((type) => (
                <Form.Check
                  key={type}
                  type="radio"
                  id={`type-${type}`}
                  name="contractType"
                  label={CONTRACT_TYPE_LABEL[type].label}
                  checked={form.contractType === type}
                  onChange={() => setField('contractType', type)}
                  // phòng 1 người thì không có hợp đồng nhóm
                  disabled={submitting || (type === CONTRACT_TYPE.GROUP && capacity === 1)}
                />
              ))}
            </div>
          </Col>
        </Row>
        {form.startDate && form.startDate < TODAY && (
          <Alert variant="warning" className="mb-0 small">
            Ngày bắt đầu đã ở quá khứ (hợp đồng hồi tố). Vẫn tạo được.
          </Alert>
        )}

        <div>
          <h2 className="h6 fw-bold mb-1">Người đại diện</h2>
          <div className="small text-secondary mb-2">
            Khách nhận email mời ký, tự điền họ tên, số điện thoại, ảnh CCCD khi kích hoạt. Sau này
            đăng nhập bằng số CCCD.
          </div>
          <Row className="g-3">
            <Col md={6}>
              <Input
                label="Số CCCD"
                name="representativeCccd"
                value={form.representativeCccd}
                onChange={handleChange}
                error={errors.representativeCccd}
                inputMode="numeric"
                maxLength={12}
                placeholder="12 chữ số"
                required
                disabled={submitting}
                className="mb-0"
              />
            </Col>
            <Col md={6}>
              <Input
                label="Email"
                name="representativeEmail"
                type="email"
                value={form.representativeEmail}
                onChange={handleChange}
                error={errors.representativeEmail}
                placeholder="Email nhận lời mời ký hợp đồng"
                required
                disabled={submitting}
                className="mb-0"
              />
            </Col>
          </Row>
        </div>

        {/* người ở cùng: không bắt buộc, khách tự thêm được khi kích hoạt lần đầu */}
        {isGroup && (
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="h6 fw-bold mb-0">
                Người ở cùng <span className="fw-normal text-secondary">(không bắt buộc)</span>
              </h2>
              <span className="small text-secondary">
                {total}/{capacity ?? '—'} người, tính cả người đại diện
              </span>
            </div>
            <div className="small text-secondary">
              Có thể nhập trước nếu biết. Khách cũng tự thêm được khi kích hoạt hợp đồng lần đầu;
              sau đó chỉ Manager thêm.
            </div>
            {errors.coOccupants && (
              <Alert variant="danger" className="mb-0">
                {errors.coOccupants}
              </Alert>
            )}
            {form.coOccupants.map((person, index) => {
              const error = (field) => errors[`coOccupants.${index}.${field}`];
              return (
                <Card key={person.id} className="bg-body-tertiary">
                  <Card.Body className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="fw-semibold flex items-center gap-2">
                        <BiUser />
                        Người ở cùng #{index + 1}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() =>
                          setField(
                            'coOccupants',
                            form.coOccupants.filter((_, position) => position !== index),
                          )
                        }
                        disabled={submitting}
                      >
                        <BiTrash />
                        Xóa
                      </Button>
                    </div>
                    <Row className="g-3">
                      <Col md={6}>
                        <Input
                          label="Họ và tên"
                          name={`coOccupants.${index}.name`}
                          value={person.name}
                          onChange={(event) => updatePerson(index, 'name', event.target.value)}
                          error={error('name')}
                          maxLength={100}
                          required
                          className="mb-0"
                        />
                      </Col>
                      <Col md={6}>
                        <Input
                          label="Số CCCD"
                          name={`coOccupants.${index}.cccd`}
                          value={person.cccd}
                          onChange={(event) => updatePerson(index, 'cccd', event.target.value)}
                          error={error('cccd')}
                          inputMode="numeric"
                          maxLength={12}
                          required
                          className="mb-0"
                        />
                      </Col>
                      <Col md={4}>
                        <Input
                          label="Số điện thoại"
                          name={`coOccupants.${index}.phone`}
                          value={person.phone}
                          onChange={(event) => updatePerson(index, 'phone', event.target.value)}
                          error={error('phone')}
                          inputMode="tel"
                          maxLength={10}
                          required
                          className="mb-0"
                        />
                      </Col>
                      <Col md={4}>
                        <Input
                          label="Ngày sinh"
                          name={`coOccupants.${index}.dateOfBirth`}
                          type="date"
                          value={person.dateOfBirth}
                          onChange={(event) =>
                            updatePerson(index, 'dateOfBirth', event.target.value)
                          }
                          error={error('dateOfBirth')}
                          required
                          className="mb-0"
                        />
                      </Col>
                      <Col md={4}>
                        <Input
                          label="Địa chỉ"
                          name={`coOccupants.${index}.address`}
                          value={person.address}
                          onChange={(event) => updatePerson(index, 'address', event.target.value)}
                          error={error('address')}
                          maxLength={255}
                          className="mb-0"
                        />
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              );
            })}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                className="flex items-center gap-1"
                onClick={() => setField('coOccupants', [...form.coOccupants, newPerson()])}
                disabled={submitting || !room || full}
              >
                <BiPlus />
                Thêm người ở cùng
              </Button>
              {!room && (
                <span className="small text-secondary">Chọn phòng trước để biết sức chứa.</span>
              )}
              {room && full && (
                <span className="small text-secondary">
                  Phòng đã đủ sức chứa ({capacity} người).
                </span>
              )}
            </div>
          </section>
        )}

        <Input
          label="Ghi chú / điều khoản đặc biệt"
          name="notes"
          as="textarea"
          rows={3}
          value={form.notes}
          onChange={handleChange}
          error={errors.notes}
          maxLength={1000}
          helpText={`${form.notes.length}/1000 ký tự · in vào hợp đồng khách xem khi kích hoạt`}
          disabled={submitting}
          className="mb-0"
        />
      </Card>
    </Form>
  );
};

export default ContractCreatePage;
