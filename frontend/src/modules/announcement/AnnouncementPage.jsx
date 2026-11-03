// UC-40 (Manager, /announcements): gửi thông báo chung cho khách trong tòa mình
// Form: tiêu đề, nội dung (bắt buộc), đối tượng nhận = Tất cả / Chọn phòng (chỉ phòng Đang thuê). Mẫu nhanh theo nội dung
// thường gặp (bảo trì, nội quy, nhắc nhở, thông tin chung). Bên phải: xem trước thông báo như trong chuông + số phòng nhận
// Bấm Gửi → popup xác nhận → POST /announcements → báo "Đã gửi thành công đến X tài khoản" (BE trả). Không lưu lịch sử
// ở FE: mỗi khách nhận 1 bản ghi thông báo, xem qua chuông (UC-41)
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { BiBroadcast, BiSend } from 'react-icons/bi';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';
import Input from '../../components/Input';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROOM_STATUS } from '../../constants/enums';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import announcementApi from './announcement.api';
import { validateAnnouncement } from './announcement.validate';
import RoomPicker from './components/RoomPicker';

// mẫu nhanh: bấm để điền sẵn, Manager sửa lại cho đúng
const TEMPLATES = [
  {
    label: 'Lịch bảo trì',
    title: 'Thông báo lịch bảo trì',
    message: 'Tòa nhà sẽ bảo trì [hạng mục] vào [thời gian]. Trong thời gian này [ảnh hưởng]. Mong các bạn thông cảm.',
  },
  {
    label: 'Thay đổi nội quy',
    title: 'Cập nhật nội quy tòa nhà',
    message: 'Từ ngày [ngày], nội quy tòa nhà có thay đổi: [nội dung]. Các bạn xem chi tiết ở mục Nội quy.',
  },
  {
    label: 'Nhắc nhở',
    title: 'Nhắc nhở',
    message: 'Ban quản lý nhắc các bạn [nội dung nhắc nhở]. Cảm ơn các bạn đã hợp tác.',
  },
  { label: 'Thông tin chung', title: '', message: '' },
];

const EMPTY_FORM = { title: '', message: '', target: 'ALL', roomIds: [] };

