// UC-22: thiết lập giá dịch vụ theo tòa (Admin). Chọn tòa → bảng dịch vụ kèm giá đang áp dụng → bấm dòng để xem lịch sử, nhập giá mới
// Tòa đang chọn nằm trên URL (?buildingId=) để trang chi tiết tòa có thể mở thẳng trang này
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import MoneyText from '../../components/MoneyText';
import Select from '../../components/Select';
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

    // tải danh sách tòa + dịch vụ một lần; chưa chọn tòa thì chọn sẵn tòa đầu tiên
    useEffect(() => {
        Promise.all([serviceApi.listBuildings(), serviceApi.list()])
            .then(([buildingResponse, serviceResponse]) => {
                setBuildings(buildingResponse.data);
                setServices(serviceResponse.data);
                const firstBuilding = buildingResponse.data[0];
                if (!searchParams.get('buildingId') && firstBuilding) {
                    setSearchParams({ buildingId: firstBuilding._id }, { replace: true });
                }
            })
            .catch((error) => toast.error(error.message));
        // chỉ chạy lúc mở trang
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
    const loadPrices = useCallback(
        () =>
            serviceApi
                .listPrices(buildingId)
                .then((response) => setPrices(response.data))
                .catch((error) => toast.error(error.message)),
        [buildingId],
    );

    useEffect(() => {
        if (buildingId) loadPrices();
    }, [buildingId, loadPrices]);

    const handleBuildingChange = (event) => {
        setPrices(null);
        setSearchParams({ buildingId: event.target.value });
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

    return (
        <>
            <PageHeader
                title="Giá dịch vụ"
                subtitle="Dịch vụ chưa đặt giá ở tòa nào thì không có trên hóa đơn của tòa đó"
                backTo="/services"
            >
                <Select
                    name="buildingId"
                    aria-label="Tòa nhà"
                    options={buildings.map((building) => ({
                        value: building._id,
                        label: building.name,
                    }))}
                    placeholder={buildings.length ? null : 'Chưa có tòa nhà'}
                    value={buildingId}
                    onChange={handleBuildingChange}
                    className="mb-0"
                />
            </PageHeader>

            <DataTable
                columns={columns}
                data={services ?? []}
                loading={!services || (Boolean(buildingId) && !prices)}
                emptyMessage="Chưa có dịch vụ nào"
                onRowClick={buildingId ? (row) => setEditing(row) : undefined}
            />

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
