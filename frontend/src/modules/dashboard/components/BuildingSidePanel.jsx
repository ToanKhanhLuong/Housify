// Cột phải trang /dashboard (UC-07, 47): khi xem Toàn hệ thống hiện tổng quan chung; khi chọn 1 tòa (hoặc Manager) mới hiện ảnh và hồ sơ tòa đó
import { Card, ProgressBar } from 'react-bootstrap';
import { BiMap, BiPhone, BiUser } from 'react-icons/bi';
import RoomStatusChart from './RoomStatusChart';

const shortName = (name = '') => name.replace(/^Tòa\s+/i, '').trim() || name;

const BuildingSidePanel = ({
  isAdmin,
  data,
  buildings = [],
  buildingId = '',
  onSelectBuilding,
}) => {
  const rooms = data?.rooms ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const occupancyRate = rooms.total > 0 ? Math.round((rooms.occupied / rooms.total) * 100) : 0;

  // Chỉ lấy thông tin tòa cụ thể khi Admin đã chọn 1 tòa hoặc khi đăng nhập bằng tài khoản Manager
  const activeBuilding = isAdmin
    ? buildingId
      ? (data?.buildingOverview ?? buildings.find((item) => item._id === buildingId) ?? null)
      : null
    : (data?.buildingOverview ?? null);

  const coverImage = activeBuilding?.images?.[0] ?? '';
  const totalBuildings = buildings.length || data?.buildings || 0;
  const displayTitle = activeBuilding
    ? activeBuilding.name
    : 'Quy mô vận hành chung';

  const displayAddress = activeBuilding
    ? activeBuilding.address
    : `${totalBuildings} cơ sở hoạt động · ${rooms.total} phòng cho thuê`;

  const activeManager = activeBuilding?.manager ?? null;

  return (
    <Card className="h-full">
      {/* Chỉ hiện ảnh tòa nhà khi đang xem 1 tòa cụ thể; xem chung thì hiện logo Housify */}
      {activeBuilding ? (
        coverImage ? (
          <div className="relative h-48 overflow-hidden rounded-top">
            <img
              src={coverImage}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="hf-cover h-40 rounded-top flex-col gap-1 px-4 text-center">
            <img src="/logo.png" alt="Housify" className="w-14 h-14 object-contain" />
            <span className="fw-bold">{displayTitle}</span>
            <span className="small">{displayAddress}</span>
          </div>
        )
      ) : (
        <div className="hf-cover h-40 rounded-top flex-col gap-1 px-4 text-center">
          <img src="/logo.png" alt="Housify" className="w-16 h-16 object-contain" />
          <span className="fw-bold">Chuỗi nhà trọ Housify</span>
          <span className="small">Chọn một cơ sở bên dưới để xem ảnh & hồ sơ chi tiết</span>
        </div>
      )}

      <Card.Body className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="h5 fw-bold mb-1">{displayTitle}</h3>
            <div className="small text-secondary flex items-center gap-1">
              <BiMap className="shrink-0" />
              <span className="text-truncate">{displayAddress}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <div>
              <div className="fs-5 fw-bold tabular-nums leading-tight">
                {isAdmin ? (data?.residents ?? 0) : (rooms.occupied ?? 0)}
              </div>
              <div className="small text-secondary">{isAdmin ? 'Cư dân' : 'Đang thuê'}</div>
            </div>
            <div>
              <div className="fs-5 fw-bold tabular-nums leading-tight">{rooms.total}</div>
              <div className="small text-secondary">Tổng phòng</div>
            </div>
            <div>
              <div className="fs-5 fw-bold tabular-nums leading-tight">{rooms.available}</div>
              <div className="small text-secondary">Phòng trống</div>
            </div>
            <div>
              <div className="fs-5 fw-bold tabular-nums leading-tight">
                {isAdmin ? (data?.activeContracts ?? 0) : (data?.expiringContracts ?? 0)}
              </div>
              <div className="small text-secondary">{isAdmin ? 'Hợp đồng' : 'Sắp hết hạn'}</div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <ProgressBar now={occupancyRate} variant="primary" className="h-2" />
            <div className="flex items-center justify-between small text-secondary">
              <span>Đã lấp đầy {occupancyRate}%</span>
              <span>
                {activeBuilding?.floorCount
                  ? `${activeBuilding.floorCount} tầng · ${rooms.occupied}/${rooms.total} phòng`
                  : `${rooms.occupied}/${rooms.total} phòng`}
              </span>
            </div>
          </div>
        </div>

        <div className="border-top pt-3 flex flex-col gap-2">
          <div className="fw-semibold text-body">Cơ cấu phòng & Sự cố</div>
          <RoomStatusChart rooms={rooms} openIncidents={data?.openIncidents ?? 0} />
        </div>

        <div className="border-top pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="fw-semibold text-body">
              {isAdmin ? 'Danh bạ Tòa nhà & Manager' : 'Thông tin quản lý tòa'}
            </span>
            {isAdmin && buildingId && (
              <span
                role="button"
                tabIndex={0}
                onClick={() => onSelectBuilding?.('')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectBuilding?.('');
                  }
                }}
                className="small text-primary cursor-pointer fw-medium"
              >
                Xem tất cả cơ sở
              </span>
            )}
          </div>

          {activeBuilding && activeManager && (
            <div className="p-2 rounded bg-body-tertiary flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="hf-av w-9 h-9 shrink-0">
                  <BiUser size={18} />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="fw-semibold text-body text-truncate">
                    {activeManager.name || activeManager.fullName}
                  </span>
                  <span className="small text-secondary text-truncate">
                    {activeManager.email || 'Quản lý tòa nhà'}
                  </span>
                </div>
              </div>
              {activeManager.phone && (
                <span className="small text-secondary flex items-center gap-1 shrink-0 tabular-nums">
                  <BiPhone />
                  {activeManager.phone}
                </span>
              )}
            </div>
          )}

          {isAdmin && buildings.length > 0 && (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {buildings.map((building) => {
                const isSelected = buildingId === building._id;
                const bRooms = building.roomStats ?? { total: building.totalRooms ?? 0, occupied: 0 };
                const managerName =
                  building.manager?.name || building.manager?.fullName || 'Chưa phân công';

                return (
                  <div
                    key={building._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectBuilding?.(isSelected ? '' : building._id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectBuilding?.(isSelected ? '' : building._id);
                      }
                    }}
                    className={`hf-tcard flex-row items-center justify-between gap-2 p-2 ${
                      isSelected ? 'border-primary bg-body-tertiary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {building.images?.[0] ? (
                        <img
                          src={building.images[0]}
                          alt={building.name}
                          className="w-9 h-9 rounded object-cover shrink-0"
                        />
                      ) : (
                        <span className="hf-av w-9 h-9 shrink-0 small">
                          {shortName(building.name).slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="fw-semibold text-body text-truncate">{building.name}</span>
                        <span className="small text-secondary text-truncate">QL: {managerName}</span>
                      </div>
                    </div>

                    <span className="hf-badge hf-b-plum shrink-0 tabular-nums">
                      {bRooms.occupied ?? 0}/{bRooms.total ?? 0} phòng
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default BuildingSidePanel;
