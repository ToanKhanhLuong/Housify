// UC-21: Quản lý danh mục dịch vụ (Admin) – giao diện thẻ trực quan phân loại dịch vụ
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
    BiBoltCircle,
    BiCar,
    BiCube,
    BiDroplet,
    BiPencil,
    BiPlus,
    BiReceipt,
    BiReset,
    BiShield,
    BiTachometer,
    BiTrash,
    BiWifi,
} from 'react-icons/bi';
import { toast } from 'react-toastify';
import ControlBar from '../../components/ControlBar';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Pager from '../../components/Pager';
import SkeletonRows from '../../components/SkeletonRows';
import { useSavedState } from '../../utils/filter';
import serviceApi from './service.api';
import ServiceFormModal from './components/ServiceFormModal';

const MODE = { METERED: 'metered', FIXED: 'fixed' };
const modeOf = (service) => (service.isFixed ? MODE.FIXED : MODE.METERED);

// Tiện ích hiển thị nhận diện trực quan cho dịch vụ (icon, màu sắc pastel, nhãn phân loại)
const getServiceVisual = (name = '', isFixed = false) => {
    const lower = (name || '').toLowerCase();

    if (lower.includes('điện') || lower.includes('dien')) {
        return {
            icon: BiBoltCircle,
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-600',
            label: 'Điện sinh hoạt',
            hint: 'Ghi chỉ số công tơ điện khi chốt hóa đơn',
        };
    }
    if (lower.includes('nước') || lower.includes('nuoc')) {
        return {
            icon: BiDroplet,
            bg: 'bg-sky-50',
            border: 'border-sky-200',
            text: 'text-sky-600',
            label: 'Nước sinh hoạt',
            hint: 'Ghi chỉ số đồng hồ nước khi chốt hóa đơn',
        };
    }
    if (lower.includes('wifi') || lower.includes('mạng') || lower.includes('internet')) {
        return {
            icon: BiWifi,
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            text: 'text-indigo-600',
            label: 'Mạng Internet',
            hint: 'Mức phí internet trọn gói theo phòng hoặc người',
        };
    }
    if (lower.includes('xe') || lower.includes('đỗ xe') || lower.includes('gui xe')) {
        return {
            icon: BiCar,
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-600',
            label: 'Trông giữ xe',
            hint: 'Tính theo số lượng xe đăng ký thực tế',
        };
    }
    if (lower.includes('rác') || lower.includes('vệ sinh') || lower.includes('ve sinh')) {
        return {
            icon: BiTrash,
            bg: 'bg-teal-50',
            border: 'border-teal-200',
            text: 'text-teal-600',
            label: 'Vệ sinh môi trường',
            hint: 'Phí thu gom rác và vệ sinh khu vực chung',
        };
    }
    if (lower.includes('an ninh') || lower.includes('bảo vệ')) {
        return {
            icon: BiShield,
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-600',
            label: 'An ninh & Bảo vệ',
            hint: 'Phí dịch vụ bảo vệ và an ninh tòa nhà',
        };
    }

    if (!isFixed) {
        return {
            icon: BiTachometer,
            bg: 'bg-cyan-50',
            border: 'border-cyan-200',
            text: 'text-cyan-600',
            label: 'Theo chỉ số',
            hint: 'Hóa đơn ghi nhận chỉ số cũ và mới',
        };
    }

    return {
        icon: BiCube,
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        label: 'Dịch vụ cố định',
        hint: 'Hóa đơn tính theo số lượng × đơn giá',
    };
};

const MODE_CONFIG = {
    [MODE.METERED]: {
        label: 'Theo chỉ số',
        badgeBg: 'bg-amber-50',
        badgeBorder: 'border-amber-200',
        badgeText: 'text-amber-700',
        dotBg: 'bg-amber-500',
        icon: BiTachometer,
        title: 'Dịch vụ theo chỉ số',
        hint: 'Ghi chỉ số đầu kỳ & cuối kỳ khi chốt hóa đơn (Điện, Nước...)',
    },
    [MODE.FIXED]: {
        label: 'Cố định',
        badgeBg: 'bg-indigo-50',
        badgeBorder: 'border-indigo-200',
        badgeText: 'text-indigo-700',
        dotBg: 'bg-indigo-500',
        icon: BiReceipt,
        title: 'Dịch vụ cố định',
        hint: 'Hóa đơn tính theo số lượng hoặc mức phí trọn gói hàng tháng (Wifi, Rác, Gửi xe...)',
    },
};

const FILTER_GROUPS = [
    {
        id: 'mode',
        label: 'Cách tính',
        type: 'checkbox',
        options: [
            { value: MODE.METERED, label: 'Theo chỉ số' },
            { value: MODE.FIXED, label: 'Cố định' },
        ],
    },
];

