// Các ô nhập hồ sơ cư dân dùng chung cho popup Thêm (UC-32) và Sửa (UC-31): họ tên, CCCD, SĐT, ngày sinh, địa chỉ,
// quan hệ với người đại diện (ẩn khi sửa chính người đại diện) và ảnh CCCD 2 mặt (tải lên ngay, form giữ publicId)
import { Card, Col, Row } from 'react-bootstrap';
import ImageUpload from '../../../components/ImageUpload';
import Input from '../../../components/Input';
import { todayInput } from '../occupant.validate';

const OccupantFields = ({
  form,
  errors,
  onChange,
  onImage,
  previews = {},
  showRelationship = true,
  disabled = false,
}) => (
  <>
    <Row>
      <Col md={6}>
        <Input
          label="Họ tên"
          name="name"
          value={form.name}
          onChange={onChange}
          error={errors.name}
          maxLength={100}
          disabled={disabled}
          required
        />
      </Col>
      <Col md={6}>
        <Input
          label="Số CCCD"
          name="cccd"
          value={form.cccd}
          onChange={onChange}
          error={errors.cccd}
          inputMode="numeric"
          maxLength={12}
          helpText="Đúng 12 chữ số"
          disabled={disabled}
          required
        />
      </Col>
      <Col md={6}>
        <Input
          label="Số điện thoại"
          name="phone"
          value={form.phone}
          onChange={onChange}
          error={errors.phone}
          inputMode="numeric"
          maxLength={10}
          disabled={disabled}
          required
        />
      </Col>
      <Col md={6}>
        <Input
          label="Ngày sinh"
          name="dateOfBirth"
          type="date"
          max={todayInput()}
          value={form.dateOfBirth}
          onChange={onChange}
          error={errors.dateOfBirth}
          disabled={disabled}
          required
        />
      </Col>
      {showRelationship && (
        <Col md={6}>
          <Input
            label="Quan hệ với người đại diện"
            name="relationship"
            value={form.relationship}
            onChange={onChange}
            error={errors.relationship}
            placeholder="Vd: Bạn, Anh trai"
            maxLength={50}
            disabled={disabled}
          />
        </Col>
      )}
      <Col md={showRelationship ? 6 : 12}>
        <Input
          label="Địa chỉ thường trú"
          name="address"
          value={form.address}
          onChange={onChange}
          error={errors.address}
          maxLength={255}
          disabled={disabled}
        />
      </Col>
    </Row>

    <div className="flex items-center justify-between gap-3 mt-1 mb-2">
      <h3 className="h6 fw-semibold mb-0">Ảnh CCCD</h3>
      <span className="small text-secondary">Không bắt buộc · JPG, PNG · tối đa 5 MB / ảnh</span>
    </div>
    <Row className="g-3">
      <Col md={6}>
        <Card>
          <Card.Body className="p-3">
            <div className="small fw-semibold mb-2">Mặt trước</div>
            <ImageUpload
              kind="CCCD"
              previewUrl={previews.front}
              onChange={onImage('cccdFrontImage')}
              disabled={disabled}
            />
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card>
          <Card.Body className="p-3">
            <div className="small fw-semibold mb-2">Mặt sau</div>
            <ImageUpload
              kind="CCCD"
              previewUrl={previews.back}
              onChange={onImage('cccdBackImage')}
              disabled={disabled}
            />
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </>
);

export default OccupantFields;
