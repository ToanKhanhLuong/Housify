// Trang xem toàn bộ component chung, chỉ có khi chạy dev (npm run dev). Đường dẫn: /ui-kit
// Dùng để xem giao diện và để AI IDE tham khảo cách dùng đúng. Không phải trang nghiệp vụ, dữ liệu là giả
import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { BiPlus, BiTrash, BiLockAlt, BiUserCheck } from 'react-icons/bi';
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
import FilterSelect from '../components/FilterSelect';
import ConfirmModal from '../components/ConfirmModal';
import ImageUpload from '../components/ImageUpload';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import SkeletonRows from '../components/SkeletonRows';
import Loading from '../components/Loading';

// Các component mới theo mockup
import ControlBar from '../components/ControlBar';
import CardGrid from '../components/CardGrid';
import ItemCard from '../components/ItemCard';
import ModalForm from '../components/ModalForm';
import ActionDropdown from '../components/ActionDropdown';
import BlockedBox from '../components/BlockedBox';
import ImageGalleryPicker from '../components/ImageGalleryPicker';

import { CONTRACT_STATUS } from '../constants/enums';
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

const SAMPLE_BUILDINGS = [
    {
        _id: 'b1',
        name: 'Housify Cầu Giấy',
        address: '12 Trần Thái Tông, Cầu Giấy, Hà Nội',
        floors: 5,
        total: 4,
        available: 1,
        occupied: 2,
        maintenance: 1,
        manager: 'Trần Văn Tùng',
        image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
    },
    {
        _id: 'b2',
        name: 'Housify Đống Đa',
        address: '25 Tây Sơn, Đống Đa, Hà Nội',
        floors: 4,
        total: 0,
        available: 0,
        occupied: 0,
        maintenance: 0,
        manager: 'Lê Thị Hoa',
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80',
    },
    {
        _id: 'b3',
        name: 'Housify Thanh Xuân',
        address: '88 Nguyễn Trãi, Thanh Xuân, Hà Nội',
        floors: 3,
        total: 1,
        available: 1,
        occupied: 0,
        maintenance: 0,
        manager: null,
        image: '',
    },
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
        <Card.Header className="fw-semibold bg-white border-b border-[#e1e3e6]">{title}</Card.Header>
        <Card.Body>{children}</Card.Body>
    </Card>
);

