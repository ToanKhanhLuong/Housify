// UC-06: người đại diện tự nhập người ở cùng khi kích hoạt hợp đồng nhóm (thay cho Manager nhập ở UC-24)
// value = [{ id, name, cccd, phone, dateOfBirth, address }]; người Manager đã nhập sẵn (contract.coOccupants) chỉ hiện để xem
// Tổng số người, tính cả người đại diện, không vượt sức chứa loại phòng. Lỗi từng ô theo khóa BE trả: coOccupants.0.cccd …
import { Alert, Badge, Button, Card, Col, Row } from 'react-bootstrap';
import { BiPlus, BiTrash, BiUser } from 'react-icons/bi';
import Input from '../../../components/Input';
import { formatDate, toDateInput } from '../../../utils/format';

const TODAY = toDateInput(new Date());

const newPerson = () => ({
  id: `${Date.now()}-${Math.random()}`, // khóa React, không gửi lên BE
  name: '',
  cccd: '',
  phone: '',
  dateOfBirth: '',
  address: '',
});

const CoOccupantsInput = ({ contract, value, onChange, onClearError, errors = {}, disabled = false }) => {
  const existing = contract.coOccupants ?? [];
  const capacity = contract.room.capacity;
  const total = 1 + existing.length + value.length; // tính cả người đại diện
  const full = capacity != null && total >= capacity;

  const updatePerson = (index, field, fieldValue) => {
    onClearError?.(`coOccupants.${index}.${field}`);
    onClearError?.('coOccupants');
    onChange(
      value.map((person, position) =>
        position === index ? { ...person, [field]: fieldValue } : person,
      ),
    );
  };
  const removePerson = (index) => onChange(value.filter((_, position) => position !== index));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="h5 fw-bold mb-0">Người ở cùng</h2>
        <Badge
          bg={full ? 'warning' : 'success'}
          text={full ? 'dark' : undefined}
          className="fw-semibold"
        >
          {total}/{capacity ?? '—'} người (tính cả bạn)
        </Badge>
      </div>
      <div className="small text-secondary">
        Nhập những người sẽ ở cùng bạn. Người ở cùng không có tài khoản đăng nhập. Sau khi vào ở, có
        người mới đến thì Manager thêm giúp.
      </div>

      {errors.coOccupants && (
        <Alert variant="danger" className="mb-0">
          {errors.coOccupants}
        </Alert>
      )}

      {/* người Manager đã nhập sẵn lúc tạo hợp đồng (luồng cũ): chỉ xem */}
      {existing.map((person) => (
        <div key={person.cccd} className="rounded border bg-body-tertiary px-3 py-2 small">
          <span className="fw-semibold">{person.name}</span> · CCCD {person.cccd} · {person.phone} ·{' '}
          {formatDate(person.dateOfBirth)}
          <span className="text-secondary"> (Manager đã nhập)</span>
        </div>
      ))}

      {value.map((person, index) => {
        const error = (field) => errors[`coOccupants.${index}.${field}`];
        return (
          <Card key={person.id} className="bg-body-tertiary">
            <Card.Body className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="fw-semibold flex items-center gap-2">
                  <BiUser />
                  Người ở cùng #{existing.length + index + 1}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => removePerson(index)}
                  disabled={disabled}
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
                    placeholder="12 chữ số"
                    required
                    className="mb-0"
                  />
                </Col>
                <Col md={6}>
                  <Input
                    label="Số điện thoại"
                    name={`coOccupants.${index}.phone`}
                    value={person.phone}
                    onChange={(event) => updatePerson(index, 'phone', event.target.value)}
                    error={error('phone')}
                    inputMode="tel"
                    maxLength={10}
                    placeholder="0912345678"
                    required
                    className="mb-0"
                  />
                </Col>
                <Col md={6}>
                  <Input
                    label="Ngày sinh"
                    name={`coOccupants.${index}.dateOfBirth`}
                    type="date"
                    value={person.dateOfBirth}
                    onChange={(event) => updatePerson(index, 'dateOfBirth', event.target.value)}
                    error={error('dateOfBirth')}
                    max={TODAY}
                    required
                    className="mb-0"
                  />
                </Col>
                <Col xs={12}>
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
          onClick={() => onChange([...value, newPerson()])}
          disabled={disabled || full}
        >
          <BiPlus />
          Thêm người ở cùng
        </Button>
        {full && (
          <span className="small text-secondary">Phòng đã đủ sức chứa ({capacity} người).</span>
        )}
      </div>
    </section>
  );
};

export default CoOccupantsInput;
