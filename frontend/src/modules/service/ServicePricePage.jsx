// UC-22: Thiết lập giá dịch vụ theo tòa (Admin) – cấu hình đơn giá và ngày áp dụng cho từng tòa nhà
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import {
    BiBoltCircle,
    BiBuildings,
    BiCar,
    BiCheckCircle,
    BiChevronRight,
    BiCube,
    BiDroplet,
    BiErrorCircle,
    BiShield,
    BiTachometer,
    BiTrash,
    BiWifi,
} from 'react-icons/bi';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FilterSelect from '../../components/FilterSelect';
import MoneyText from '../../components/MoneyText';
import SkeletonRows from '../../components/SkeletonRows';
import { formatDate } from '../../utils/format';
import serviceApi from './service.api';
import { getCurrentPrice } from './servicePrice.utils';
import ServicePriceModal from './components/ServicePriceModal';

// Tiện ích hiển thị nhận diện trực quan cho dịch vụ trong bảng giá
const getServiceVisual = (name = '', isFixed = false) => {
    const lower = (name || '').toLowerCase();

    if (lower.includes('điện') || lower.includes('dien')) {
        return {
            icon: BiBoltCircle,
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-600',
            label: 'Điện sinh hoạt',
        };
    }
    if (lower.includes('nước') || lower.includes('nuoc')) {
        return {
            icon: BiDroplet,
            bg: 'bg-sky-50',
            border: 'border-sky-200',
            text: 'text-sky-600',
            label: 'Nước sinh hoạt',
        };
    }
    if (lower.includes('wifi') || lower.includes('mạng') || lower.includes('internet')) {
        return {
            icon: BiWifi,
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            text: 'text-indigo-600',
            label: 'Mạng Internet',
        };
    }
    if (lower.includes('xe') || lower.includes('đỗ xe') || lower.includes('gui xe')) {
        return {
            icon: BiCar,
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-600',
            label: 'Trông giữ xe',
        };
    }
    if (lower.includes('rác') || lower.includes('vệ sinh') || lower.includes('ve sinh')) {
        return {
            icon: BiTrash,
            bg: 'bg-teal-50',
            border: 'border-teal-200',
            text: 'text-teal-600',
            label: 'Vệ sinh môi trường',
        };
    }
    if (lower.includes('an ninh') || lower.includes('bảo vệ')) {
        return {
            icon: BiShield,
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-600',
            label: 'An ninh & Bảo vệ',
        };
    }

    if (!isFixed) {
        return {
            icon: BiTachometer,
            bg: 'bg-cyan-50',
            border: 'border-cyan-200',
            text: 'text-cyan-600',
            label: 'Theo chỉ số',
        };
    }

    return {
        icon: BiCube,
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        label: 'Dịch vụ cố định',
    };
};

const ServicePricePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const buildingId = searchParams.get('buildingId') ?? '';
    const [buildings, setBuildings] = useState([]);
    const [services, setServices] = useState(null);
    const [prices, setPrices] = useState(null);
    const [editing, setEditing] = useState(null);
    const [loadError, setLoadError] = useState('');

    const loadCatalog = useCallback(
        () =>
            Promise.all([serviceApi.listBuildings(), serviceApi.list()])
                .then(([buildingResponse, serviceResponse]) => {
                    setBuildings(buildingResponse.data);
                    setServices(serviceResponse.data);
                    const firstBuilding = buildingResponse.data[0];
                    if (!buildingId && firstBuilding) {
                        setSearchParams({ buildingId: firstBuilding._id }, { replace: true });
                    }
                })
                .catch((error) => setLoadError(error.message)),
        [buildingId, setSearchParams],
    );

    const loadPrices = useCallback(
        () =>
            serviceApi
                .listPrices(buildingId)
                .then((response) => setPrices(response.data))
                .catch((error) => setLoadError(error.message)),
        [buildingId],
    );

    useEffect(() => {
        loadCatalog();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (buildingId) loadPrices();
    }, [buildingId, loadPrices]);

    const handleBuildingChange = (event) => {
        setPrices(null);
        setLoadError('');
        setSearchParams({ buildingId: event.target.value });
    };

    const handleRetry = () => {
        setLoadError('');
        if (!services) loadCatalog();
        if (buildingId) {
            setPrices(null);
            loadPrices();
        }
    };

    const pricesOf = useCallback(
        (serviceId) => (prices ?? []).filter((price) => price.serviceId === serviceId),
        [prices],
    );

    const selectedBuilding = useMemo(
        () => buildings.find((b) => b._id === buildingId),
        [buildings, buildingId],
    );

    const priceStats = useMemo(() => {
        if (!services || !prices) return { configured: 0, total: 0, unconfigured: 0 };
        let configured = 0;
        services.forEach((service) => {
            if (getCurrentPrice(pricesOf(service._id))) {
                configured += 1;
            }
        });
        return {
            configured,
            total: services.length,
            unconfigured: services.length - configured,
        };
    }, [services, prices, pricesOf]);

    const columns = [
        {
            key: 'name',
            title: 'Dịch vụ',
            render: (row) => {
                const visual = getServiceVisual(row.name, row.isFixed);
                const Icon = visual.icon;
                return (
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-9 h-9 rounded-xl ${visual.bg} ${visual.text} border ${visual.border} flex items-center justify-center shrink-0 shadow-xs`}
                        >
                            <Icon className="text-xl" />
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 leading-tight">
                                {row.name}
                            </div>
                            <span className="text-xs text-gray-500">{visual.label}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'isFixed',
            title: 'Cách tính',
            render: (row) =>
                row.isFixed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-50 border-indigo-200 text-indigo-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Cố định
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 border-amber-200 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Theo chỉ số
                    </span>
                ),
        },
        {
            key: 'unit',
            title: 'Đơn vị tính',
            render: (row) => (
                <span className="inline-block px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200">
                    {row.unit}
                </span>
            ),
        },
        {
            key: 'currentPrice',
            title: 'Giá đang áp dụng',
            render: (row) => {
                const current = getCurrentPrice(pricesOf(row._id));
                return current ? (
                    <div className="font-semibold text-emerald-700">
                        <MoneyText value={current.unitPrice} />
                        <span className="text-xs font-normal text-gray-500 ms-1">
                            / {row.unit}
                        </span>
                    </div>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                        <BiErrorCircle className="text-sm" /> Chưa đặt giá
                    </span>
                );
            },
        },
        {
            key: 'effectiveFrom',
            title: 'Áp dụng từ',
            render: (row) => {
                const current = getCurrentPrice(pricesOf(row._id));
                return current?.effectiveFrom ? (
                    <span className="text-gray-600 text-xs">
                        {formatDate(current.effectiveFrom)}
                    </span>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                );
            },
        },
        {
            key: 'action',
            title: '',
            align: 'end',
            render: () => <BiChevronRight className="text-secondary fs-5" />,
        },
    ];

    const renderContent = () => {
        if (loadError) {
            return (
                <ErrorState
                    message="Không tải được giá dịch vụ"
                    detail={loadError}
                    onRetry={handleRetry}
                />
            );
        }

        if (!services || (buildingId && !prices)) {
            return (
                <Card className="border-0 shadow-xs">
                    <Card.Body className="p-4">
                        <SkeletonRows rows={4} columns={6} />
                    </Card.Body>
                </Card>
            );
        }

        if (buildings.length === 0) {
            return (
                <Card className="border-0 shadow-xs">
                    <Card.Body className="p-4">
                        <EmptyState message="Chưa có tòa nhà nào. Hãy tạo tòa nhà trước khi đặt giá dịch vụ." />
                    </Card.Body>
                </Card>
            );
        }

        return (
            <div className="space-y-3">
                {/* Thanh trạng thái cấu hình giá của tòa đang chọn */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                            <BiBuildings className="text-xl" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 leading-tight">
                                {selectedBuilding?.name || 'Tòa nhà'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                Đã cấu hình giá {priceStats.configured}/{priceStats.total} dịch vụ
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {priceStats.unconfigured > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                <BiErrorCircle className="text-sm" />
                                <span>{priceStats.unconfigured} dịch vụ chưa đặt giá</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <BiCheckCircle className="text-sm" />
                                <span>Tất cả dịch vụ đã có giá áp dụng</span>
                            </div>
                        )}
                    </div>
                </div>

                {priceStats.unconfigured > 0 && (
                    <div className="text-xs text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                        <BiErrorCircle className="text-base shrink-0 text-amber-600" />
                        <span>
                            <strong>Lưu ý:</strong> Dịch vụ chưa đặt giá ở tòa này sẽ không xuất hiện trên hóa đơn tính tiền của tòa đó.
                        </span>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={services}
                    emptyMessage="Chưa có dịch vụ nào"
                    onRowClick={(row) => setEditing(row)}
                />
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Bảng giá dịch vụ"
                subtitle="Cấu hình đơn giá dịch vụ theo từng tòa nhà để tự động tính tiền trên hóa đơn"
                backTo="/services"
            >
                <div className="flex items-center gap-2">
                    <FilterSelect
                        label="Chọn tòa"
                        icon={BiBuildings}
                        name="buildingId"
                        options={buildings.map((building) => ({
                            value: building._id,
                            label: building.name,
                        }))}
                        value={buildingId}
                        onChange={handleBuildingChange}
                        className="w-72 max-w-full"
                    />
                </div>
            </PageHeader>

            {renderContent()}

            {editing && (
                <ServicePriceModal
                    service={editing}
                    buildingId={buildingId}
                    buildingName={selectedBuilding?.name}
                    prices={pricesOf(editing._id)}
                    onHide={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        loadPrices();
                    }}
                />
            )}
        </div>
    );
};

export default ServicePricePage;
