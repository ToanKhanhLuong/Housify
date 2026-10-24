// Trang xem toàn bộ component chung, chỉ có khi chạy dev (npm run dev). Đường dẫn: /ui-kit
// Dùng để xem giao diện và để AI IDE tham khảo cách dùng đúng. Không phải trang nghiệp vụ, dữ liệu là giả
import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { BiPlus } from 'react-icons/bi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import StatusSteps from '../components/StatusSteps';
import FieldRow from '../components/FieldRow';
import Pager from '../components/Pager';
import MoneyText from '../components/MoneyText';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Select from '../components/Select';
import ConfirmModal from '../components/ConfirmModal';
import ImageUpload from '../components/ImageUpload';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import { CONTRACT_STATUS } from '../constants/enums';
import { PHONE_REGEX } from '../constants/regex';
import {
    CONTRACT_STATUS_LABEL,
    INCIDENT_STATUS_LABEL,
    INVOICE_STATUS_LABEL,
    ROOM_STATUS_LABEL,
    USER_STATUS_LABEL,
    toOptions,
} from '../constants/statusLabels';
import { formatDate } from '../utils/format';

const ROOMS = [
    { _id: '1', code: 'P101', floor: 1, type: 'Phòng đơn', price: 2500000, status: 'OCCUPIED' },
    { _id: '2', code: 'P102', floor: 1, type: 'Phòng đơn', price: 2500000, status: 'AVAILABLE' },
    { _id: '3', code: 'P201', floor: 2, type: 'Studio', price: 4200000, status: 'OCCUPIED' },
    { _id: '4', code: 'P202', floor: 2, type: 'Phòng đôi', price: 3300000, status: 'MAINTENANCE' },
];

const OCCUPANTS = [
    { _id: '1', name: 'Nguyễn Minh Anh', cccd: '001203012345', phone: '0912345678', isRepresentative: true },
    { _id: '2', name: 'Trần Thu Hà', cccd: '001204056789', phone: '0987654321', isRepresentative: false },
];

const BADGE_GROUPS = [
    ['Phòng', ROOM_STATUS_LABEL],
    ['Hợp đồng', CONTRACT_STATUS_LABEL],
    ['Hóa đơn', INVOICE_STATUS_LABEL],
    ['Sự cố', INCIDENT_STATUS_LABEL],
    ['Tài khoản', USER_STATUS_LABEL],
];

const Section = ({ title, children }) => (
    <Card className="mb-4">
        <Card.Header className="fw-semibold">{title}</Card.Header>
        <Card.Body>{children}</Card.Body>
    </Card>
);

const Heading = ({ children }) => <h2 className="h6 fw-semibold text-secondary mt-2 mb-3">{children}</h2>;