const UiKitPage = () => {
    const [page, setPage] = useState(1);
    const [filterSelectVal, setFilterSelectVal] = useState('');
    const [passwordVal, setPasswordVal] = useState('123456');
    const [showConfirm, setShowConfirm] = useState(false);

    // State demo cho ControlBar & CardGrid
    const [cbSearch, setCbSearch] = useState('');
    const [cbFilters, setCbFilters] = useState({});
    const [cbGroup, setCbGroup] = useState('');
    const [cbView, setCbView] = useState('cards');

    // State demo ModalForm & Gallery
    const [showModalForm, setShowModalForm] = useState(false);
    const [galleryImages, setGalleryImages] = useState([
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80',
    ]);
    const [singleUploadUrl, setSingleUploadUrl] = useState('');

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
            render: (row) =>
                !row.isRepresentative && (
                    <Button variant="secondary" size="sm" onClick={() => setShowConfirm(true)}>
                        Xóa khỏi phòng
                    </Button>
                ),
        },
    ];

    // Cấu hình filter cho ControlBar demo
    const controlBarFilterGroups = [
        {
            id: 'hasManager',
            label: 'Manager phụ trách',
            type: 'radio',
            options: [
                { value: 'true', label: 'Đã có Manager' },
                { value: 'false', label: 'Chưa có Manager' },
            ],
        },
        {
            id: 'status',
            label: 'Trạng thái phòng',
            type: 'checkbox',
            options: [
                { value: 'AVAILABLE', label: 'Còn trống' },
                { value: 'OCCUPIED', label: 'Đang thuê' },
                { value: 'MAINTENANCE', label: 'Bảo trì' },
            ],
        },
        {
            id: 'price',
            label: 'Giá thuê',
            type: 'range',
            minField: 'minPrice',
            maxField: 'maxPrice',
        },
    ];

    const controlBarGroupByOptions = [
        { value: 'manager', label: 'Theo Manager phụ trách' },
        { value: 'floors', label: 'Theo số tầng' },
    ];

    return (
        <div className="flex flex-col gap-4">
            <PageHeader
                breadcrumbs={['Hệ thống', 'Bộ giao diện UI Kit']}
                actions={
                    <Button variant="primary" className="flex items-center gap-1" onClick={() => setShowModalForm(true)}>
                        <BiPlus size={18} />
                        Mở ModalForm mẫu
                    </Button>
                }
            >
                <ActionDropdown
                    title="Thao tác ▾"
                    items={[
                        { label: 'Phân công lại', icon: BiUserCheck, onClick: () => toast.info('Đã chọn Phân công') },
                        { label: 'Khóa tài khoản', icon: BiLockAlt, onClick: () => toast.warning('Đã chọn Khóa') },
                        { divider: true },
                        { label: 'Xóa mục này', icon: BiTrash, danger: true, onClick: () => toast.error('Đã chọn Xóa') },
                    ]}
                />
            </PageHeader>

            {/* PHẦN 1: COMPONENT MỚI THEO MOCKUP (ODDO STYLE) */}
            <Section title="1. Thanh điều khiển Odoo (ControlBar)">
                <p className="text-sm text-gray-600 mb-3">
                    Thanh điều khiển một hàng: Nút chính trái | Ô tìm kiếm đa năng ở giữa (search debounced 300ms, facet tags xóa bằng backspace/click x, dropdown bộ lọc 2 cột) | Đếm số lượng + Switch Thẻ/Bảng phải.
                </p>
                <div className="border border-[#e1e3e6] rounded mb-3 overflow-hidden">
                    <ControlBar
                        actions={
                            <Button variant="primary" size="sm" onClick={() => setShowModalForm(true)}>
                                Thêm tòa nhà
                            </Button>
                        }
                        searchValue={cbSearch}
                        onSearchChange={setCbSearch}
                        searchPlaceholder="Tìm theo tên hoặc địa chỉ..."
                        filterGroups={controlBarFilterGroups}
                        selectedFilters={cbFilters}
                        onFilterChange={setCbFilters}
                        groupByOptions={controlBarGroupByOptions}
                        selectedGroupBy={cbGroup}
                        onGroupByChange={setCbGroup}
                        count={SAMPLE_BUILDINGS.length}
                        view={cbView}
                        onViewChange={setCbView}
                    />
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <strong>State hiện tại:</strong> search = &quot;{cbSearch}&quot; | filters = {JSON.stringify(cbFilters)} | groupBy = &quot;{cbGroup}&quot; | view = &quot;{cbView}&quot;
                </div>
            </Section>

            <Section title="2. Lưới thẻ & Thẻ chi tiết (CardGrid & ItemCard)">
                <p className="text-sm text-gray-600 mb-3">
                    Thẻ bấm được cả khối, responsive, hover viền đổi sang màu tím mận (#714B67). Hỗ trợ ảnh, tiêu đề, badge số tầng, thống kê chấm màu, chân thẻ thông tin người phụ trách.
                </p>
                <CardGrid minWidth="300px">
                    {SAMPLE_BUILDINGS.map((b) => (
                        <ItemCard
                            key={b._id}
                            image={b.image}
                            title={b.name}
                            badge={<span className="hf-badge hf-b-gray">{b.floors} tầng</span>}
                            subtitle={b.address}
                            stats={
                                <>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="hf-dot hf-dot-ok" />
                                        <span>{b.available} trống</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="hf-dot hf-dot-plum" />
                                        <span>{b.occupied} đang thuê</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="hf-dot hf-dot-warn" />
                                        <span>{b.maintenance} bảo trì</span>
                                    </span>
                                    <span className="text-gray-400">· {b.total} phòng</span>
                                </>
                            }
                            footer={
                                b.manager ? (
                                    <div className="flex items-center gap-2">
                                        <span className="hf-av w-5 h-5 text-[10px]">
                                            {b.manager.split(' ').slice(-1)[0][0]}
                                        </span>
                                        <span className="font-medium text-gray-800">{b.manager}</span>
                                    </div>
                                ) : (
                                    <span className="hf-badge hf-b-warn">Chưa có Manager</span>
                                )
                            }
                            onClick={() => toast.info(`Đã bấm vào ${b.name}`)}
                        />
                    ))}
                </CardGrid>
            </Section>

            <Row>
                <Col lg={6}>
                    <Section title="3. Khung lý do bị chặn (BlockedBox)">
                        <p className="text-sm text-gray-600 mb-2">
                            Hiển thị khi một hành động xóa / khóa bị vi phạm quy tắc ràng buộc nghiệp vụ.
                        </p>
                        <BlockedBox
                            title="Không thể xóa tòa nhà &quot;Housify Cầu Giấy&quot;"
                            reasons={[
                                'Tòa nhà đang có 4 phòng thuộc quyền quản lý.',
                                'Đang có 2 hợp đồng thuê có hiệu lực trong tòa nhà.',
                                'Vui lòng thanh lý hết hợp đồng và xóa phòng trước khi xóa tòa.',
                            ]}
                            className="mb-3"
                        />
                        <BlockedBox
                            message="Tài khoản này đang phụ trách tòa nhà Housify Đống Đa. Vui lòng gỡ phân công trước khi khóa."
                        />
                    </Section>
                </Col>

                <Col lg={6}>
                    <Section title="4. Quản lý nhiều ảnh (ImageGalleryPicker)">
                        <p className="text-sm text-gray-600 mb-2">
                            Ảnh đại diện lớn phía trên, hàng thumbnail nhỏ bên dưới kèm nút xóa / đặt làm đại diện, nút &quot;+ Thêm ảnh&quot;.
                        </p>
                        <ImageGalleryPicker
                            images={galleryImages}
                            onChange={setGalleryImages}
                            label="Ảnh tòa nhà"
                            hint="Ảnh đầu tiên là ảnh đại diện của tòa. Mỗi ảnh tối đa 5MB."
                        />
                    </Section>
                </Col>
            </Row>

            {/* ModalForm demo */}
            <ModalForm
                show={showModalForm}
                onHide={() => setShowModalForm(false)}
                title="Thêm tòa nhà mới"
                onSubmit={() => {
                    toast.success('Đã gửi form mẫu!');
                    setShowModalForm(false);
                }}
                submitText="Lưu tòa nhà"
                onDelete={() => {
                    toast.error('Đã bấm Xóa!');
                    setShowModalForm(false);
                }}
                deleteText="Xóa nháp"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <Input
                            label="Tên tòa nhà"
                            required
                            placeholder="VD: Housify Cầu Giấy"
                            name="name"
                            defaultValue=""
                        />
                    </div>
                    <div className="col-span-2">
                        <Input
                            label="Địa chỉ"
                            required
                            placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                            name="address"
                            defaultValue=""
                        />
                    </div>
                    <div>
                        <Input
                            label="Số tầng"
                            required
                            type="number"
                            min="1"
                            name="floors"
                            defaultValue="5"
                            helpText="Tầng 1 đến N, sửa được sau trong chi tiết tòa."
                        />
                    </div>
                    <div>
                        <Select
                            label="Manager phụ trách"
                            name="managerId"
                            options={[
                                { value: 'm1', label: 'Trần Văn Tùng' },
                                { value: 'm2', label: 'Lê Thị Hoa' },
                            ]}
                            placeholder="-- Chưa phân công --"
                        />
                    </div>
                    <div className="col-span-2">
                        <Input
                            as="textarea"
                            rows={3}
                            label="Mô tả"
                            name="description"
                            placeholder="Gần trường học, có thang máy..."
                        />
                    </div>
                </div>
            </ModalForm>

            {/* PHẦN 2: CÁC COMPONENT NỀN TẢNG ĐÃ CÓ */}
            <Row>
                <Col lg={6}>
                    <Section title="5. Nút: chỉ 4 kiểu, không dùng outline">
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

                    <Section title="6. Trạng thái (StatusBadge & hf-badge)">
                        {BADGE_GROUPS.map(([name, map]) => (
                            <div key={name} className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="small text-secondary w-20">{name}</span>
                                {Object.keys(map).map((val) => (
                                    <StatusBadge key={val} map={map} value={val} />
                                ))}
                            </div>
                        ))}
                    </Section>

                    <Section title="7. Thanh trạng thái mũi tên Odoo (StatusSteps)">
                        <div className="flex flex-col gap-3">
                            <div>
                                <div className="small text-secondary mb-1">Hợp đồng: Nháp › Đang hiệu lực › Đã kết thúc</div>
                                <StatusSteps
                                    map={CONTRACT_STATUS_LABEL}
                                    current={CONTRACT_STATUS.ACTIVE}
                                    steps={[CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED]}
                                />
                            </div>
                            <div>
                                <div className="small text-secondary mb-1">Trạng thái ngoài luồng (Đã hủy) tự thêm vào cuối:</div>
                                <StatusSteps
                                    map={CONTRACT_STATUS_LABEL}
                                    current={CONTRACT_STATUS.CANCELLED}
                                    steps={[CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED]}
                                />
                            </div>
                        </div>
                    </Section>
                </Col>

                <Col lg={6}>
                    <Section title="8. Dòng nhãn - giá trị (FieldRow)">
                        <div className="hf-paper p-3">
                            <FieldRow label="Tòa nhà" required>Housify Cầu Giấy</FieldRow>
                            <FieldRow label="Địa chỉ">12 Trần Thái Tông, Cầu Giấy, Hà Nội</FieldRow>
                            <FieldRow label="Số phòng">15 phòng (3 phòng trống)</FieldRow>
                            <FieldRow label="Ngày tạo">{formatDate('2026-09-01')}</FieldRow>
                            <FieldRow label="Ghi chú">{null}</FieldRow>
                        </div>
                    </Section>

                    <Section title="9. Bảng dữ liệu (DataTable) & Phân trang (Pager)">
                        <DataTable
                            columns={roomColumns}
                            data={ROOMS}
                            onRowClick={(row) => toast.info(`Bấm vào phòng ${row.code}`)}
                        />
                        <div className="pt-3">
                            <Pager page={page} limit={10} total={35} onChange={setPage} />
                        </div>
                    </Section>
                </Col>
            </Row>

            {/* PHẦN 3: FORM, INPUT, TABS, VÀ CÁC TRẠNG THÁI TẢI */}
            <Section title="10. Form nhập liệu & Bộ lọc đơn giản (Input, Select, FilterSelect, ImageUpload)">
                <Row>
                    <Col md={6}>
                        <Input label="Họ tên" required defaultValue="Nguyễn Văn A" name="demoName" />
                        <PasswordInput label="Mật khẩu" value={passwordVal} onChange={(e) => setPasswordVal(e.target.value)} />
                        <Select
                            label="Trạng thái hợp đồng"
                            name="contractStatus"
                            options={toOptions(CONTRACT_STATUS_LABEL)}
                        />
                    </Col>
                    <Col md={6}>
                        <FilterSelect
                            label="Bộ lọc nhanh"
                            value={filterSelectVal}
                            onChange={(e) => setFilterSelectVal(e.target.value)}
                            options={[
                                { value: 'active', label: 'Đang hoạt động' },
                                { value: 'pending', label: 'Chờ kích hoạt' },
                            ]}
                            className="mb-3 w-full"
                        />
                        <ImageUpload
                            label="Ảnh đơn (ImageUpload)"
                            value={singleUploadUrl}
                            onChange={setSingleUploadUrl}
                            kind="PUBLIC"
                        />
                    </Col>
                </Row>
            </Section>

            <Section title="11. Tab và Trạng thái tải / Lỗi (Tabs, Loading, SkeletonRows, EmptyState, ErrorState)">
                <Tabs defaultActiveKey="loading" className="mb-3">
                    <Tab eventKey="loading" title="Đang tải">
                        <div className="p-3 border rounded">
                            <div className="mb-2 font-semibold text-gray-700">Loading spinner:</div>
                            <Loading />
                            <div className="mt-4 mb-2 font-semibold text-gray-700">SkeletonRows:</div>
                            <SkeletonRows rows={3} columns={4} />
                        </div>
                    </Tab>
                    <Tab eventKey="empty" title="Không có dữ liệu (EmptyState)">
                        <div className="p-3 border rounded">
                            <EmptyState message="Không tìm thấy bản ghi nào" />
                        </div>
                    </Tab>
                    <Tab eventKey="error" title="Lỗi tải (ErrorState)">
                        <div className="p-3 border rounded">
                            <ErrorState
                                message="Không thể tải danh sách hợp đồng"
                                detail="Network Error: Cannot connect to server"
                                onRetry={() => toast.info('Đang thử lại...')}
                            />
                        </div>
                    </Tab>
                    <Tab eventKey="occupants" title="Bảng cư dân mẫu">
                        <DataTable columns={occupantColumns} data={OCCUPANTS} />
                    </Tab>
                    <Tab eventKey="alert" title="Thông báo mẫu">
                        <Alert variant="warning" className="mb-2">Đây là cảnh báo mẫu từ Alert</Alert>
                        <Alert variant="info" className="mb-0">Đây là thông tin mẫu từ Alert</Alert>
                    </Tab>
                </Tabs>
            </Section>

            <ConfirmModal
                show={showConfirm}
                title="Xác nhận"
                message="Bạn có chắc muốn thực hiện thao tác này?"
                onConfirm={() => {
                    toast.success('Đã xác nhận');
                    setShowConfirm(false);
                }}
                onCancel={() => setShowConfirm(false)}
            />
        </div>
    );
};

export default UiKitPage;
