// UC-22: thiết lập giá dịch vụ theo tòa (Admin). Chọn tòa → bảng dịch vụ kèm giá đang áp dụng → bấm dòng để xem lịch sử, nhập giá mới
// Tòa đang chọn nằm trên URL (?buildingId=) để trang chi tiết tòa có thể mở thẳng trang này
import { useCallback, useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { BiBuildings } from 'react-icons/bi';
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

const ServicePricePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const buildingId = searchParams.get('buildingId') ?? '';
    const [buildings, setBuildings] = useState([]);
    const [services, setServices] = useState(null); // null: đang tải
    const [prices, setPrices] = useState(null); // lịch sử giá của tòa đang chọn; null: đang tải
    const [editing, setEditing] = useState(null); // dịch vụ đang mở form giá
    const [loadError, setLoadError] = useState('');

    // tải danh sách tòa + dịch vụ; chưa chọn tòa thì chọn sẵn tòa đầu tiên
    // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
    // 2 hàm tải chạy song song nên tải xong KHÔNG xóa loadError, kẻo xóa mất lỗi của hàm kia; chỉ Thử lại, đổi tòa mới xóa
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

    // danh sách tòa + dịch vụ chỉ tải một lần lúc mở trang, đổi tòa không tải lại
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

    const pricesOf = (serviceId) => (prices ?? []).filter((price) => price.serviceId === serviceId);
    const buildingName = buildings.find((building) => building._id === buildingId)?.name;

    const columns = [
        { key: 'name', title: 'Dịch vụ', className: 'fw-semibold' },
        { key: 'unit', title: 'Đơn vị tính' },
        {
            key: 'isFixed',
            title: 'Cách tính',
            render: (row) => (row.isFixed ? 'Cố định' : 'Theo chỉ số'),
        },
        {
            key: 'currentPrice',
            title: 'Giá đang áp dụng',
            align: 'end',
            render: (row) => {
                const current = getCurrentPrice(pricesOf(row._id));
                return current ? (
                    <MoneyText value={current.unitPrice} />
                ) : (
                    <span className="text-secondary">Chưa đặt giá</span>
                );
            },
        },
        {
            key: 'effectiveFrom',
            title: 'Áp dụng từ',
            render: (row) => formatDate(getCurrentPrice(pricesOf(row._id))?.effectiveFrom),
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
                <Card>
                    <Card.Body>
                        <SkeletonRows rows={4} columns={5} />
                    </Card.Body>
                </Card>
            );
        }
        if (buildings.length === 0) {
            return (
                <Card>
                    <Card.Body>
                        <EmptyState message="Chưa có tòa nhà nào. Tạo tòa nhà trước khi đặt giá dịch vụ." />
                    </Card.Body>
                </Card>
            );
        }
        return (
            <DataTable
                columns={columns}
                data={services}
                emptyMessage="Chưa có dịch vụ nào"
                onRowClick={(row) => setEditing(row)}
            />
        );
    };

    return (
        <>
            <PageHeader
                title="Giá dịch vụ"
                subtitle="Dịch vụ chưa đặt giá ở tòa nào thì không có trên hóa đơn của tòa đó"
                backTo="/services"
            >
                <FilterSelect
                    label="Tòa nhà"
                    icon={BiBuildings}
                    name="buildingId"
                    options={buildings.map((building) => ({
                        value: building._id,
                        label: building.name,
                    }))}
                    value={buildingId}
                    onChange={handleBuildingChange}
                    className="w-80 max-w-full"
                />
            </PageHeader>

            {renderContent()}

            {editing && (
                <ServicePriceModal
                    service={editing}
                    buildingId={buildingId}
                    buildingName={buildingName}
                    prices={pricesOf(editing._id)}
                    onHide={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        loadPrices();
                    }}
                />
            )}
        </>
    );
};

export default ServicePricePage;