const UiKitPage = () => {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [phone, setPhone] = useState('09123');
    const [showConfirm, setShowConfirm] = useState(false);

    const rooms = status ? ROOMS.filter((room) => room.status === status) : ROOMS;

    const roomColumns = [
        { key: 'code', title: 'Mã phòng', className: 'fw-semibold' },
        { key: 'floor', title: 'Tầng' },
        { key: 'type', title: 'Loại phòng' },
        { key: 'price', title: 'Giá thuê', align: 'end', render: (row) => <MoneyText value={row.price} /> },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (row) => <StatusBadge map={ROOM_STATUS_LABEL} value={row.status} />,
        },
    ];

    const occupantColumns = [
        { key: 'name', title: 'Họ tên', className: 'fw-medium' },
        { key: 'cccd', title: 'CCCD' },
        { key: 'phone', title: 'Số điện thoại' },
        { key: 'role', title: 'Vai trò', render: (row) => (row.isRepresentative ? 'Đại diện' : 'Ở cùng') },
        {
            key: 'actions',
            title: '',
            align: 'end',
            // bảng con trong trang chi tiết được có 1 nút ở cuối dòng (UC-33)
            render: (row) =>
                !row.isRepresentative && (
                    <Button variant="secondary" size="sm" onClick={() => setShowConfirm(true)}>
                        Xóa khỏi phòng
                    </Button>
                ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Bộ giao diện"
                subtitle="Chỉ có khi chạy dev. Mọi thứ dưới đây là component thật trong src/components"
                actions={
                    <Button variant="primary" className="flex items-center gap-1">
                        <BiPlus size={18} />
                        Nút chính
                    </Button>
                }
            >
                <Pager page={page} limit={20} total={57} onChange={setPage} />
            </PageHeader>

            <Row>
                <Col lg={6}>
                    <Section title="Nút: chỉ 4 kiểu, không dùng outline">
                        <div className="flex flex-wrap gap-2 mb-3">
                            <Button variant="primary">Lưu</Button>
                            <Button variant="secondary">Hủy</Button>
                            <Button variant="success">Duyệt</Button>
                            <Button variant="danger">Xóa</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="primary" disabled>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang lưu…
                            </Button>
                            <Button variant="secondary" disabled>
                                Không bấm được
                            </Button>
                            <Button variant="secondary" size="sm">
                                Nút nhỏ
                            </Button>
                        </div>
                    </Section>

                    <Section title="Trạng thái (StatusBadge)">
                        {BADGE_GROUPS.map(([name, map]) => (
                            <div key={name} className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="small text-secondary w-20">{name}</span>
                                {Object.keys(map).map((value) => (
                                    <StatusBadge key={value} map={map} value={value} />
                                ))}
                            </div>
                        ))}
                    </Section>

                    <Section title="Thông báo trên trang và toast">
                        <Alert variant="warning">Bạn chưa được cấp quyền quản lý tòa nhà</Alert>
                        <Alert variant="info">Thông tin thêm cho người dùng</Alert>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => toast.success('Tạo phòng thành công')}>
                                Thử toast thành công
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => toast.error('Mã phòng đã tồn tại trong tòa nhà')}
                            >
                                Thử toast lỗi
                            </Button>
                        </div>
                    </Section>
                </Col>

                <Col lg={6}>
                    <Section title="Ô nhập (Input, PasswordInput, Select)">
                        <Row>
                            <Col md={6}>
                                <Input label="Họ tên" name="name" placeholder="Nguyễn Văn A" required />
                            </Col>
                            <Col md={6}>
                                <Input
                                    label="Số điện thoại"
                                    name="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    error={PHONE_REGEX.test(phone) ? '' : 'Số điện thoại gồm 10 số, bắt đầu bằng 0'}
                                    required
                                />
                            </Col>
                            <Col md={6}>
                                <Input label="Email (chỉ xem)" name="email" value="manager@housify.vn" disabled readOnly />
                            </Col>
                            <Col md={6}>
                                <PasswordInput
                                    label="Mật khẩu"
                                    name="password"
                                    defaultValue="Housify123"
                                    helpText="Bấm con mắt để ẩn/hiện"
                                    required
                                />
                            </Col>
                            <Col md={6}>
                                <Select
                                    label="Trạng thái phòng (lọc bảng bên dưới)"
                                    name="status"
                                    options={toOptions(ROOM_STATUS_LABEL)}
                                    placeholder="Tất cả trạng thái"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                />
                            </Col>
                            <Col xs={12}>
                                <Input
                                    label="Lý do khóa tài khoản"
                                    name="reason"
                                    as="textarea"
                                    rows={2}
                                    helpText="Bắt buộc khi khóa (BR-029)"
                                    required
                                />
                            </Col>
                        </Row>
                    </Section>

                    <Row>
                        <Col md={6}>
                            <Section title="Ảnh (ImageUpload)">
                                <ImageUpload upload={false} onChange={(file) => toast.info(`Đã chọn ${file.name}`)} />
                            </Section>
                        </Col>
                        <Col md={6}>
                            <Section title="Trống và đang tải">
                                <EmptyState message="Không tìm thấy phòng phù hợp" />
                                <Loading />
                            </Section>
                        </Col>
                    </Row>
                </Col>
            </Row>

            <Heading>Trang danh sách: DataTable, bấm vào dòng để mở chi tiết</Heading>
            <div className="mb-4">
                <DataTable
                    columns={roomColumns}
                    data={rooms}
                    emptyMessage="Không tìm thấy phòng phù hợp"
                    onRowClick={(row) => toast.info(`Mở chi tiết phòng ${row.code}`)}
                />
            </div>

            <Heading>Trang chi tiết kiểu Odoo: PageHeader + StatusSteps + FieldRow + Tabs</Heading>
            <PageHeader
                actions={
                    <>
                        <Button variant="primary">Gia hạn</Button>
                        <Button variant="secondary">Chỉnh sửa</Button>
                        <Button variant="secondary">Tạo đơn chấm dứt</Button>
                    </>
                }
            >
                <StatusSteps
                    map={CONTRACT_STATUS_LABEL}
                    current={CONTRACT_STATUS.ACTIVE}
                    steps={[CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED]}
                />
            </PageHeader>
            <Card className="mb-4">
                <Card.Body className="p-4">
                    <div className="small text-secondary">Hợp đồng thuê phòng</div>
                    <h3 className="h3 fw-semibold mb-4">HĐ-P101-2026</h3>
                    <div className="grid lg:grid-cols-2 column-gap-5 mb-4">
                        <div>
                            <FieldRow label="Phòng" required>P101</FieldRow>
                            <FieldRow label="Người đại diện" required>Nguyễn Minh Anh</FieldRow>
                            <FieldRow label="Loại hợp đồng" required>Nhóm</FieldRow>
                        </div>
                        <div>
                            <FieldRow label="Ngày bắt đầu" required>{formatDate('2026-01-15')}</FieldRow>
                            <FieldRow label="Ngày kết thúc" required>{formatDate('2027-01-15')}</FieldRow>
                            <FieldRow label="Giá thuê" required>
                                <MoneyText value={3300000} />
                            </FieldRow>
                            <FieldRow label="Tiền cọc" required>
                                <MoneyText value={3300000} />
                            </FieldRow>
                        </div>
                    </div>
                    <Tabs defaultActiveKey="occupants" className="mb-3">
                        <Tab eventKey="occupants" title="Cư dân (2)">
                            <DataTable columns={occupantColumns} data={OCCUPANTS} />
                        </Tab>
                        <Tab eventKey="terminations" title="Đơn chấm dứt">
                            <EmptyState message="Chưa có đơn chấm dứt nào" />
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>

            <ConfirmModal
                show={showConfirm}
                title="Xóa khỏi phòng"
                message="Hợp đồng không thay đổi. Người đại diện vẫn giữ nguyên."
                confirmText="Xác nhận"
                variant="danger"
                onConfirm={() => {
                    setShowConfirm(false);
                    toast.success('Đã cập nhật danh sách cư dân');
                }}
                onCancel={() => setShowConfirm(false)}
            >
                <Input label="Ngày chuyển ra" name="exitDate" type="date" className="mb-0" required />
            </ConfirmModal>
        </>
    );
};

export default UiKitPage;