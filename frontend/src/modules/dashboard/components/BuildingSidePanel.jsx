// Cột phải trang /dashboard theo mẫu Home Desk & Nova Residence (UC-07, 47): Ảnh lớn tòa nhà, 4 chỉ số ngang + thanh lấp đầy, Donut phòng và danh bạ Tòa/Manager
import { Card, ProgressBar } from 'react-bootstrap';
import { BiBuildings, BiMap, BiPhone, BiUser } from 'react-icons/bi';
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

  // Lấy thông tin tòa đang chọn từ data.buildingOverview (BE trả về) hoặc từ danh sách buildings
  const activeBuilding =
    data?.buildingOverview ??
    buildings.find((item) => item._id === buildingId) ??
    buildings[0] ??
    null;

  const coverImage = activeBuilding?.images?.[0] ?? '';
  const displayTitle = buildingId
    ? activeBuilding?.name
    : isAdmin
      ? data?.buildingOverview?.name || 'Hệ thống nhà trọ Housify'
      : activeBuilding?.name || 'Tòa nhà phụ trách';

  const displayAddress = buildingId
    ? activeBuilding?.address
    : isAdmin
      ? data?.buildingOverview?.address || `${buildings.length || data?.buildings || 0} cơ sở đang vận hành`
      : activeBuilding?.address || 'Cơ sở đang quản lý trực tiếp';

  const activeManager = data?.buildingOverview?.manager ?? activeBuilding?.manager ?? null;

  return (
    <Card className="h-full">
      {/* Ảnh đại diện lớn của tòa nhà giống cột phải Green courtyard (Ảnh 2) & Nova Residence (Ảnh 1) */}
      {coverImage ? (
        <div className="relative h-48 overflow-hidden rounded-top">
          <img
            src={coverImage}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="hf-cover h-44 rounded-top flex-col gap-1 px-4 text-center">
          <BiBuildings size={36} />
          <span className="fw-bold">{displayTitle}</span>
          <span className="small">{displayAddress}</span>
        </div>
      )}

      <Card.Body className="p-4 flex flex-col gap-4">
        {/* Tên tòa nhà + 4 con số nằm ngang + Thanh ngang Leased by % giống hệt Green courtyard (Ảnh 2) */}
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="h5 fw-bold mb-0.5">{displayTitle}</h3>
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

          <div className="flex flex-col gap-1.5">
            <ProgressBar now={occupancyRate} variant="primary" className="h-2" />
            <div className="flex items-center justify-between small text-secondary">
              <span>Đã lấp đầy {occupancyRate}%</span>
              <span>
                {activeBuilding?.floorCount
                  ? `${activeBuilding.floorCount} tầng`
                  : `${rooms.occupied}/${rooms.total} phòng`}
              </span>
            </div>
          </div>
        </div>

        {/* Khối Vòng tròn Donut + Lưới 2x2 giống Work Orders (Ảnh 2) */}
        <div className="border-top pt-3 flex flex-col gap-2">
          <div className="fw-semibold text-body">Cơ cấu phòng & Sự cố</div>
          <RoomStatusChart rooms={rooms} openIncidents={data?.openIncidents ?? 0} />
        </div>

        {/* Khối On-site staff / Danh bạ Tòa nhà & Manager giống Ảnh 1 & Ảnh 2 */}
        <div className="border-top pt-3 flex flex-col gap-2.5">
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
                Xem tất cả
              </span>
            )}
          </div>

          {activeManager && (
            <div className="p-2.5 rounded bg-body-tertiary flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
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
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-0.5">
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
                    className={`hf-tcard flex-row items-center justify-between gap-2 p-2.5 ${
                      isSelected ? 'border-primary bg-body-tertiary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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