const AnnouncementPage = () => {
  const { user } = useAuth();
  const buildingId = user.building?._id;

  // phòng đang thuê của tòa: null = đang tải
  const [rooms, setRooms] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { message, warning } của lần gửi vừa xong

  useEffect(() => {
    if (!buildingId) return;
    announcementApi
      .rooms(buildingId)
      .then((response) =>
        setRooms(
          (Array.isArray(response.data) ? response.data : []).filter(
            (room) => room.status === ROOM_STATUS.OCCUPIED,
          ),
        ),
      )
      .catch(() => setRooms([]));
  }, [buildingId]);

  const update = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])) }));
  };

  const recipientRooms = form.target === 'ALL' ? (rooms?.length ?? 0) : form.roomIds.length;

  const handleSubmit = (event) => {
    event.preventDefault();
    const clientErrors = validateAnnouncement(form);
    setErrors(clientErrors);
    if (!hasErrors(clientErrors)) setConfirming(true);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const response = await announcementApi.send({
        title: form.title.trim(),
        message: form.message.trim(),
        target: form.target === 'ALL' ? 'ALL' : form.roomIds,
      });
      const warning = response.data?.warning;
      setResult({ message: response.message || 'Đã gửi thông báo', warning });
      if (warning) toast.warning(warning);
      else toast.success(response.message || 'Đã gửi thông báo');
      setForm(EMPTY_FORM);
      setConfirming(false);
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd "Không có tài khoản Customer nào để gửi thông báo"
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
      <Form onSubmit={handleSubmit} noValidate>
        <Card className="hf-paper">
          <div className="flex flex-col gap-1">
            <span className="small text-secondary">Thông báo chung · {user.building?.name ?? 'Tòa của tôi'}</span>
            <h1 className="h4 fw-bold mb-0">Gửi thông báo cho khách</h1>
            <span className="small text-secondary">
              Người đại diện của các phòng đang thuê nhận thông báo trong chuông và qua email.
            </span>
          </div>

          {result && (
            <Alert
              variant={result.warning ? 'warning' : 'success'}
              dismissible
              onClose={() => setResult(null)}
              className="mb-0"
            >
              {result.message}
              {result.warning && <div className="small mt-1">{result.warning}</div>}
            </Alert>
          )}

          {/* mẫu nhanh */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="small text-secondary">Mẫu nhanh:</span>
            {TEMPLATES.map((template) => (
              <Button
                key={template.label}
                variant="secondary"
                size="sm"
                disabled={sending}
                onClick={() => update({ title: template.title, message: template.message })}
              >
                {template.label}
              </Button>
            ))}
          </div>

          <Input
            label="Tiêu đề"
            name="title"
            value={form.title}
            onChange={(event) => update({ title: event.target.value })}
            error={errors.title}
            placeholder="Vd: Thông báo lịch bảo trì thang máy"
            disabled={sending}
            className="mb-0"
            required
          />
          <Input
            label="Nội dung"
            name="message"
            as="textarea"
            rows={6}
            value={form.message}
            onChange={(event) => update({ message: event.target.value })}
            error={errors.message}
            placeholder="Nội dung thông báo gửi tới khách"
            disabled={sending}
            className="mb-0"
            required
          />

          {/* đối tượng nhận */}
          <section className="flex flex-col gap-2">
            <span className="fw-semibold">
              Gửi tới <span className="text-danger">*</span>
            </span>
            <div className="flex flex-wrap gap-4">
              <Form.Check
                type="radio"
                id="target-all"
                name="target"
                label="Tất cả khách trong tòa"
                checked={form.target === 'ALL'}
                onChange={() => update({ target: 'ALL' })}
                disabled={sending}
              />
              <Form.Check
                type="radio"
                id="target-rooms"
                name="target"
                label="Chọn phòng cụ thể"
                checked={form.target === 'ROOMS'}
                onChange={() => update({ target: 'ROOMS' })}
                disabled={sending}
              />
            </div>
            {form.target === 'ROOMS' &&
              (rooms === null ? (
                <SkeletonRows rows={2} columns={4} />
              ) : rooms.length === 0 ? (
                <div className="hf-ph h-20">Tòa chưa có phòng nào đang thuê</div>
              ) : (
                <RoomPicker
                  rooms={rooms}
                  selected={form.roomIds}
                  onChange={(roomIds) => update({ roomIds })}
                  disabled={sending}
                />
              ))}
            {errors.roomIds && <div className="invalid-feedback d-block">{errors.roomIds}</div>}
            {errors.target && <div className="invalid-feedback d-block">{errors.target}</div>}
          </section>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" className="flex items-center gap-2" disabled={sending}>
              {sending ? <Spinner animation="border" size="sm" /> : <BiSend />}
              Gửi thông báo
            </Button>
            <Button variant="secondary" disabled={sending} onClick={() => update(EMPTY_FORM)}>
              Xóa nội dung
            </Button>
          </div>
        </Card>
      </Form>

      {/* xem trước như trong chuông của khách */}
      <div className="flex flex-col gap-3">
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <h2 className="h6 fw-bold mb-0">Khách sẽ thấy như sau</h2>
            <div className="flex items-start gap-3 rounded border px-3 py-3 bg-body-tertiary">
              <span className="hf-av w-10 h-10">
                <BiBroadcast size={20} />
              </span>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="fw-semibold break-words">{form.title.trim() || 'Tiêu đề thông báo'}</span>
                  <span className="hf-badge hf-b-gray">Thông báo chung</span>
                </span>
                <span className="small text-secondary whitespace-pre-line break-words">
                  {form.message.trim() || 'Nội dung thông báo hiện ở đây.'}
                </span>
                <span className="small text-secondary">Vừa xong</span>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="flex flex-col gap-1">
            <h2 className="h6 fw-bold mb-1">Người nhận</h2>
            <span className="fs-4 fw-bold">{rooms === null ? '…' : recipientRooms} phòng</span>
            <span className="small text-secondary">
              Mỗi phòng gửi tới người đại diện (có tài khoản). Người ở cùng không có tài khoản nên không nhận.
              Phòng không có khách đang hoạt động sẽ không nhận được.
            </span>
          </Card.Body>
        </Card>
      </div>

      {confirming && (
        <ConfirmModal
          show
          title="Gửi thông báo?"
          message={`Gửi "${form.title.trim()}" tới ${form.target === 'ALL' ? 'tất cả khách trong tòa' : `${form.roomIds.length} phòng đã chọn`}. Thông báo đã gửi không sửa hay xóa được.`}
          confirmText="Gửi"
          cancelText="Xem lại"
          loading={sending}
          onConfirm={handleSend}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
};

export default AnnouncementPage;
