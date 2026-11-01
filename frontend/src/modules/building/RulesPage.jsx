// UC-23 (Customer): xem nội quy tòa mình đang ở theo mockup docs/mock/Rules.dc.html, chỉ đọc
// Tòa lấy từ /auth/me (user.building, có khi Customer có hợp đồng ACTIVE); nội quy lấy từ GET /buildings/:id/rules
// Chưa có phòng đang thuê (user.building = null) thì báo, không gọi API
import { useCallback, useEffect, useState } from 'react';
import { Card, Image } from 'react-bootstrap';
import { BiMap, BiPhone, BiUser } from 'react-icons/bi';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import buildingApi from './building.api';

const RulesContent = ({ building }) => {
  const [rules, setRules] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // dùng .then thay vì await: setState nằm trong callback (luật react-hooks/set-state-in-effect)
  const loadRules = useCallback(
    () =>
      buildingApi
        .rules(building._id)
        .then((response) => {
          setRules(response.data?.rules ?? '');
          setLoadError('');
        })
        .catch((error) => setLoadError(error.message))
        .finally(() => setLoading(false)),
    [building._id],
  );

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleRetry = () => {
    setLoading(true);
    loadRules();
  };

  const cover = building.images?.[0];
  const manager = building.manager;

  return (
    <Card className="hf-paper">
      {/* định danh tòa: ảnh đại diện, tên, địa chỉ */}
      <div className="flex flex-wrap items-start gap-4">
        {cover ? (
          <div className="w-56 h-36 shrink-0 overflow-hidden rounded border">
            <Image src={cover} alt={building.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="hf-ph w-56 h-36 shrink-0">Chưa có ảnh</div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="small text-secondary">Nội quy tòa nhà</span>
          <h1 className="h3 fw-bold mb-0">{building.name}</h1>
          <span className="flex items-center gap-2 text-secondary">
            <BiMap className="shrink-0" />
            {building.address}
          </span>
        </div>
      </div>

      {/* nội dung nội quy: giữ xuống dòng như bản Admin soạn */}
      {loading ? (
        <SkeletonRows rows={4} columns={1} />
      ) : loadError ? (
        <ErrorState message="Không tải được nội quy" detail={loadError} onRetry={handleRetry} />
      ) : rules ? (
        <div className="whitespace-pre-line leading-relaxed rounded border bg-body-tertiary px-4 py-3">
          {rules}
        </div>
      ) : (
        <div className="text-secondary">Tòa nhà chưa có nội quy.</div>
      )}

      {/* liên hệ Manager của tòa khi có thắc mắc */}
      <div className="small text-secondary flex flex-wrap items-center gap-x-3 gap-y-1">
        {manager ? (
          <>
            <span>Thắc mắc về nội quy, vui lòng liên hệ Manager của tòa:</span>
            <span className="inline-flex items-center gap-1 text-body-emphasis fw-medium">
              <BiUser />
              {manager.name}
            </span>
            {manager.phone && (
              <a href={`tel:${manager.phone}`} className="inline-flex items-center gap-1">
                <BiPhone />
                {manager.phone}
              </a>
            )}
          </>
        ) : (
          <span>Tòa hiện chưa có Manager phụ trách.</span>
        )}
      </div>
    </Card>
  );
};

const RulesPage = () => {
  const { user } = useAuth();

  if (!user.building?._id) {
    return (
      <EmptyState message="Bạn chưa có phòng đang thuê nên chưa xem được nội quy. Nội quy hiện ra khi hợp đồng của bạn có hiệu lực." />
    );
  }

  // key: đổi tòa (hợp đồng mới ở tòa khác) thì tải lại từ đầu
  return <RulesContent key={user.building._id} building={user.building} />;
};

export default RulesPage;
