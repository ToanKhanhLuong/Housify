// Tab "Giá dịch vụ" trong chi tiết tòa (chốt 30/10, UC-22 xem) theo mockup docs/mock/BuildingDetail.dc.html
// Mỗi dịch vụ đã đặt giá ở tòa là một thẻ: tên, cách tính, giá đang áp dụng / đơn vị, ngày áp dụng
// Giá đang áp dụng = mức có ngày áp dụng gần nhất mà ≤ hôm nay (api.md). Đặt giá làm ở trang Dịch vụ của Hiếu
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import MoneyText from '../../../components/MoneyText';
import SkeletonRows from '../../../components/SkeletonRows';
import { formatDate } from '../../../utils/format';
import buildingApi from '../building.api';

// từ lịch sử giá (mới nhất trước) lấy mức đang áp dụng của từng dịch vụ
const currentPrices = (services, prices) => {
  const now = new Date();
  return services
    .map((service) => {
      const current = prices
        .filter((price) => price.serviceId === service._id && new Date(price.effectiveFrom) <= now)
        .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];
      return current ? { service, price: current } : null;
    })
    .filter(Boolean);
};

const BuildingServicePricesTab = ({ building, canEdit }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadPrices = useCallback(
    () =>
      Promise.all([buildingApi.services(), buildingApi.servicePrices(building._id)])
        .then(([servicesResponse, pricesResponse]) => {
          const services = Array.isArray(servicesResponse.data) ? servicesResponse.data : [];
          const prices = Array.isArray(pricesResponse.data) ? pricesResponse.data : [];
          setItems(currentPrices(services, prices));
          setLoadError('');
        })
        .catch((error) => setLoadError(error.message))
        .finally(() => setLoading(false)),
    [building._id],
  );

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  const handleRetry = () => {
    setLoading(true);
    loadPrices();
  };

  // nút sang trang Dịch vụ, mở sẵn đúng tòa này (?buildingId=)
  const setPriceButton = canEdit && (
    <Button
      as={Link}
      to={`/services/prices?buildingId=${building._id}`}
      variant="secondary"
      className="no-underline"
    >
      Đặt giá dịch vụ
    </Button>
  );

  if (loading) return <SkeletonRows rows={2} columns={4} />;
  if (loadError) {
    return (
      <ErrorState message="Không tải được giá dịch vụ" detail={loadError} onRetry={handleRetry} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="small text-secondary">
          Các dịch vụ đã được đặt giá ở tòa này. Giá hiện hành là giá có ngày áp dụng gần nhất.
        </span>
        {setPriceButton}
      </div>

      {items.length === 0 ? (
        <EmptyState message="Tòa nhà chưa đặt giá dịch vụ nào." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {items.map(({ service, price }) => (
            <Card key={service._id}>
              <Card.Body className="p-3 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="fw-semibold">{service.name}</span>
                  <span
                    className={`badge rounded-pill ${
                      service.isFixed
                        ? 'bg-primary-subtle text-primary-emphasis'
                        : 'bg-info-subtle text-info-emphasis'
                    }`}
                  >
                    {service.isFixed ? 'Cố định' : 'Theo chỉ số'}
                  </span>
                </div>
                <div className="fs-5 fw-bold">
                  <MoneyText value={price.unitPrice} />{' '}
                  <span className="small fw-medium text-secondary">/ {service.unit}</span>
                </div>
                <div className="small text-secondary">
                  Áp dụng từ {formatDate(price.effectiveFrom)}
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuildingServicePricesTab;