const GROUP_BY_OPTIONS = [{ value: 'mode', label: 'Cách tính' }];
const PAGE_SIZE = 8;

const ServiceListPage = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [query, setQuery] = useSavedState('services:query', '');
    const [filters, setFilters] = useSavedState('services:filters', { mode: [] });
    const [groupBy, setGroupBy] = useSavedState('services:groupBy', 'mode');
    const [page, setPage] = useSavedState('services:page', 1);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const loadServices = useCallback(
        () =>
            serviceApi
                .list()
                .then((response) => {
                    setServices(Array.isArray(response.data) ? response.data : []);
                    setLoadError('');
                })
                .catch((error) => setLoadError(error.message))
                .finally(() => setLoading(false)),
        [],
    );

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    const handleRetry = () => {
        setLoading(true);
        loadServices();
    };

    const handleResetFilters = () => {
        setQuery('');
        setFilters({ mode: [] });
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await serviceApi.remove(deleting._id);
            toast.success('Xóa dịch vụ thành công');
            setDeleting(null);
            loadServices();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Lọc ở Frontend: từ khóa tên dịch vụ & cách tính (Cố định / Theo chỉ số)
    const keyword = query.trim().toLowerCase();
    const shown = useMemo(() => {
        return services.filter((service) => {
            const matchesKeyword = !keyword || service.name.toLowerCase().includes(keyword);
            const matchesMode =
                filters.mode.length === 0 ||
                filters.mode.length === 2 ||
                filters.mode.includes(modeOf(service));
            return matchesKeyword && matchesMode;
        });
    }, [services, keyword, filters.mode]);

    const isFiltering = Boolean(keyword || filters.mode.length > 0);

    // Thống kê tổng quan trên thanh Header
    const meteredCount = useMemo(
        () => services.filter((s) => !s.isFixed).length,
        [services],
    );
    const fixedCount = useMemo(
        () => services.filter((s) => s.isFixed).length,
        [services],
    );

    // Phân trang khi hiển thị dạng phẳng (không nhóm)
    const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    const pagedServices = useMemo(() => {
        if (groupBy) return shown;
        const start = (page - 1) * PAGE_SIZE;
        return shown.slice(start, start + PAGE_SIZE);
    }, [shown, groupBy, page]);

    const renderServiceCard = (service) => {
        const visual = getServiceVisual(service.name, service.isFixed);
        const Icon = visual.icon;
        const mode = modeOf(service);
        const cfg = MODE_CONFIG[mode];

        return (
            <div
                key={service._id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-200 p-4 flex flex-col justify-between cursor-pointer group"
                onClick={() => setEditing(service)}
            >
                <div>
                    {/* Header thẻ: Icon tiện ích + Tên dịch vụ + Nút sửa tinh gọn */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-11 h-11 rounded-2xl ${visual.bg} ${visual.text} border ${visual.border} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                            >
                                <Icon className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-gray-900 group-hover:text-purple-900 transition-colors leading-tight mb-0.5">
                                    {service.name}
                                </h3>
                                <span className="text-xs text-gray-500 font-normal">
                                    {visual.label}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="secondary"
                            className="hf-btn-ghost p-1 text-secondary"
                            title="Chỉnh sửa dịch vụ"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditing(service);
                            }}
                        >
                            <BiPencil />
                        </Button>
                    </div>

                    {/* Huy hiệu cách tính & đơn vị tính */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotBg}`} />
                            {cfg.label}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium">
                            Đơn vị: {service.unit}
                        </span>
                    </div>

                    {/* Gợi ý nghiệp vụ */}
                    <p className="text-xs text-gray-500 mb-0 line-clamp-2 leading-relaxed">
                        {visual.hint}
                    </p>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <Card className="border-0 shadow-xs">
                    <Card.Body className="p-4">
                        <SkeletonRows rows={4} columns={3} />
                    </Card.Body>
                </Card>
            );
        }

        if (loadError) {
            return (
                <ErrorState
                    message="Không tải được danh sách dịch vụ"
                    detail={loadError}
                    onRetry={handleRetry}
                />
            );
        }

        if (shown.length === 0) {
            return (
                <Card className="border-0 shadow-xs">
                    <Card.Body className="p-4">
                        {isFiltering ? (
                            <EmptyState message="Không có dịch vụ nào phù hợp với bộ lọc.">
                                <Button
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                    onClick={handleResetFilters}
                                >
                                    <BiReset />
                                    Xóa bộ lọc
                                </Button>
                            </EmptyState>
                        ) : (
                            <EmptyState message="Chưa có dịch vụ nào. Bấm Thêm dịch vụ để bắt đầu.">
                                <Button variant="primary" onClick={() => setEditing({})}>
                                    <BiPlus className="me-1" /> Thêm dịch vụ
                                </Button>
                            </EmptyState>
                        )}
                    </Card.Body>
                </Card>
            );
        }

        // Chế độ hiển thị thẻ không nhóm
        if (!groupBy) {
            return (
                <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pagedServices.map(renderServiceCard)}
                    </div>
                    {totalPages > 1 && (
                        <div className="mt-4 flex justify-end">
                            <Pager current={page} total={totalPages} onPageChange={setPage} />
                        </div>
                    )}
                </>
            );
        }

        // Chế độ hiển thị thẻ nhóm theo cách tính
        return [MODE.METERED, MODE.FIXED].map((mode) => {
            const items = shown.filter((service) => modeOf(service) === mode);
            if (items.length === 0) return null;
            const cfg = MODE_CONFIG[mode];
            const ModeIcon = cfg.icon;

            return (
                <section key={mode} className="mb-6">
                    <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-gray-200/80">
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-7 h-7 rounded-lg ${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder} flex items-center justify-center`}
                            >
                                <ModeIcon className="text-base" />
                            </div>
                            <h2 className="text-base font-bold text-gray-900 m-0">
                                {cfg.title}
                            </h2>
                            <Badge pill bg="secondary-subtle" text="secondary-emphasis">
                                {items.length}
                            </Badge>
                        </div>
                        <span className="text-xs text-gray-500 hidden sm:inline">{cfg.hint}</span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {items.map(renderServiceCard)}
                    </div>
                </section>
            );
        });
    };

    return (
        <div className="space-y-4">
            {/* Header tổng quan tiện ích dịch vụ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 shadow-xs flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                        <BiCube className="text-2xl" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Tổng dịch vụ</div>
                        <div className="text-xl font-bold text-gray-900 leading-tight">
                            {loading ? '...' : services.length}
                        </div>
                        <div className="text-[11px] text-gray-400">Danh mục tiện ích</div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 shadow-xs flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                        <BiTachometer className="text-2xl" />
                    </div>
                    <div>
                        <div className="text-xs text-amber-700 font-medium">Theo chỉ số</div>
                        <div className="text-xl font-bold text-gray-900 leading-tight">
                            {loading ? '...' : meteredCount}
                        </div>
                        <div className="text-[11px] text-gray-400">Điện, Nước sinh hoạt</div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 shadow-xs flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                        <BiReceipt className="text-2xl" />
                    </div>
                    <div>
                        <div className="text-xs text-indigo-700 font-medium">Cố định hàng tháng</div>
                        <div className="text-xl font-bold text-gray-900 leading-tight">
                            {loading ? '...' : fixedCount}
                        </div>
                        <div className="text-[11px] text-gray-400">Wifi, Gửi xe, Vệ sinh...</div>
                    </div>
                </div>
            </div>

            {/* Thanh điều khiển ControlBar */}
            <Card className="border-0 shadow-xs">
                <ControlBar
                    actions={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="primary"
                                className="flex items-center gap-1.5"
                                onClick={() => setEditing({})}
                            >
                                <BiPlus className="text-lg" />
                                Thêm dịch vụ
                            </Button>
                            <Button
                                variant="secondary"
                                className="flex items-center gap-1.5"
                                onClick={() => navigate('/services/prices')}
                            >
                                <BiReceipt className="text-base" />
                                Bảng giá theo tòa
                            </Button>
                        </div>
                    }
                    searchValue={query}
                    onSearchChange={(val) => {
                        setQuery(val);
                        setPage(1);
                    }}
                    searchPlaceholder="Tìm tên dịch vụ..."
                    filterGroups={FILTER_GROUPS}
                    selectedFilters={filters}
                    onFilterChange={(next) => {
                        setFilters({ mode: next.mode ?? [] });
                        setPage(1);
                    }}
                    groupByOptions={GROUP_BY_OPTIONS}
                    selectedGroupBy={groupBy}
                    onGroupByChange={(val) => {
                        setGroupBy(val);
                        setPage(1);
                    }}
                    count={loading || loadError ? null : `${shown.length} dịch vụ`}
                />
            </Card>

            {renderContent()}

            {editing && (
                <ServiceFormModal
                    service={editing}
                    onHide={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        loadServices();
                    }}
                    onDelete={() => {
                        setDeleting(editing);
                        setEditing(null);
                    }}
                />
            )}

            <ConfirmModal
                show={Boolean(deleting)}
                title="Xóa dịch vụ"
                message={`Bạn chắc chắn muốn xóa dịch vụ "${deleting?.name}"? Dịch vụ sẽ không còn trên hóa đơn mới, hóa đơn đã lập vẫn giữ nguyên.`}
                confirmText="Xóa"
                variant="danger"
                loading={submitting}
                onConfirm={handleDelete}
                onCancel={() => setDeleting(null)}
            />
        </div>
    );
};

export default ServiceListPage;
